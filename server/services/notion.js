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

/**
 * Fetch people (team roster)
 */
async function getPeople() {
  return deduplicatedFetch('people', async () => {
    const notion = getClient();
    const response = await withRetry(() => notion.databases.query({
      database_id: DB.PEOPLE,
      page_size: 30,
    }));
    return response.results.map(page => ({
      id: page.id,
      ...simplify(page.properties),
    }));
  }).catch(err => {
    console.error('Failed to fetch people:', err.message);
    return [];
  });
}

/**
 * Fetch all projects with Focus Area relations
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
 * Fetch all commitments (for counts per focus area)
 */
async function getAllCommitments() {
  return deduplicatedFetch('all_commitments', async () => {
    const notion = getClient();
    const commitments = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.COMMITMENTS,
        page_size: 100,
        start_cursor: cursor,
      }));
      commitments.push(...response.results.map(page => ({
        id: page.id,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);
    return commitments;
  }).catch(err => {
    console.error('Failed to fetch all commitments:', err.message);
    return [];
  });
}

/**
 * Get dashboard summary data with health distribution and counts
 */
async function getDashboardSummary() {
  const [focusAreas, overdue, decisions, people, projects, allCommitments] = await Promise.all([
    getFocusAreas(),
    getOverdueCommitments(),
    getRecentDecisions(7),
    getPeople(),
    getProjects(),
    getAllCommitments(),
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

  // Enrich focus areas
  const enrichedFocusAreas = focusAreas.map(area => ({
    ...area,
    projectCount: projectsByFA[area.id.replace(/-/g, '')] || 0,
    commitmentCount: commitmentsByFA[area.id.replace(/-/g, '')] || 0,
  }));

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

  return {
    focusAreas: enrichedFocusAreas,
    overdue: enrichedOverdue,
    recentDecisions: decisions,
    people,
    healthDistribution,
    timestamp: new Date().toISOString(),
  };
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
 * Get a single page's properties
 */
async function getPage(pageId) {
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
              const relPage = await getPage(relId);
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
  getFocusAreas,
  getCommitments,
  getOverdueCommitments,
  getUpcomingCommitments,
  getRecentDecisions,
  getPeople,
  getProjects,
  getAllCommitments,
  getDashboardSummary,
  listDatabases,
  queryDatabase,
  getPage,
  getPageContent,
  getRelatedPages,
  getKeyPages,
  clearCache,
};
