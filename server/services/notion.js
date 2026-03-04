const config = require('../config');

let notionClient = null;
function getClient() {
  if (!notionClient) {
    const { Client } = require('@notionhq/client');
    notionClient = new Client({ auth: config.NOTION_TOKEN });
  }
  return notionClient;
}

// Simple in-memory cache with 5-minute TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.time < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
}

// In-flight request deduplication — prevents duplicate Notion API calls for the same cache key
const inFlight = new Map();

function deduplicatedFetch(cacheKey, fetchFn) {
  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) return Promise.resolve(cached);

  // Check if there's already an in-flight request for this key
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  // Start the fetch and store the promise
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
    const response = await withRetry(() => notion.databases.query({
      database_id: DB.DECISIONS,
      filter: {
        property: 'Date',
        date: { on_or_after: since.toISOString().split('T')[0] },
      },
      sorts: [{ property: 'Date', direction: 'descending' }],
      page_size: 10,
    }));
    return response.results.map(page => ({
      id: page.id,
      ...simplify(page.properties),
    }));
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
        return { id: page.id, ...simplified };
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
  for (const project of projects) {
    // Try common relation property names
    const faIds = project['Focus Area'] || project['Focus Areas'] || project['Focus area'] || [];
    for (const faId of (Array.isArray(faIds) ? faIds : [])) {
      const nid = faId.replace(/-/g, '');
      projectsByFA[nid] = (projectsByFA[nid] || 0) + 1;
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

  for (const c of allCommitments) {
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
      const isActive = c.Status && !['Done', 'Cancelled'].includes(c.Status);
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
  for (const person of people) {
    peopleLookup[person.id.replace(/-/g, '')] = person.Name || 'Unknown';
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

    // Count active commitments assigned to this person
    const personCommitments = allCommitments.filter(c => {
      const assignedIds = c['Assigned To'] || [];
      return Array.isArray(assignedIds) && assignedIds.some(id => id.replace(/-/g, '') === pid);
    });
    const activeCommitments = personCommitments.filter(c =>
      c.Status && !['Done', 'Cancelled'].includes(c.Status)
    );

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

    // Find projects owned by this person
    const personProjects = projects.filter(p => {
      const ownerIds = p.Owner || [];
      return Array.isArray(ownerIds) && ownerIds.some(id => id.replace(/-/g, '') === pid);
    });
    const activeProjects = personProjects.filter(p => p.Status === 'Active');

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
      const fa = focusAreas.find(a => a.id.replace(/-/g, '') === faId);
      if (fa) focusAreaNames.push(fa.Name);
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

  return {
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
async function fetchBlockChildren(blocks, depth = 0) {
  if (depth >= 2) return blocks; // Max recursion depth

  const notion = getClient();
  const enriched = [];

  for (const block of blocks) {
    enriched.push(block);

    if (block.has_children && ['toggle', 'column_list', 'column', 'bulleted_list_item', 'numbered_list_item', 'to_do', 'callout', 'quote', 'synced_block'].includes(block.type)) {
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

        // Recursively fetch grandchildren
        const enrichedChildren = await fetchBlockChildren(children, depth + 1);
        block._children = enrichedChildren;
      } catch (err) {
        console.warn(`Failed to fetch children for block ${block.id}:`, err.message);
      }
    }
  }

  return enriched;
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

module.exports = {
  DB,
  getClient,
  simplify,
  resolveRelations,
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
  listDatabases,
  queryDatabase,
  getPage,
  getPageContent,
  getRelatedPages,
  getKeyPages,
  clearCache,
};
