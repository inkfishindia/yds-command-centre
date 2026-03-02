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
 * Simplify Notion properties to plain values
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
        result[key] = prop.date ? prop.date.start : null;
        break;
      case 'relation':
        result[key] = prop.relation.map(r => r.id);
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
      default:
        result[key] = null;
    }
  }
  return result;
}

/**
 * Fetch all focus areas with health status
 */
async function getFocusAreas() {
  const cached = getCached('focus_areas');
  if (cached) return cached;

  try {
    const notion = getClient();
    const response = await notion.databases.query({
      database_id: DB.FOCUS_AREAS,
      page_size: 20,
    });

    const areas = response.results.map(page => ({
      id: page.id,
      ...simplify(page.properties),
    }));

    setCache('focus_areas', areas);
    return areas;
  } catch (err) {
    console.error('Failed to fetch focus areas:', err.message);
    return [];
  }
}

/**
 * Fetch commitments with optional filters
 */
async function getCommitments(filter) {
  const cacheKey = `commitments_${JSON.stringify(filter || {})}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const notion = getClient();
    const params = {
      database_id: DB.COMMITMENTS,
      page_size: 50,
    };
    if (filter) params.filter = filter;

    const response = await notion.databases.query(params);
    const commitments = response.results.map(page => ({
      id: page.id,
      ...simplify(page.properties),
    }));

    setCache(cacheKey, commitments);
    return commitments;
  } catch (err) {
    console.error('Failed to fetch commitments:', err.message);
    return [];
  }
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
 * Fetch recent decisions (last N days)
 */
async function getRecentDecisions(days = 30) {
  const cached = getCached(`decisions_${days}`);
  if (cached) return cached;

  try {
    const notion = getClient();
    const since = new Date();
    since.setDate(since.getDate() - days);

    const response = await notion.databases.query({
      database_id: DB.DECISIONS,
      sorts: [{ property: 'Date', direction: 'descending' }],
      page_size: 10,
    });

    const decisions = response.results.map(page => ({
      id: page.id,
      ...simplify(page.properties),
    }));

    setCache(`decisions_${days}`, decisions);
    return decisions;
  } catch (err) {
    console.error('Failed to fetch decisions:', err.message);
    return [];
  }
}

/**
 * Fetch people (team roster)
 */
async function getPeople() {
  const cached = getCached('people');
  if (cached) return cached;

  try {
    const notion = getClient();
    const response = await notion.databases.query({
      database_id: DB.PEOPLE,
      page_size: 30,
    });

    const people = response.results.map(page => ({
      id: page.id,
      ...simplify(page.properties),
    }));

    setCache('people', people);
    return people;
  } catch (err) {
    console.error('Failed to fetch people:', err.message);
    return [];
  }
}

/**
 * Get dashboard summary data
 */
async function getDashboardSummary() {
  const [focusAreas, overdue, decisions, people] = await Promise.all([
    getFocusAreas(),
    getOverdueCommitments(),
    getRecentDecisions(7),
    getPeople(),
  ]);

  return {
    focusAreas,
    overdue,
    recentDecisions: decisions,
    people,
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
  const cacheKey = `db_${dbId}_${JSON.stringify({ filter, sorts, startCursor })}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const notion = getClient();
    const params = { database_id: dbId, page_size: pageSize };
    if (filter) params.filter = filter;
    if (sorts) params.sorts = sorts;
    if (startCursor) params.start_cursor = startCursor;

    const response = await notion.databases.query(params);
    const result = {
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

    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error(`Failed to query database ${dbId}:`, err.message);
    return { results: [], hasMore: false, nextCursor: null };
  }
}

/**
 * Get a single page's properties
 */
async function getPage(pageId) {
  const cacheKey = `page_${pageId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const notion = getClient();
    const page = await notion.pages.retrieve({ page_id: pageId });
    const result = {
      id: page.id,
      url: page.url,
      created: page.created_time,
      updated: page.last_edited_time,
      properties: simplify(page.properties),
    };

    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error(`Failed to get page ${pageId}:`, err.message);
    return null;
  }
}

/**
 * Get a page's block children (content) and convert to markdown
 */
async function getPageContent(pageId) {
  const cacheKey = `blocks_${pageId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const notion = getClient();
    const blocks = [];
    let cursor;

    // Paginate through all blocks
    do {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100,
        start_cursor: cursor,
      });
      blocks.push(...response.results);
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    const markdown = blocksToMarkdown(blocks);
    const result = { blocks: blocks.length, markdown };

    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error(`Failed to get blocks for ${pageId}:`, err.message);
    return { blocks: 0, markdown: '' };
  }
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
        lines.push(`# ${richTextToPlain(block.heading_1.rich_text)}`);
        lines.push('');
        break;
      case 'heading_2':
        lines.push(`## ${richTextToPlain(block.heading_2.rich_text)}`);
        lines.push('');
        break;
      case 'heading_3':
        lines.push(`### ${richTextToPlain(block.heading_3.rich_text)}`);
        lines.push('');
        break;
      case 'bulleted_list_item':
        lines.push(`- ${richTextToPlain(block.bulleted_list_item.rich_text)}`);
        break;
      case 'numbered_list_item':
        lines.push(`1. ${richTextToPlain(block.numbered_list_item.rich_text)}`);
        break;
      case 'to_do':
        lines.push(`- [${block.to_do.checked ? 'x' : ' '}] ${richTextToPlain(block.to_do.rich_text)}`);
        break;
      case 'toggle':
        lines.push(`<details><summary>${richTextToPlain(block.toggle.rich_text)}</summary></details>`);
        lines.push('');
        break;
      case 'code':
        lines.push(`\`\`\`${block.code.language || ''}`);
        lines.push(richTextToPlain(block.code.rich_text));
        lines.push('```');
        lines.push('');
        break;
      case 'quote':
        lines.push(`> ${richTextToPlain(block.quote.rich_text)}`);
        lines.push('');
        break;
      case 'callout':
        lines.push(`> ${block.callout.icon?.emoji || ''} ${richTextToPlain(block.callout.rich_text)}`);
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
        lines.push(`[Bookmark](${block.bookmark.url || ''})`);
        lines.push('');
        break;
      case 'image':
        const imgUrl = block.image.type === 'file' ? block.image.file.url : block.image.external?.url || '';
        lines.push(`![Image](${imgUrl})`);
        lines.push('');
        break;
      case 'child_database':
        lines.push(`**[Database: ${block.child_database.title}]**`);
        lines.push('');
        break;
      case 'child_page':
        lines.push(`**[Page: ${block.child_page.title}]**`);
        lines.push('');
        break;
      case 'column_list':
      case 'column':
        // Skip structural blocks
        break;
      default:
        // Unknown block type — show type name
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
    if (t.annotations?.bold) text = `**${text}**`;
    if (t.annotations?.italic) text = `*${text}*`;
    if (t.annotations?.code) text = `\`${text}\``;
    if (t.annotations?.strikethrough) text = `~~${text}~~`;
    if (t.href) text = `[${text}](${t.href})`;
    return text;
  }).join('');
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
  getFocusAreas,
  getCommitments,
  getOverdueCommitments,
  getRecentDecisions,
  getPeople,
  getDashboardSummary,
  listDatabases,
  queryDatabase,
  getPage,
  getPageContent,
  getKeyPages,
  clearCache,
};
