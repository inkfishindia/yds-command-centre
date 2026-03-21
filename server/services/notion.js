const config = require('../config');

let notionClient = null;
function getClient() {
  if (!notionClient) {
    const { Client } = require('@notionhq/client');
    notionClient = new Client({ auth: config.NOTION_TOKEN });
  }
  return notionClient;
}

// Stale-while-revalidate cache
// Fresh window  (0 – CACHE_TTL):       return immediately, no background fetch
// Stale window  (CACHE_TTL – CACHE_HARD_EXPIRY): return stale data immediately + trigger background refresh
// Expired       (> CACHE_HARD_EXPIRY): treat as cold start — blocking fetch
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;          // 5 min — stale threshold
const CACHE_HARD_EXPIRY = 15 * 60 * 1000; // 15 min — absolute expiry
const DASHBOARD_CACHE_KEY = 'dashboard_summary_v1';
const DASHBOARD_CACHE_TTL = 60 * 1000;

/**
 * Returns the raw cache entry so callers can inspect age themselves.
 * Returns null if no entry exists at all.
 */
function getCacheEntry(key) {
  return cache.get(key) || null;
}

/**
 * Returns cached data if it is still within the fresh window (< CACHE_TTL).
 * Returns null if absent, stale, or hard-expired.
 * Side-effect: deletes hard-expired entries.
 */
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  const age = Date.now() - entry.time;
  if (age < CACHE_TTL) return entry.data;
  if (age >= CACHE_HARD_EXPIRY) cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
}

function setCachedWithTime(key, data, time = Date.now()) {
  cache.set(key, { data, time });
}

// In-flight request deduplication — prevents duplicate Notion API calls for the same cache key
const inFlight = new Map();

// Rate-limited write queue — spaces out write operations to avoid Notion 429s
const writeQueue = [];
let writeProcessing = false;
const WRITE_SPACING_MS = 350;

async function enqueueWrite(writeFn) {
  return new Promise((resolve, reject) => {
    writeQueue.push({ fn: writeFn, resolve, reject });
    processWriteQueue();
  });
}

async function processWriteQueue() {
  if (writeProcessing || writeQueue.length === 0) return;
  writeProcessing = true;
  while (writeQueue.length > 0) {
    const { fn, resolve, reject } = writeQueue.shift();
    try {
      const result = await fn();
      resolve(result);
    } catch (err) {
      reject(err);
    }
    if (writeQueue.length > 0) {
      await new Promise(r => setTimeout(r, WRITE_SPACING_MS));
    }
  }
  writeProcessing = false;
}

/**
 * Stale-while-revalidate fetch with in-flight deduplication.
 *
 * - Fresh hit  (age < CACHE_TTL):           returns cached data, no network call
 * - Stale hit  (CACHE_TTL <= age < HARD):   returns stale data immediately;
 *                                            fires a background refresh if none in-flight
 * - Cold start (no entry or age >= HARD):   blocking fetch, result is cached
 */
function deduplicatedFetch(cacheKey, fetchFn) {
  const entry = getCacheEntry(cacheKey);

  if (entry) {
    const age = Date.now() - entry.time;

    // Fresh — return immediately
    if (age < CACHE_TTL) return Promise.resolve(entry.data);

    // Stale but within hard expiry — return stale, kick off background refresh
    if (age < CACHE_HARD_EXPIRY) {
      if (!inFlight.has(cacheKey)) {
        const fetchStartedAt = Date.now();
        const bg = fetchFn()
          .then(result => {
            // Only overwrite cache if no fresher write has landed since we started
            const current = cache.get(cacheKey);
            if (!current || current.time <= fetchStartedAt) {
              setCache(cacheKey, result);
            }
            return result;
          })
          .catch(err => {
            console.warn(`[notion-cache] Background refresh failed for "${cacheKey}":`, err.message || err);
          })
          .finally(() => {
            inFlight.delete(cacheKey);
          });
        inFlight.set(cacheKey, bg);
      }
      return Promise.resolve(entry.data);
    }

    // Hard-expired — fall through to blocking fetch (entry deleted in getCached)
    cache.delete(cacheKey);
  }

  // Cold start or hard-expired — join existing in-flight or start a new blocking fetch
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const promise = fetchFn()
    .then(result => {
      setCache(cacheKey, result);
      return result;
    })
    .finally(() => {
      inFlight.delete(cacheKey);
    });

  inFlight.set(cacheKey, promise);
  return promise;
}

// Retry wrapper for transient Notion API errors (429 rate limits, 5xx server errors)
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function withRetry(fn, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err.status === 429 || err.code === 'rate_limited';
      const isServerError = err.status >= 500;

      if ((isRateLimit || isServerError) && attempt < retries) {
        const retryAfter = err.headers?.['retry-after'];
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`Notion API ${err.status || 'error'}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Stable JSON stringification -- sorts object keys recursively so that
 * {a:1, b:2} and {b:2, a:1} produce identical strings, giving consistent cache keys.
 */
function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

// Database IDs from notion-hub.md
const DB = {
  FOCUS_AREAS: '274fc2b3b6f7430fbb27474320eb0f96',
  PROJECTS: '85c1b29205634f43b50dc16fc7466faa',
  COMMITMENTS: '0b50073e544942aab1099fc559b390fb',
  PEOPLE: 'de346469925e4d1a825a849bc9f5269f',
  DECISIONS: '3c8a9b22ba924f20bfdcab4cc7a46478',
  PLATFORMS: '1fcf264fd2cd4308bcfd28997d171360',
  AUDIENCES: '63ec25cae3b0432093fa639d4c8b5809',
  // Marketing Ops databases
  CAMPAIGNS: '9f5f3da620e64bf0bceef7f9a3465925',
  CONTENT_CALENDAR: '227f3365feab476e88791f2a4d0a72b9',
  SEQUENCES: 'e580d12cac8c43bd890176fc0985518e',
  SESSIONS_LOG: 'dffaf6eb216444858981203915991c22',
  // Tech Team databases
  TECH_SPRINT_BOARD: '2c459dc96d804bce913547e02b78776c',
  TECH_SPEC_LIBRARY: '5be6d7cf5607407cbca010b422bceb7e',
  TECH_DECISION_LOG: '1f9193d41ac3409484d2d0ae1442c95b',
  TECH_SPRINT_ARCHIVE: '9ba8330aa3c044d195b27eb450e278f2',
};

/**
 * Simplify Notion properties to plain values.
 * Handles all common property types including people, url, and rich date objects.
 * This is the single canonical implementation used across the entire server.
 */
function simplify(properties) {
  const result = {};
  for (const [key, prop] of Object.entries(properties)) {
    switch (prop.type) {
      case 'title':
        result[key] = prop.title.map(t => t.plain_text).join('');
        break;
      case 'rich_text':
        result[key] = prop.rich_text.map(t => t.plain_text).join('');
        break;
      case 'select':
        result[key] = prop.select ? prop.select.name : null;
        break;
      case 'multi_select':
        result[key] = prop.multi_select.map(s => s.name);
        break;
      case 'date':
        result[key] = prop.date ? { start: prop.date.start, end: prop.date.end } : null;
        break;
      case 'relation':
        result[key] = prop.relation.map(r => r.id);
        break;
      case 'people':
        result[key] = prop.people.map(p => p.name || p.id);
        break;
      case 'status':
        result[key] = prop.status ? prop.status.name : null;
        break;
      case 'number':
        result[key] = prop.number;
        break;
      case 'checkbox':
        result[key] = prop.checkbox;
        break;
      case 'url':
        result[key] = prop.url;
        break;
      default:
        result[key] = '[' + prop.type + ']';
    }
  }
  return result;
}

/**
 * Fetch all focus areas with health status
 */
async function getFocusAreas() {
  return deduplicatedFetch('focus_areas', async () => {
    const notion = getClient();
    const response = await withRetry(() => notion.databases.query({
      database_id: DB.FOCUS_AREAS,
      page_size: 20,
    }));
    return response.results.map(page => ({
      id: page.id,
      ...simplify(page.properties),
    }));
  }).catch(err => {
    console.error('Failed to fetch focus areas:', err.message);
    return [];
  });
}

/**
 * Fetch commitments with optional filters
 */
async function getCommitments(filter) {
  const cacheKey = 'commitments_' + stableStringify(filter || {});
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const params = {
      database_id: DB.COMMITMENTS,
      page_size: 50,
    };
    if (filter) params.filter = filter;
    const response = await withRetry(() => notion.databases.query(params));
    return response.results.map(page => ({
      id: page.id,
      ...simplify(page.properties),
    }));
  }).catch(err => {
    console.error('Failed to fetch commitments:', err.message);
    return [];
  });
}

/**
 * Fetch overdue commitments
 */
async function getOverdueCommitments() {
  const today = new Date().toISOString().split('T')[0];
  return getCommitments({
    and: [
      { property: 'Due Date', date: { before: today } },
      { property: 'Status', select: { does_not_equal: 'Done' } },
      { property: 'Status', select: { does_not_equal: 'Cancelled' } },
    ],
  });
}

/**
 * Fetch upcoming commitments (due within N days, not overdue, not done/cancelled)
 */
async function getUpcomingCommitments(days = 7) {
  const today = new Date().toISOString().split('T')[0];
  const future = new Date();
  future.setDate(future.getDate() + days);
  const futureDate = future.toISOString().split('T')[0];
  return getCommitments({
    and: [
      { property: 'Due Date', date: { on_or_after: today } },
      { property: 'Due Date', date: { on_or_before: futureDate } },
      { property: 'Status', select: { does_not_equal: 'Done' } },
      { property: 'Status', select: { does_not_equal: 'Cancelled' } },
    ],
  });
}

/**
 * Fetch recent decisions (last N days)
 */
async function getRecentDecisions(days = 30) {
  return deduplicatedFetch('decisions_' + days, async () => {
    const notion = getClient();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const decisions = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.DECISIONS,
        filter: {
          property: 'Date',
          date: { on_or_after: since.toISOString().split('T')[0] },
        },
        sorts: [{ property: 'Date', direction: 'descending' }],
        page_size: 100,
        start_cursor: cursor,
      }));
      decisions.push(...response.results.map(page => ({
        id: page.id,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);
    return decisions;
  }).catch(err => {
    console.error('Failed to fetch decisions:', err.message);
    return [];
  });
}

// Known AI Expert Panel page IDs — excluded from people/team queries
const AI_EXPERT_IDS = new Set([
  '308247aa0d7b8185b2c1d2b738aee402', // Colin (Chief of Staff)
  '308247aa0d7b81c1948cf999fd8e3dcf', // Rory (Behavioral)
  '308247aa0d7b81b1a1fdfd6569d9b202', // JW / Jessica (Creative)
  '308247aa0d7b810f8322f160169f2344', // Copy Lead / Harry
  '308247aa0d7b811fa554f1a77b7e20bc', // Tech Advisor
]);

/**
 * Fetch people (real humans only — filters out AI expert panel by page ID).
 */
async function getPeople() {
  return deduplicatedFetch('people', async () => {
    const notion = getClient();
    const response = await withRetry(() => notion.databases.query({
      database_id: DB.PEOPLE,
      page_size: 30,
    }));
    return response.results
      .filter(page => !AI_EXPERT_IDS.has(page.id.replace(/-/g, '')))
      .map(page => ({
        id: page.id,
        ...simplify(page.properties),
      }));
  }).catch(err => {
    console.error('Failed to fetch people:', err.message);
    return [];
  });
}

/**
 * Fetch all projects with Focus Area relations.
 * Excludes records where Status is null/empty and records with "TEMPLATE" in the Name.
 */
async function getProjects() {
  return deduplicatedFetch('projects', async () => {
    const notion = getClient();
    const projects = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.PROJECTS,
        page_size: 100,
        start_cursor: cursor,
        filter: {
          and: [
            // Exclude entries with no status
            { property: 'Status', select: { is_not_empty: true } },
            // Exclude template records
            { property: 'Name', title: { does_not_contain: 'TEMPLATE' } },
            { property: 'Name', title: { does_not_contain: 'template' } },
          ],
        },
      }));
      projects.push(...response.results.map(page => ({
        id: page.id,
        last_edited_time: page.last_edited_time,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);
    return projects;
  }).catch(err => {
    console.error('Failed to fetch projects:', err.message);
    return [];
  });
}

/**
 * Fetch all commitments (for counts per focus area).
 * Excludes Cancelled by default. Marks null Priority/Type as "Unset".
 * @param {boolean} includeCancelled - Pass true to include Cancelled status.
 */
async function getAllCommitments(includeCancelled = false) {
  const cacheKey = includeCancelled ? 'all_commitments_with_cancelled' : 'all_commitments';
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const commitments = [];
    let cursor;
    const params = {
      database_id: DB.COMMITMENTS,
      page_size: 100,
    };
    // Exclude Cancelled unless explicitly requested
    if (!includeCancelled) {
      params.filter = { property: 'Status', select: { does_not_equal: 'Cancelled' } };
    }
    do {
      const response = await withRetry(() => notion.databases.query({
        ...params,
        start_cursor: cursor,
      }));
      commitments.push(...response.results.map(page => {
        const simplified = simplify(page.properties);
        // Mark null Priority and Type as "Unset"
        if (!simplified.Priority) simplified.Priority = 'Unset';
        if (!simplified.Type) simplified.Type = 'Unset';
        return { id: page.id, last_edited_time: page.last_edited_time, ...simplified };
      }));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);
    return commitments;
  }).catch(err => {
    console.error('Failed to fetch all commitments:', err.message);
    return [];
  });
}

/**
 * Fetch commitments completed (Status = Done) in the last N days.
 * Uses last_edited_time as the recency signal.
 */
async function getRecentlyCompletedCommitments(days = 30) {
  const cacheKey = 'recently_completed_' + days;
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    const results = [];
    let cursor;
    const params = {
      database_id: DB.COMMITMENTS,
      page_size: 100,
      filter: {
        and: [
          { property: 'Status', select: { equals: 'Done' } },
          { timestamp: 'last_edited_time', last_edited_time: { on_or_after: sinceStr } },
        ],
      },
    };
    do {
      const response = await withRetry(() => notion.databases.query({
        ...params,
        start_cursor: cursor,
      }));
      results.push(...response.results.map(page => ({
        id: page.id,
        last_edited_time: page.last_edited_time,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);
    return results;
  }).catch(err => {
    console.error('Failed to fetch recently completed commitments:', err.message);
    return [];
  });
}

/**
 * Fetch all commitments with resolved relations (for kanban view).
 * Excludes Cancelled. Returns the full unfiltered list — filtering is done client-side.
 * Marks null Priority/Type as "Unset".
 */
async function getCommitmentsForKanban() {
  return deduplicatedFetch('kanban_commitments_all', async () => {
    const notion = getClient();
    const commitments = [];
    let cursor;
    const params = {
      database_id: DB.COMMITMENTS,
      page_size: 100,
      filter: { property: 'Status', select: { does_not_equal: 'Cancelled' } },
    };
    do {
      const response = await withRetry(() => notion.databases.query({
        ...params,
        start_cursor: cursor,
      }));
      commitments.push(...response.results.map(page => {
        const simplified = simplify(page.properties);
        if (!simplified.Priority) simplified.Priority = 'Unset';
        if (!simplified.Type) simplified.Type = 'Unset';
        return { id: page.id, url: page.url, ...simplified };
      }));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Fetch people and focus areas for name resolution
    const [people, focusAreas] = await Promise.all([getPeople(), getFocusAreas()]);

    const peopleLookup = {};
    for (const p of people) {
      peopleLookup[p.id.replace(/-/g, '')] = p.Name || 'Unknown';
    }
    const faLookup = {};
    for (const fa of focusAreas) {
      faLookup[fa.id.replace(/-/g, '')] = fa.Name || 'Unknown';
    }

    // Resolve relation IDs to human-readable names
    return commitments.map(c => {
      const assignedIds = c['Assigned To'] || [];
      const assignedNames = Array.isArray(assignedIds)
        ? assignedIds.map(id => peopleLookup[id.replace(/-/g, '')] || id.slice(0, 8))
        : [];

      const faIds = c['Focus Area'] || c['Focus Areas'] || c['Focus area'] || [];
      const focusAreaNames = Array.isArray(faIds)
        ? faIds.map(id => faLookup[id.replace(/-/g, '')] || id.slice(0, 8))
        : [];

      return { ...c, assignedNames, focusAreaNames };
    });
  }).catch(err => {
    console.error('Failed to fetch kanban commitments:', err.message);
    return [];
  });
}

/**
 * Get dashboard summary data with health distribution and counts
 */
async function getDashboardSummary() {
  const cachedDashboard = cache.get(DASHBOARD_CACHE_KEY);
  if (cachedDashboard && Date.now() - cachedDashboard.time < DASHBOARD_CACHE_TTL) {
    return cachedDashboard.data;
  }

  const [focusAreas, overdue, decisions, people, projects, allCommitments, upcoming, audiencesResult, platformsResult, recentlyCompleted] = await Promise.all([
    getFocusAreas(),
    getOverdueCommitments(),
    getRecentDecisions(7),
    getPeople(),
    getProjects(),
    getAllCommitments(),
    getUpcomingCommitments(7),
    queryDatabase(DB.AUDIENCES, { pageSize: 50 }),
    queryDatabase(DB.PLATFORMS, { pageSize: 50 }),
    getRecentlyCompletedCommitments(30),
  ]);

  // Health distribution
  const healthDistribution = { onTrack: 0, atRisk: 0, offTrack: 0, other: 0 };
  for (const area of focusAreas) {
    const h = (area.Health || area.Status || '').toLowerCase();
    if (h.includes('on track')) healthDistribution.onTrack++;
    else if (h.includes('risk') || h.includes('attention')) healthDistribution.atRisk++;
    else if (h.includes('off track') || h.includes('improvement')) healthDistribution.offTrack++;
    else healthDistribution.other++;
  }

  // Count projects per focus area
  const projectsByFA = {};
  const activeProjectsByOwner = {};
  for (const project of projects) {
    // Try common relation property names
    const faIds = project['Focus Area'] || project['Focus Areas'] || project['Focus area'] || [];
    for (const faId of (Array.isArray(faIds) ? faIds : [])) {
      const nid = faId.replace(/-/g, '');
      projectsByFA[nid] = (projectsByFA[nid] || 0) + 1;
    }

    const ownerIds = project.Owner || [];
    if (project.Status === 'Active') {
      for (const ownerId of (Array.isArray(ownerIds) ? ownerIds : [])) {
        const nid = ownerId.replace(/-/g, '');
        if (!activeProjectsByOwner[nid]) activeProjectsByOwner[nid] = [];
        activeProjectsByOwner[nid].push(project);
      }
    }
  }

  // Count commitments per focus area
  const commitmentsByFA = {};
  for (const c of allCommitments) {
    const faIds = c['Focus Area'] || c['Focus Areas'] || c['Focus area'] || [];
    for (const faId of (Array.isArray(faIds) ? faIds : [])) {
      const nid = faId.replace(/-/g, '');
      commitmentsByFA[nid] = (commitmentsByFA[nid] || 0) + 1;
    }
  }

  // Pre-compute per-focus-area health signals from allCommitments + recentlyCompleted
  const todayStr = new Date().toISOString().split('T')[0];

  // Build per-FA buckets: overdue items, blocked items, all items (for lastActivity)
  const faOverdue = {};   // nid → [commitment]  (active, due < today)
  const faBlocked = {};   // nid → count
  const faAllDates = {};  // nid → [ISO date strings]  (for lastActivity)
  const commitmentsByPerson = {};
  const activeCommitmentsByPerson = {};

  for (const c of allCommitments) {
    const assignedIds = c['Assigned To'] || [];
    const normalizedAssignedIds = Array.isArray(assignedIds)
      ? assignedIds.map(id => id.replace(/-/g, ''))
      : [];
    const isActive = c.Status && !['Done', 'Cancelled'].includes(c.Status);

    for (const personId of normalizedAssignedIds) {
      if (!commitmentsByPerson[personId]) commitmentsByPerson[personId] = [];
      commitmentsByPerson[personId].push(c);
      if (isActive) {
        if (!activeCommitmentsByPerson[personId]) activeCommitmentsByPerson[personId] = [];
        activeCommitmentsByPerson[personId].push(c);
      }
    }

    const faIds = c['Focus Area'] || c['Focus Areas'] || c['Focus area'] || [];
    for (const faId of (Array.isArray(faIds) ? faIds : [])) {
      const nid = faId.replace(/-/g, '');

      // lastActivity: collect the due date start if present
      const due = c['Due Date'];
      const dueStart = due && typeof due === 'object' ? due.start : (due || null);
      if (dueStart) {
        if (!faAllDates[nid]) faAllDates[nid] = [];
        faAllDates[nid].push(dueStart);
      }

      // Overdue: active, due < today
      if (isActive && dueStart && dueStart < todayStr) {
        if (!faOverdue[nid]) faOverdue[nid] = [];
        faOverdue[nid].push(c);
      }

      // Blocked
      if (c.Status === 'Blocked') {
        faBlocked[nid] = (faBlocked[nid] || 0) + 1;
      }
    }
  }

  // completedLast30d: from recentlyCompleted (Status=Done, edited within 30 days)
  const faCompleted30d = {};
  for (const c of recentlyCompleted) {
    const faIds = c['Focus Area'] || c['Focus Areas'] || c['Focus area'] || [];
    for (const faId of (Array.isArray(faIds) ? faIds : [])) {
      const nid = faId.replace(/-/g, '');
      faCompleted30d[nid] = (faCompleted30d[nid] || 0) + 1;

      // Also count their last_edited_time as lastActivity signal
      if (c.last_edited_time) {
        if (!faAllDates[nid]) faAllDates[nid] = [];
        faAllDates[nid].push(c.last_edited_time.split('T')[0]);
      }
    }
  }

  // Enrich focus areas
  const enrichedFocusAreas = focusAreas.map(area => {
    const nid = area.id.replace(/-/g, '');
    const overdueItems = faOverdue[nid] || [];
    const blockedCount = faBlocked[nid] || 0;
    const completedLast30d = faCompleted30d[nid] || 0;

    // lastActivityDate: most recent date across all commitments for this FA
    const allDates = faAllDates[nid] || [];
    const lastActivityDate = allDates.length > 0
      ? allDates.sort().reverse()[0]
      : null;

    // topOverdueItems: up to 3, sorted oldest first (smallest dueStart first)
    const topOverdueItems = overdueItems
      .slice()
      .sort((a, b) => {
        const aDate = (a['Due Date'] && typeof a['Due Date'] === 'object' ? a['Due Date'].start : a['Due Date']) || '';
        const bDate = (b['Due Date'] && typeof b['Due Date'] === 'object' ? b['Due Date'].start : b['Due Date']) || '';
        return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;
      })
      .slice(0, 3)
      .map(c => c.Name || 'Untitled');

    return {
      ...area,
      projectCount: projectsByFA[nid] || 0,
      commitmentCount: commitmentsByFA[nid] || 0,
      overdueCount: overdueItems.length,
      blockedCount,
      completedLast30d,
      lastActivityDate,
      topOverdueItems,
    };
  });

  // Build people ID to Name lookup for resolving relations
  const peopleLookup = {};
  const focusAreaLookup = {};
  for (const person of people) {
    peopleLookup[person.id.replace(/-/g, '')] = person.Name || 'Unknown';
  }
  for (const area of focusAreas) {
    focusAreaLookup[area.id.replace(/-/g, '')] = area.Name || 'Unknown';
  }

  // Resolve relation IDs in overdue commitments
  const enrichedOverdue = overdue.map(c => {
    const assignedIds = c['Assigned To'] || [];
    const assignedNames = Array.isArray(assignedIds)
      ? assignedIds.map(id => peopleLookup[id.replace(/-/g, '')] || id.slice(0, 8))
      : [];
    return { ...c, assignedNames };
  });

  // Also enrich upcoming commitments with resolved names
  const enrichedUpcoming = upcoming.map(c => {
    const assignedIds = c['Assigned To'] || [];
    const assignedNames = Array.isArray(assignedIds)
      ? assignedIds.map(id => peopleLookup[id.replace(/-/g, '')] || id.slice(0, 8))
      : [];
    return { ...c, assignedNames };
  });

  // Enrich people with workload data
  const enrichedPeople = people.map(person => {
    const pid = person.id.replace(/-/g, '');
    const personCommitments = commitmentsByPerson[pid] || [];
    const activeCommitments = activeCommitmentsByPerson[pid] || [];

    // Count overdue commitments: due < today AND not Done/Cancelled
    const overdueCount = activeCommitments.filter(c => {
      const due = c['Due Date'];
      if (!due) return false;
      const dueStart = typeof due === 'object' ? due.start : due;
      if (!dueStart) return false;
      return dueStart < todayStr;
    }).length;

    // Count blocked commitments: Status === 'Blocked'
    const blockedCount = activeCommitments.filter(c => c.Status === 'Blocked').length;

    const activeProjects = activeProjectsByOwner[pid] || [];

    // Find focus areas this person works on (from their commitments)
    const focusAreaIds = new Set();
    for (const c of personCommitments) {
      const faIds = c['Focus Area'] || c['Focus Areas'] || c['Focus area'] || [];
      if (Array.isArray(faIds)) {
        for (const id of faIds) focusAreaIds.add(id.replace(/-/g, ''));
      }
    }

    // Resolve focus area IDs to names using the already-fetched focusAreas
    const focusAreaNames = [];
    for (const faId of focusAreaIds) {
      if (focusAreaLookup[faId]) focusAreaNames.push(focusAreaLookup[faId]);
    }

    return {
      ...person,
      activeCommitmentCount: activeCommitments.length,
      overdueCount,
      blockedCount,
      activeProjectCount: activeProjects.length,
      activeProjectNames: activeProjects.map(p => p.Name).slice(0, 5),
      focusAreaNames: focusAreaNames.slice(0, 5),
      commitmentNames: activeCommitments.map(c => c.Name).slice(0, 5),
    };
  });

  // Count unassigned active commitments (no entries in 'Assigned To')
  const unassignedCount = allCommitments.filter(c => {
    if (c.Status && ['Done', 'Cancelled'].includes(c.Status)) return false;
    const assignedIds = c['Assigned To'] || [];
    return !Array.isArray(assignedIds) || assignedIds.length === 0;
  }).length;

  const summary = {
    focusAreas: enrichedFocusAreas,
    overdue: enrichedOverdue,
    upcoming: enrichedUpcoming,
    recentDecisions: decisions,
    people: enrichedPeople,
    healthDistribution,
    audienceCount: audiencesResult.results.length,
    platformCount: platformsResult.results.length,
    unassignedCount,
    timestamp: new Date().toISOString(),
  };

  setCachedWithTime(DASHBOARD_CACHE_KEY, summary);
  return summary;
}

/**
 * Resolve relation IDs in simplified properties to {id, name} objects.
 * Uses cached pages when available, fetches uncached ones in parallel.
 * This is cheap because getPage() uses the 5-min cache.
 */
async function resolveRelations(properties) {
  const resolved = { ...properties };

  for (const [key, value] of Object.entries(resolved)) {
    // Relations from simplify() are arrays of ID strings
    if (!Array.isArray(value) || value.length === 0) continue;
    // Skip arrays that aren't UUIDs (multi_select values are short human-readable strings)
    if (typeof value[0] !== 'string' || value[0].length < 30) continue;

    // Resolve each ID to {id, name} — use getPageRaw to avoid recursive resolution
    const resolvedItems = await Promise.all(
      value.slice(0, 10).map(async (id) => {
        try {
          const page = await getPageRaw(id);
          if (!page) return { id, name: 'Untitled' };
          const name = page.properties.Name || page.properties.Title || page.properties.name || 'Untitled';
          return { id, name };
        } catch {
          return { id, name: 'Untitled' };
        }
      })
    );
    resolved[key] = resolvedItems;
  }

  return resolved;
}

async function resolveRelationIdsToNamedItems(ids) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).filter(id => typeof id === 'string' && id.length >= 30))];
  const entries = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const page = await getPageRaw(id);
        const name = page?.properties?.Name || page?.properties?.Title || page?.properties?.name || 'Untitled';
        return [id, { id, name }];
      } catch {
        return [id, { id, name: 'Untitled' }];
      }
    })
  );
  return Object.fromEntries(entries);
}

/**
 * List all known databases with metadata
 */
function listDatabases() {
  return [
    { id: DB.FOCUS_AREAS, name: 'Focus Areas', icon: 'F', description: 'Strategic focus areas with health status' },
    { id: DB.PROJECTS, name: 'Projects', icon: 'P', description: 'Mission briefs, initiatives, experiments' },
    { id: DB.COMMITMENTS, name: 'Commitments', icon: 'C', description: 'Tasks, deliverables, accountability tracking' },
    { id: DB.PEOPLE, name: 'People', icon: 'T', description: 'Team roster and AI expert panel' },
    { id: DB.DECISIONS, name: 'Decisions', icon: 'D', description: 'Decision log with rationale' },
    { id: DB.PLATFORMS, name: 'Platforms', icon: 'S', description: 'System and platform tracking' },
    { id: DB.AUDIENCES, name: 'Audiences', icon: 'A', description: 'Customer segments and targeting' },
    { id: DB.CAMPAIGNS, name: 'Campaigns', icon: 'M', description: 'Marketing campaigns with stage tracking' },
    { id: DB.CONTENT_CALENDAR, name: 'Content Calendar', icon: 'W', description: 'Content pipeline from idea to published' },
    { id: DB.SEQUENCES, name: 'Sequences', icon: 'Q', description: 'Email and messaging sequences' },
    { id: DB.SESSIONS_LOG, name: 'Sessions Log', icon: 'L', description: 'Session records with decisions and commitments' },
    { id: DB.TECH_SPRINT_BOARD, name: 'Sprint Board (Tech)', icon: '📋', description: 'Tech sprint items, bugs, and tasks' },
    { id: DB.TECH_SPEC_LIBRARY, name: 'Spec Library', icon: '📄', description: 'Technical specification pipeline' },
    { id: DB.TECH_DECISION_LOG, name: 'Tech Decision Log', icon: '⚖️', description: 'Technical decision records' },
    { id: DB.TECH_SPRINT_ARCHIVE, name: 'Sprint Archive', icon: '📊', description: 'Sprint velocity and history' },
  ];
}

/**
 * Query any database by ID with optional filter/sort/pagination
 */
async function queryDatabase(dbId, { filter, sorts, startCursor, pageSize = 50 } = {}) {
  const cacheKey = 'db_' + dbId + '_' + stableStringify({ filter, sorts, startCursor });
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const params = { database_id: dbId, page_size: pageSize };
    if (filter) params.filter = filter;
    if (sorts) params.sorts = sorts;
    if (startCursor) params.start_cursor = startCursor;
    const response = await withRetry(() => notion.databases.query(params));
    return {
      results: response.results.map(page => ({
        id: page.id,
        url: page.url,
        created: page.created_time,
        updated: page.last_edited_time,
        ...simplify(page.properties),
      })),
      hasMore: response.has_more,
      nextCursor: response.next_cursor,
    };
  }).catch(err => {
    console.error('Failed to query database ' + dbId + ':', err.message);
    return { results: [], hasMore: false, nextCursor: null };
  });
}

/**
 * Fetch a single page's raw (simplified but not relation-resolved) properties.
 * Used internally by resolveRelations to avoid recursive resolution.
 */
async function getPageRaw(pageId) {
  const cacheKey = 'page_' + pageId;
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const page = await withRetry(() => notion.pages.retrieve({ page_id: pageId }));
    return {
      id: page.id,
      url: page.url,
      created: page.created_time,
      updated: page.last_edited_time,
      properties: simplify(page.properties),
    };
  }).catch(err => {
    console.error('Failed to get page ' + pageId + ':', err.message);
    return null;
  });
}

/**
 * Get a single page's properties with relations resolved to {id, name} objects.
 */
async function getPage(pageId) {
  const raw = await getPageRaw(pageId);
  if (!raw) return null;
  return {
    ...raw,
    properties: await resolveRelations(raw.properties),
  };
}

/**
 * Get a page's block children (content) and convert to markdown
 */
async function getPageContent(pageId) {
  const cacheKey = 'blocks_' + pageId;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const notion = getClient();
    const blocks = [];
    let cursor;

    // Paginate through all blocks
    do {
      const response = await withRetry(() => notion.blocks.children.list({
        block_id: pageId,
        page_size: 100,
        start_cursor: cursor,
      }));
      blocks.push(...response.results);
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Recursively fetch nested content (toggles, columns, etc.)
    const enrichedBlocks = await fetchBlockChildren(blocks);
    const markdown = blocksToMarkdown(enrichedBlocks);
    const result = { blocks: blocks.length, markdown };

    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error('Failed to get blocks for ' + pageId + ':', err.message);
    return { blocks: 0, markdown: '' };
  }
}

/**
 * Recursively fetch children for blocks that have them (toggles, columns, etc.)
 * Limited to 2 levels deep to avoid excessive API calls.
 */
const EXPANDABLE_BLOCK_TYPES = new Set([
  'toggle', 'column_list', 'column', 'bulleted_list_item',
  'numbered_list_item', 'to_do', 'callout', 'quote', 'synced_block',
]);

async function fetchBlockChildren(blocks, depth = 0) {
  if (depth >= 2) return blocks; // Max recursion depth

  const notion = getClient();

  // Fetch all expandable blocks' children in parallel
  const expandableBlocks = blocks.filter(
    b => b.has_children && EXPANDABLE_BLOCK_TYPES.has(b.type)
  );

  await Promise.all(expandableBlocks.map(async (block) => {
    try {
      const children = [];
      let cursor;
      do {
        const response = await withRetry(() => notion.blocks.children.list({
          block_id: block.id,
          page_size: 100,
          start_cursor: cursor,
        }));
        children.push(...response.results);
        cursor = response.has_more ? response.next_cursor : null;
      } while (cursor);

      block._children = await fetchBlockChildren(children, depth + 1);
    } catch (err) {
      console.warn(`Failed to fetch children for block ${block.id}:`, err.message);
    }
  }));

  return blocks;
}

/**
 * Convert Notion blocks to markdown
 */
function blocksToMarkdown(blocks) {
  const lines = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
        lines.push(richTextToPlain(block.paragraph.rich_text));
        lines.push('');
        break;
      case 'heading_1':
        lines.push('# ' + richTextToPlain(block.heading_1.rich_text));
        lines.push('');
        break;
      case 'heading_2':
        lines.push('## ' + richTextToPlain(block.heading_2.rich_text));
        lines.push('');
        break;
      case 'heading_3':
        lines.push('### ' + richTextToPlain(block.heading_3.rich_text));
        lines.push('');
        break;
      case 'bulleted_list_item':
        lines.push('- ' + richTextToPlain(block.bulleted_list_item.rich_text));
        if (block._children) {
          const childMd = blocksToMarkdown(block._children);
          lines.push(childMd.split('\n').map(l => '  ' + l).join('\n'));
        }
        break;
      case 'numbered_list_item':
        lines.push('1. ' + richTextToPlain(block.numbered_list_item.rich_text));
        if (block._children) {
          const childMd = blocksToMarkdown(block._children);
          lines.push(childMd.split('\n').map(l => '  ' + l).join('\n'));
        }
        break;
      case 'to_do':
        lines.push('- [' + (block.to_do.checked ? 'x' : ' ') + '] ' + richTextToPlain(block.to_do.rich_text));
        if (block._children) {
          const childMd = blocksToMarkdown(block._children);
          lines.push(childMd.split('\n').map(l => '  ' + l).join('\n'));
        }
        break;
      case 'toggle': {
        const toggleContent = block._children ? blocksToMarkdown(block._children) : '';
        lines.push('<details><summary>' + richTextToPlain(block.toggle.rich_text) + '</summary>');
        if (toggleContent) {
          lines.push('');
          lines.push(toggleContent);
        }
        lines.push('</details>');
        lines.push('');
        break;
      }
      case 'code':
        lines.push('```' + (block.code.language || ''));
        lines.push(richTextToPlain(block.code.rich_text));
        lines.push('```');
        lines.push('');
        break;
      case 'quote':
        lines.push('> ' + richTextToPlain(block.quote.rich_text));
        if (block._children) {
          const childMd = blocksToMarkdown(block._children);
          lines.push(childMd.split('\n').map(l => '> ' + l).join('\n'));
        }
        lines.push('');
        break;
      case 'callout':
        lines.push('> ' + (block.callout.icon?.emoji || '') + ' ' + richTextToPlain(block.callout.rich_text));
        if (block._children) {
          const childMd = blocksToMarkdown(block._children);
          lines.push(childMd.split('\n').map(l => '> ' + l).join('\n'));
        }
        lines.push('');
        break;
      case 'divider':
        lines.push('---');
        lines.push('');
        break;
      case 'table_of_contents':
        lines.push('*[Table of Contents]*');
        lines.push('');
        break;
      case 'bookmark':
        lines.push('[Bookmark](' + (block.bookmark.url || '') + ')');
        lines.push('');
        break;
      case 'image': {
        const imgUrl = block.image.type === 'file' ? block.image.file.url : block.image.external?.url || '';
        lines.push('![Image](' + imgUrl + ')');
        lines.push('');
        break;
      }
      case 'child_database':
        lines.push('**[Database: ' + block.child_database.title + ']**');
        lines.push('');
        break;
      case 'child_page':
        lines.push('**[Page: ' + block.child_page.title + ']**');
        lines.push('');
        break;
      case 'column_list':
        // Render columns as sequential content in markdown
        if (block._children) {
          for (const col of block._children) {
            if (col._children) {
              lines.push(blocksToMarkdown(col._children));
              lines.push('');
            }
          }
        }
        break;
      case 'column':
        // Individual columns are rendered via their column_list parent
        break;
      default:
        // Unknown block type -- show type name
        if (block[block.type]?.rich_text) {
          lines.push(richTextToPlain(block[block.type].rich_text));
          lines.push('');
        }
    }
  }

  return lines.join('\n').trim();
}

/**
 * Convert rich_text array to plain text with basic formatting
 */
function richTextToPlain(richText) {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map(t => {
    let text = t.plain_text;
    if (t.annotations?.bold) text = '**' + text + '**';
    if (t.annotations?.italic) text = '*' + text + '*';
    if (t.annotations?.code) text = '`' + text + '`';
    if (t.annotations?.strikethrough) text = '~~' + text + '~~';
    if (t.href) text = '[' + text + '](' + t.href + ')';
    return text;
  }).join('');
}

/**
 * Get related pages for a given page (resolve relation properties)
 */
async function getRelatedPages(pageId) {
  const cacheKey = 'related_' + pageId;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const notion = getClient();
    const rawPage = await withRetry(() => notion.pages.retrieve({ page_id: pageId }));
    const related = {};

    for (const [key, prop] of Object.entries(rawPage.properties)) {
      if (prop.type === 'relation' && prop.relation.length > 0) {
        const relatedIds = prop.relation.map(r => r.id).slice(0, 10);

        const resolvedPages = await Promise.all(
          relatedIds.map(async (relId) => {
            try {
              const relPage = await getPageRaw(relId);
              if (!relPage) return null;
              return {
                id: relId,
                name: relPage.properties.Name || relPage.properties.Title || relPage.properties.name || 'Untitled',
                status: relPage.properties.Status || null,
                health: relPage.properties.Health || null,
                priority: relPage.properties.Priority || null,
                dueDate: relPage.properties['Due Date'] || null,
              };
            } catch {
              return { id: relId, name: 'Untitled', status: null };
            }
          })
        );

        related[key] = resolvedPages.filter(Boolean);
      }
    }

    setCache(cacheKey, related);
    return related;
  } catch (err) {
    console.error('Failed to get related pages for ' + pageId + ':', err.message);
    return {};
  }
}

/**
 * Selectively invalidate commitment-related cache entries after a write.
 * Avoids a full cache.clear() which would bust unrelated caches (decisions, platforms, etc.)
 */
function invalidateCommitmentCaches() {
  for (const key of cache.keys()) {
    if (
      key.startsWith('commitments_') ||
      key.startsWith('all_commitments') ||
      key.startsWith('kanban_commitments') ||
      key.startsWith('recently_completed_') ||
      key === 'projects' ||
      key.startsWith('page_') ||
      key.includes('dashboard')
    ) {
      cache.delete(key);
    }
  }
}

/**
 * Create a new commitment page in the Commitments database.
 */
async function createCommitment({ name, assigneeId, dueDate, focusAreaId, priority, projectId, notes }) {
  return enqueueWrite(async () => {
    const notion = getClient();
    const properties = {
      Name: { title: [{ text: { content: name } }] },
      Status: { select: { name: 'Not Started' } },
      Priority: { select: { name: priority || 'Medium' } },
      Source: { select: { name: 'Dashboard' } },
      Type: { select: { name: 'Deliverable' } },
    };

    if (dueDate) {
      properties['Due Date'] = { date: { start: dueDate } };
    }

    if (assigneeId) {
      const cleanId = assigneeId.replace(/-/g, '');
      const formattedId = [
        cleanId.slice(0, 8), cleanId.slice(8, 12), cleanId.slice(12, 16),
        cleanId.slice(16, 20), cleanId.slice(20),
      ].join('-');
      properties['Assigned To'] = { relation: [{ id: formattedId }] };
    }

    if (focusAreaId) {
      const cleanId = focusAreaId.replace(/-/g, '');
      const formattedId = [
        cleanId.slice(0, 8), cleanId.slice(8, 12), cleanId.slice(12, 16),
        cleanId.slice(16, 20), cleanId.slice(20),
      ].join('-');
      properties['Focus Area'] = { relation: [{ id: formattedId }] };
    }

    if (projectId) {
      const cleanId = projectId.replace(/-/g, '');
      const formattedId = [
        cleanId.slice(0, 8), cleanId.slice(8, 12), cleanId.slice(12, 16),
        cleanId.slice(16, 20), cleanId.slice(20),
      ].join('-');
      properties['Project'] = { relation: [{ id: formattedId }] };
    }

    if (notes) {
      properties['Notes'] = { rich_text: [{ text: { content: notes } }] };
    }

    const result = await withRetry(() => notion.pages.create({
      parent: { database_id: DB.COMMITMENTS },
      properties,
    }));

    invalidateCommitmentCaches();
    return { id: result.id, url: result.url };
  });
}

/**
 * Create a new decision page in the Decisions database.
 */
async function createDecision({ name, decision, rationale, context, focusAreaId, owner }) {
  return enqueueWrite(async () => {
    const notion = getClient();
    const today = new Date().toISOString().split('T')[0];
    const properties = {
      Name: { title: [{ text: { content: name } }] },
      Date: { date: { start: today } },
      Owner: { rich_text: [{ text: { content: owner || 'Dan' } }] },
      Decision: { rich_text: [{ text: { content: decision } }] },
      Rationale: { rich_text: [{ text: { content: rationale || '' } }] },
    };

    if (context) {
      properties['Context'] = { rich_text: [{ text: { content: context } }] };
    }

    if (focusAreaId) {
      const cleanId = focusAreaId.replace(/-/g, '');
      const formattedId = [
        cleanId.slice(0, 8), cleanId.slice(8, 12), cleanId.slice(12, 16),
        cleanId.slice(16, 20), cleanId.slice(20),
      ].join('-');
      properties['Focus Area'] = { relation: [{ id: formattedId }] };
    }

    const result = await withRetry(() => notion.pages.create({
      parent: { database_id: DB.DECISIONS },
      properties,
    }));

    // Invalidate decisions cache entries
    for (const [key] of cache) {
      if (key.startsWith('decisions_') || key.includes('dashboard')) {
        cache.delete(key);
      }
    }

    return { id: result.id, url: result.url };
  });
}

/**
 * Update the Status field of a commitment page.
 */
async function updateCommitmentStatus(pageId, status) {
  return enqueueWrite(async () => {
    const notion = getClient();
    await withRetry(() => notion.pages.update({
      page_id: pageId,
      properties: { Status: { select: { name: status } } },
    }));
    invalidateCommitmentCaches();
    return { id: pageId, status };
  });
}

/**
 * Update the Priority field of a commitment page.
 */
async function updateCommitmentPriority(pageId, priority) {
  return enqueueWrite(async () => {
    const notion = getClient();
    await withRetry(() => notion.pages.update({
      page_id: pageId,
      properties: { Priority: { select: { name: priority } } },
    }));
    invalidateCommitmentCaches();
    return { id: pageId, priority };
  });
}

/**
 * Update the Due Date field of a commitment page.
 * @param {string} dueDate - ISO date string YYYY-MM-DD
 */
async function updateCommitmentDueDate(pageId, dueDate) {
  return enqueueWrite(async () => {
    const notion = getClient();
    await withRetry(() => notion.pages.update({
      page_id: pageId,
      properties: { 'Due Date': { date: { start: dueDate } } },
    }));
    invalidateCommitmentCaches();
    return { id: pageId, dueDate };
  });
}

/**
 * Update the Assigned To relation of a commitment page.
 * Normalises the personId to standard UUID format before sending.
 */
async function updateCommitmentAssignee(pageId, personId) {
  return enqueueWrite(async () => {
    const notion = getClient();
    const cleanId = personId.replace(/-/g, '');
    const formattedId = [
      cleanId.slice(0, 8), cleanId.slice(8, 12), cleanId.slice(12, 16),
      cleanId.slice(16, 20), cleanId.slice(20),
    ].join('-');
    await withRetry(() => notion.pages.update({
      page_id: pageId,
      properties: { 'Assigned To': { relation: [{ id: formattedId }] } },
    }));
    invalidateCommitmentCaches();
    return { id: pageId, assigneeId: personId };
  });
}

/**
 * Append a timestamped note to the Notes rich_text field of a commitment page.
 * Preserves existing content and truncates to 1900 chars to stay within Notion limits.
 */
async function appendCommitmentNote(pageId, note) {
  // Note: read-then-write is not atomic. Safe because write queue serializes and single user.
  return enqueueWrite(async () => {
    const notion = getClient();
    const currentPage = await withRetry(() => notion.pages.retrieve({ page_id: pageId }));
    const currentNotes = currentPage.properties.Notes?.rich_text
      ?.map(t => t.plain_text).join('') || '';
    const today = new Date().toISOString().split('T')[0];
    const separator = currentNotes ? '\n' : '';
    const newNotes = currentNotes + separator + `[${today} via Dashboard] ${note}`;
    const truncated = newNotes.slice(-1900);

    await withRetry(() => notion.pages.update({
      page_id: pageId,
      properties: {
        Notes: { rich_text: [{ text: { content: truncated } }] },
      },
    }));
    invalidateCommitmentCaches();
    return { id: pageId, notes: truncated };
  });
}

/**
 * Get key Notion pages
 */
function getKeyPages() {
  return [
    { id: '307247aa0d7b8039bf78d35962815014', name: 'Business Bible', description: 'Full business context and strategy' },
    { id: '307247aa0d7b8102bfa0f8a18d8809d9', name: 'Notion OS Root', description: 'System root page' },
    { id: '308247aa0d7b81cea80dca287155b137', name: 'Team Operating Manual', description: 'How teams interact with the system' },
    { id: '315247aa0d7b81c59fddf518c01e8556', name: 'Marketing Context Pack', description: 'Marketing-specific context' },
  ];
}

function clearCache() {
  cache.clear();
}

// ---------------------------------------------------------------------------
// Priority weight map for topThree scoring
// ---------------------------------------------------------------------------
const PRIORITY_WEIGHTS = { Urgent: 4, High: 3, Medium: 2, Low: 1 };

/**
 * Compute a priority score for a commitment used by getMorningBrief topThree.
 * Score = priority weight + overdue bonus (daysOverdue * 2) + due-today bonus (+5).
 */
function computeCommitmentScore(c, todayStr) {
  const weight = PRIORITY_WEIGHTS[c.Priority] || 1;

  const due = c['Due Date'];
  const dueStart = due && typeof due === 'object' ? due.start : (due || null);

  let overdueBonus = 0;
  let dueTodayBonus = 0;
  if (dueStart) {
    if (dueStart < todayStr) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const days = Math.floor((new Date(todayStr) - new Date(dueStart)) / msPerDay);
      overdueBonus = days * 2;
    } else if (dueStart === todayStr) {
      dueTodayBonus = 5;
    }
  }

  return weight + overdueBonus + dueTodayBonus;
}

/**
 * Derive a structured morning brief from getDashboardSummary().
 * All data is computed from already-cached sub-calls — no extra Notion requests.
 */
function buildMorningBriefFromDashboard(dashboard) {
  const todayStr = new Date().toISOString().split('T')[0];

  // -------------------------------------------------------------------
  // overdueCount and overdueItems (top 3 by daysOverdue DESC)
  // -------------------------------------------------------------------
  const overdueRaw = dashboard.overdue || [];
  const overdueCount = overdueRaw.length;

  const msPerDay = 1000 * 60 * 60 * 24;
  const withDays = overdueRaw.map(c => {
    const due = c['Due Date'];
    const dueStart = due && typeof due === 'object' ? due.start : (due || null);
    const daysOverdue = dueStart
      ? Math.max(0, Math.floor((new Date(todayStr) - new Date(dueStart)) / msPerDay))
      : 0;
    const severity = daysOverdue > 7 ? 'critical' : daysOverdue > 3 ? 'warning' : 'mild';
    const owner = Array.isArray(c.assignedNames) && c.assignedNames.length > 0
      ? c.assignedNames[0]
      : 'Unassigned';
    return { name: c.Name || 'Untitled', owner, daysOverdue, severity };
  });
  const overdueItems = withDays
    .slice()
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 3);

  // -------------------------------------------------------------------
  // todayItems — upcoming commitments due today or tomorrow
  // -------------------------------------------------------------------
  const tomorrowStr = new Date(new Date(todayStr).getTime() + msPerDay)
    .toISOString().split('T')[0];

  const todayItems = (dashboard.upcoming || []).filter(c => {
    const due = c['Due Date'];
    const dueStart = due && typeof due === 'object' ? due.start : (due || null);
    return dueStart === todayStr || dueStart === tomorrowStr;
  });

  // -------------------------------------------------------------------
  // topThree — highest-scoring open commitments
  // -------------------------------------------------------------------
  const allOpen = (dashboard.overdue || []).concat(dashboard.upcoming || []);
  // Deduplicate by id
  const seenIds = new Set();
  const deduped = [];
  for (const c of allOpen) {
    if (c.id && !seenIds.has(c.id)) {
      seenIds.add(c.id);
      deduped.push(c);
    } else if (!c.id) {
      deduped.push(c);
    }
  }

  const topThree = deduped
    .filter(c => c.Status && !['Done', 'Cancelled'].includes(c.Status))
    .map(c => ({ ...c, _score: computeCommitmentScore(c, todayStr) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 3)
    .map(c => ({
      name: c.Name || 'Untitled',
      owner: Array.isArray(c.assignedNames) && c.assignedNames.length > 0
        ? c.assignedNames[0]
        : 'Unassigned',
      dueDate: c['Due Date'],
      priority: c.Priority,
      status: c.Status,
      id: c.id,
    }));

  // -------------------------------------------------------------------
  // flags — overload, drift, decision
  // -------------------------------------------------------------------
  const flags = [];

  // Overload: any person with activeCommitmentCount > 8 or overdueCount > 3
  for (const person of (dashboard.people || [])) {
    if (person.activeCommitmentCount > 8 || person.overdueCount > 3) {
      flags.push({
        type: 'overload',
        message: `${person.Name || 'Unknown'} has ${person.activeCommitmentCount} active commitments and ${person.overdueCount} overdue`,
      });
    }
  }

  // Drift: focus areas with no activity in 14+ days
  const fourteenDaysAgo = new Date(new Date(todayStr).getTime() - 14 * msPerDay)
    .toISOString().split('T')[0];
  for (const area of (dashboard.focusAreas || [])) {
    if (!area.lastActivityDate || area.lastActivityDate < fourteenDaysAgo) {
      flags.push({
        type: 'drift',
        message: `${area.Name || 'Unknown area'} has had no activity since ${area.lastActivityDate || 'never'}`,
      });
    }
  }

  // Decision: blocked items where Notes mention 'Dan' or 'decision'
  const decisionPattern = /\bdan\b|decision/i;
  const decisionBlocked = (dashboard.overdue || []).concat(dashboard.upcoming || []).filter(c => {
    if (c.Status !== 'Blocked') return false;
    const notes = c.Notes || '';
    return decisionPattern.test(notes);
  });
  if (decisionBlocked.length > 0) {
    flags.push({
      type: 'decision',
      message: `${decisionBlocked.length} blocked item${decisionBlocked.length > 1 ? 's' : ''} waiting on Dan or a decision`,
    });
  }

  // -------------------------------------------------------------------
  // waitingOn — blocked commitments grouped by blocker
  // -------------------------------------------------------------------
  const allCommitmentsForWaiting = (dashboard.overdue || []).concat(dashboard.upcoming || []);
  const waitingOnMap = {};
  for (const c of allCommitmentsForWaiting) {
    if (c.Status !== 'Blocked') continue;
    // Try to extract who is blocking from Notes field
    const notes = (c.Notes || '').trim();
    let blocker = 'Unknown';
    const waitingMatch = notes.match(/waiting on ([A-Z][a-z]+)/i);
    const blockedByMatch = notes.match(/blocked by ([A-Z][a-z]+)/i);
    if (waitingMatch) blocker = waitingMatch[1];
    else if (blockedByMatch) blocker = blockedByMatch[1];

    waitingOnMap[c.id || Math.random().toString()] = { name: c.Name || 'Untitled', id: c.id, blocker };
  }
  const waitingOn = Object.values(waitingOnMap).map(item => ({
    name: item.name,
    blockerDetail: item.blocker || 'Unknown',
    id: item.id,
  }));

  return {
    overdueCount,
    overdueItems,
    todayItems,
    topThree,
    flags,
    waitingOn,
    timestamp: new Date().toISOString(),
  };
}

async function getMorningBrief() {
  const dashboard = await getDashboardSummary();
  return buildMorningBriefFromDashboard(dashboard);
}

/**
 * Fetch all marketing campaigns with resolved relations.
 */
async function getCampaigns() {
  return deduplicatedFetch('mktops_campaigns', async () => {
    const notion = getClient();
    const campaigns = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.CAMPAIGNS,
        page_size: 100,
        start_cursor: cursor,
      }));
      campaigns.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Resolve Owner, Focus Area, and Audience relations to names
    const resolved = await Promise.all(campaigns.map(async (campaign) => {
      const ownerIds = Array.isArray(campaign.Owner) ? campaign.Owner : [];
      const focusAreaIds = Array.isArray(campaign['Focus Area']) ? campaign['Focus Area'] : [];
      const audienceIds = Array.isArray(campaign.Audience) ? campaign.Audience : [];

      const allIds = [...new Set([...ownerIds, ...focusAreaIds, ...audienceIds])].slice(0, 30);
      const pageMap = {};
      await Promise.all(allIds.map(async (id) => {
        try {
          const page = await getPageRaw(id);
          if (page) {
            pageMap[id.replace(/-/g, '')] = page.properties.Name || page.properties.Title || page.properties.name || 'Untitled';
          }
        } catch { /* skip unresolvable */ }
      }));

      const ownerNames = ownerIds.map(id => pageMap[id.replace(/-/g, '')] || id.slice(0, 8));
      const focusAreaNames = focusAreaIds.map(id => pageMap[id.replace(/-/g, '')] || id.slice(0, 8));
      const audienceNames = audienceIds.map(id => pageMap[id.replace(/-/g, '')] || id.slice(0, 8));

      return { ...campaign, ownerNames, focusAreaNames, audienceNames };
    }));

    return resolved;
  }).catch(err => {
    console.error('Failed to fetch campaigns:', err.message);
    return [];
  });
}

/**
 * Fetch content calendar with resolved Campaign relation.
 */
async function getContentCalendar() {
  return deduplicatedFetch('mktops_content', async () => {
    const notion = getClient();
    const content = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.CONTENT_CALENDAR,
        page_size: 100,
        start_cursor: cursor,
      }));
      content.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Resolve Campaign relation to campaignName
    const resolved = await Promise.all(content.map(async (item) => {
      const campaignIds = Array.isArray(item.Campaign) ? item.Campaign : [];
      if (campaignIds.length === 0) return { ...item, campaignName: null };

      try {
        const page = await getPageRaw(campaignIds[0]);
        const campaignName = page
          ? (page.properties.Name || page.properties.Title || page.properties.name || 'Untitled')
          : null;
        return { ...item, campaignName };
      } catch {
        return { ...item, campaignName: null };
      }
    }));

    return resolved;
  }).catch(err => {
    console.error('Failed to fetch content calendar:', err.message);
    return [];
  });
}

/**
 * Fetch email/messaging sequences.
 * Open Rate, Click Rate, Unsub Rate come through simplify() as numbers.
 */
async function getSequences() {
  return deduplicatedFetch('mktops_sequences', async () => {
    const notion = getClient();
    const sequences = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.SEQUENCES,
        page_size: 100,
        start_cursor: cursor,
      }));
      sequences.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    return sequences;
  }).catch(err => {
    console.error('Failed to fetch sequences:', err.message);
    return [];
  });
}

/**
 * Fetch sessions log for the last N days with resolved Participants relation.
 */
async function getSessionsLog(days = 30) {
  return deduplicatedFetch('mktops_sessions_' + days, async () => {
    const notion = getClient();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    const sessions = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.SESSIONS_LOG,
        filter: {
          property: 'Date',
          date: { on_or_after: sinceStr },
        },
        sorts: [{ property: 'Date', direction: 'descending' }],
        page_size: 100,
        start_cursor: cursor,
      }));
      sessions.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Resolve Participants relation to participantNames
    const resolved = await Promise.all(sessions.map(async (session) => {
      const participantIds = Array.isArray(session.Participants) ? session.Participants : [];
      if (participantIds.length === 0) return { ...session, participantNames: [] };

      const names = await Promise.all(participantIds.slice(0, 10).map(async (id) => {
        try {
          const page = await getPageRaw(id);
          return page
            ? (page.properties.Name || page.properties.Title || page.properties.name || 'Untitled')
            : id.slice(0, 8);
        } catch {
          return id.slice(0, 8);
        }
      }));

      return { ...session, participantNames: names };
    }));

    return resolved;
  }).catch(err => {
    console.error('Failed to fetch sessions log:', err.message);
    return [];
  });
}

/**
 * Update a campaign's Stage or Status property.
 */
async function updateCampaignProperty(pageId, property, value) {
  return enqueueWrite(async () => {
    const notion = getClient();
    const properties = {};

    if (property === 'Stage') {
      properties.Stage = { select: { name: value } };
    } else if (property === 'Status') {
      properties.Status = { select: { name: value } };
    } else {
      throw new Error('Unsupported campaign property: ' + property);
    }

    const result = await withRetry(() => notion.pages.update({
      page_id: pageId,
      properties,
    }));

    // Invalidate marketing ops caches
    for (const [key] of cache) {
      if (key.startsWith('mktops_')) cache.delete(key);
    }

    return { id: result.id, url: result.url };
  });
}

/**
 * Fetch commitments linked to a specific campaign via the Campaign relation.
 */
async function getCampaignCommitments(campaignId) {
  const cacheKey = 'mktops_campaign_commitments_' + campaignId;
  return deduplicatedFetch(cacheKey, async () => {
    const allCommitments = await getAllCommitments();

    const linked = allCommitments.filter(c => {
      const campaignIds = Array.isArray(c.Campaign) ? c.Campaign : [];
      return campaignIds.includes(campaignId);
    });

    // Enrich with overdue status
    const now = new Date();
    return linked.map(c => {
      const dueDate = c['Due Date'];
      const dueStr = dueDate && typeof dueDate === 'object' ? dueDate.start : dueDate;
      const isOverdue = dueStr && new Date(dueStr) < now && c.Status !== 'Done' && c.Status !== 'Cancelled';
      return { ...c, isOverdue, dueStr };
    });
  }).catch(err => {
    console.error('Failed to get campaign commitments:', err.message);
    return [];
  });
}

/**
 * Aggregated Marketing Ops summary with stats.
 */
async function getMarketingOpsSummary() {
  return deduplicatedFetch('mktops_summary', async () => {
    const [campaigns, content, sequences, sessions] = await Promise.all([
      getCampaigns(),
      getContentCalendar(),
      getSequences(),
      getSessionsLog(7),
    ]);

    const activeCampaigns = campaigns.filter(c => c.Stage !== 'Complete').length;
    const contentInPipeline = content.filter(c => c.Status !== 'Published').length;
    const liveSequences = sequences.filter(s => s.Status === 'Live' || s.Status === 'Active').length;
    const sessionsThisWeek = sessions.length;
    const blockedCampaigns = campaigns.filter(c => c.Status === 'Blocked' || c.Status === 'Needs Dan');
    const needsReviewContent = content.filter(c => c.Status === 'Brand Review');
    const unhealthySequences = sequences.filter(s =>
      (typeof s['Open Rate'] === 'number' && s['Open Rate'] < 15) ||
      (typeof s['Unsub Rate'] === 'number' && s['Unsub Rate'] > 2)
    );

    return {
      campaigns,
      content,
      sequences,
      sessions,
      stats: {
        activeCampaigns,
        contentInPipeline,
        liveSequences,
        sessionsThisWeek,
        blockedCampaigns,
        needsReviewContent,
        unhealthySequences,
      },
    };
  }).catch(err => {
    console.error('Failed to fetch marketing ops summary:', err.message);
    return { campaigns: [], content: [], sequences: [], sessions: [], stats: {} };
  });
}

// ── Tech Team ─────────────────────────────────────────────────────────────────

/**
 * Fetch all sprint board items, sorted by Priority ascending (P0 first).
 */
async function getSprintItems() {
  return deduplicatedFetch('tech_sprint', async () => {
    const notion = getClient();
    const items = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.TECH_SPRINT_BOARD,
        page_size: 100,
        start_cursor: cursor,
      }));
      items.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        lastEdited: page.last_edited_time,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Sort by Priority ascending (P0 first)
    const PRIORITY_ORDER = { 'P0 - Critical': 0, 'P1 - High': 1, 'P2 - Medium': 2, 'P3 - Low': 3 };
    items.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.Priority] ?? 99;
      const pb = PRIORITY_ORDER[b.Priority] ?? 99;
      return pa - pb;
    });

    return items;
  }).catch(err => {
    console.error('Failed to fetch sprint items:', err.message);
    return [];
  });
}

/**
 * Fetch all spec library items, sorted by Status: Draft → In Review → Approved.
 */
async function getSpecLibrary() {
  return deduplicatedFetch('tech_specs', async () => {
    const notion = getClient();
    const specs = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.TECH_SPEC_LIBRARY,
        page_size: 100,
        start_cursor: cursor,
      }));
      specs.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        lastEdited: page.last_edited_time,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    const STATUS_ORDER = { 'Draft': 0, 'In Review': 1, 'Approved': 2 };
    specs.sort((a, b) => {
      const sa = STATUS_ORDER[a.Status] ?? 99;
      const sb = STATUS_ORDER[b.Status] ?? 99;
      return sa - sb;
    });

    return specs;
  }).catch(err => {
    console.error('Failed to fetch spec library:', err.message);
    return [];
  });
}

/**
 * Fetch all tech decisions, sorted by Date descending (most recent first).
 * Note: the title property in this DB is called "Decision" (not "Name").
 */
async function getTechDecisions() {
  return deduplicatedFetch('tech_decisions', async () => {
    const notion = getClient();
    const decisions = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.TECH_DECISION_LOG,
        page_size: 100,
        start_cursor: cursor,
      }));
      decisions.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        lastEdited: page.last_edited_time,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Sort by Date descending (most recent first)
    decisions.sort((a, b) => {
      const da = a.Date && typeof a.Date === 'object' ? a.Date.start : a.Date;
      const db2 = b.Date && typeof b.Date === 'object' ? b.Date.start : b.Date;
      if (!da && !db2) return 0;
      if (!da) return 1;
      if (!db2) return -1;
      return new Date(db2) - new Date(da);
    });

    return decisions;
  }).catch(err => {
    console.error('Failed to fetch tech decisions:', err.message);
    return [];
  });
}

/**
 * Fetch sprint archive, sorted by Sprint Number descending.
 */
async function getSprintArchive() {
  return deduplicatedFetch('tech_archive', async () => {
    const notion = getClient();
    const archive = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.TECH_SPRINT_ARCHIVE,
        page_size: 100,
        start_cursor: cursor,
      }));
      archive.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        lastEdited: page.last_edited_time,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Sort by Sprint Number descending
    archive.sort((a, b) => {
      const na = typeof a['Sprint Number'] === 'number' ? a['Sprint Number'] : 0;
      const nb = typeof b['Sprint Number'] === 'number' ? b['Sprint Number'] : 0;
      return nb - na;
    });

    return archive;
  }).catch(err => {
    console.error('Failed to fetch sprint archive:', err.message);
    return [];
  });
}

/**
 * Aggregated Tech Team summary with stats.
 */
async function getTechTeamSummary() {
  return deduplicatedFetch('tech_summary', async () => {
    const [sprintItems, specs, techDecisions, sprintArchive] = await Promise.all([
      getSprintItems(),
      getSpecLibrary(),
      getTechDecisions(),
      getSprintArchive(),
    ]);

    const inProgress = sprintItems.filter(i => i.Status === 'In Progress').length;
    const blocked = sprintItems.filter(i => i.Status === 'Blocked').length;
    const openBugs = sprintItems.filter(i => i.Type === 'Bug' && i.Status !== 'Done' && i.Status !== 'Cancelled').length;
    const specsInReview = specs.filter(s => s.Status === 'In Review').length;
    const totalItems = sprintItems.length;
    const doneItems = sprintItems.filter(i => i.Status === 'Done').length;
    const waitingOnDan = sprintItems.filter(i => i['Waiting On'] === 'Dan' && i.Status !== 'Done');
    const p0Bugs = sprintItems.filter(i => i.Type === 'Bug' && typeof i.Priority === 'string' && i.Priority.startsWith('P0')).length;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentDecisions = techDecisions.filter(d => {
      const dateStr = d.Date && typeof d.Date === 'object' ? d.Date.start : d.Date;
      return dateStr && new Date(dateStr) >= sevenDaysAgo;
    });

    return {
      sprintItems,
      specs,
      techDecisions,
      sprintArchive,
      stats: {
        inProgress,
        blocked,
        openBugs,
        specsInReview,
        totalItems,
        doneItems,
        waitingOnDan,
        p0Bugs,
        recentDecisions,
      },
    };
  }).catch(err => {
    console.error('Failed to fetch tech team summary:', err.message);
    return { sprintItems: [], specs: [], techDecisions: [], sprintArchive: [], stats: {} };
  });
}

/**
 * Update a sprint item's Status, Priority, or Waiting On property.
 */
async function updateSprintItemProperty(pageId, property, value) {
  return enqueueWrite(async () => {
    const notion = getClient();
    const properties = {};

    if (property === 'Status') {
      properties.Status = { select: { name: value } };
    } else if (property === 'Priority') {
      properties.Priority = { select: { name: value } };
    } else if (property === 'Waiting On') {
      properties['Waiting On'] = { select: { name: value } };
    } else {
      throw new Error('Unsupported sprint item property: ' + property);
    }

    const result = await withRetry(() => notion.pages.update({
      page_id: pageId,
      properties,
    }));

    // Invalidate all tech caches
    for (const [key] of cache) {
      if (key.startsWith('tech_')) cache.delete(key);
    }

    return { id: result.id, url: result.url };
  });
}

module.exports = {
  DB,
  getClient,
  simplify,
  resolveRelations,
  resolveRelationIdsToNamedItems,
  getFocusAreas,
  getCommitments,
  getOverdueCommitments,
  getUpcomingCommitments,
  getRecentDecisions,
  getPeople,
  getProjects,
  getAllCommitments,
  getCommitmentsForKanban,
  getDashboardSummary,
  buildMorningBriefFromDashboard,
  getMorningBrief,
  listDatabases,
  queryDatabase,
  getPage,
  getPageContent,
  getRelatedPages,
  getKeyPages,
  clearCache,
  invalidateCommitmentCaches,
  createCommitment,
  createDecision,
  updateCommitmentStatus,
  updateCommitmentPriority,
  updateCommitmentDueDate,
  updateCommitmentAssignee,
  appendCommitmentNote,
  getCampaigns,
  getContentCalendar,
  getSequences,
  getSessionsLog,
  getMarketingOpsSummary,
  updateCampaignProperty,
  getCampaignCommitments,
  getSprintItems,
  getSpecLibrary,
  getTechDecisions,
  getSprintArchive,
  getTechTeamSummary,
  updateSprintItemProperty,
  // Cache internals — exported for testing only
  setCachedWithTime,
  deduplicatedFetch,
};
