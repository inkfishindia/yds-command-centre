'use strict';
/**
 * Marketing Log Service
 *
 * Read + write helpers for the Marketing Log DB (Hub B).
 * Captures observations, ideas, decisions, data points by Area/Type/Tags.
 *
 * DB: DB.MARKETING_LOG (3ca17008a2994dcfa662300438a9e295)
 * Decision: #102 (Phase B backend wiring)
 */

const notion = require('./notion');
const { DB } = require('./notion/databases');
const { getClient } = require('./notion/client');
const { withRetry } = require('./notion/retry');
const { cache } = require('./notion/cache');

const CACHE_KEY_PREFIX = 'marketing_log_';

// ── Validation constants ──────────────────────────────────────────────────────

const VALID_AREAS = ['Google Ads', 'Meta Ads', 'Email', 'WhatsApp', 'Website', 'SEO', 'Brand', 'Product', 'Team', 'General'];
const VALID_TYPES = ['Observation', 'Idea', 'Decision', 'Data Point', 'Feedback', 'Task', 'Question'];
const VALID_TAGS = ['urgent', 'follow-up', 'share-with-team', 'data', 'creative', 'budget', 'competitor'];
const VALID_PRIORITIES = ['High', 'Medium', 'Low'];
const VALID_STATUSES = ['Logged', 'Actioned', 'Shared', 'Archived'];

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * List Marketing Log entries, most recent first.
 * @param {Object} opts
 * @param {string} [opts.area] - filter by Area
 * @param {string} [opts.type] - filter by Type
 * @param {string} [opts.tag] - filter by a single Tag
 * @param {string} [opts.status] - filter by Status (default: no filter)
 * @param {number} [opts.limit=50]
 * @returns {Promise<{ entries: Array, total: number }>}
 */
async function listEntries(opts = {}) {
  const { area, type, tag, status, limit = 50 } = opts;

  const filters = [];

  if (area) {
    filters.push({ property: 'Area', select: { equals: area } });
  }
  if (type) {
    filters.push({ property: 'Type', select: { equals: type } });
  }
  if (tag) {
    filters.push({ property: 'Tags', multi_select: { contains: tag } });
  }
  if (status) {
    filters.push({ property: 'Status', select: { equals: status } });
  }

  const filter = filters.length === 1
    ? filters[0]
    : filters.length > 1
      ? { and: filters }
      : undefined;

  try {
    const response = await notion.queryDatabase(DB.MARKETING_LOG, {
      filter,
      pageSize: limit,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    });

    if (!response || !response.results) return { entries: [], total: 0 };

    const entries = response.results.map(row => ({
      id: row.id,
      note: row.Note || row.Name || row.Title || '',
      area: row.Area || null,
      type: row.Type || null,
      tags: Array.isArray(row.Tags) ? row.Tags : [],
      priority: row.Priority || 'Medium',
      status: row.Status || 'Logged',
      createdTime: row.created || null,
    }));

    return { entries, total: entries.length };
  } catch (err) {
    console.error('[marketing-log] listEntries error:', err.message);
    return { entries: [], total: 0 };
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Create a new Marketing Log entry.
 * @param {Object} data
 * @param {string} data.note - required, maps to Note (title)
 * @param {string} [data.area]
 * @param {string} [data.type]
 * @param {string[]} [data.tags]
 * @param {string} [data.priority='Medium']
 * @returns {Promise<{ id: string, url: string }>}
 */
async function createEntry(data) {
  const { note, area, type, tags = [], priority = 'Medium' } = data;

  if (!note || typeof note !== 'string' || note.trim().length === 0) {
    throw new Error('note is required');
  }

  if (area && !VALID_AREAS.includes(area)) {
    throw new Error(`Invalid area: ${area}. Allowed: ${VALID_AREAS.join(', ')}`);
  }

  if (type && !VALID_TYPES.includes(type)) {
    throw new Error(`Invalid type: ${type}. Allowed: ${VALID_TYPES.join(', ')}`);
  }

  if (!Array.isArray(tags)) {
    throw new Error('tags must be an array');
  }

  const invalidTags = tags.filter(t => !VALID_TAGS.includes(t));
  if (invalidTags.length > 0) {
    throw new Error(`Invalid tag(s): ${invalidTags.join(', ')}. Allowed: ${VALID_TAGS.join(', ')}`);
  }

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    throw new Error(`Invalid priority: ${priority}. Allowed: ${VALID_PRIORITIES.join(', ')}`);
  }

  const properties = {
    Note: { title: [{ text: { content: note.trim() } }] },
    Status: { select: { name: 'Logged' } },
  };

  if (area) properties.Area = { select: { name: area } };
  if (type) properties.Type = { select: { name: type } };
  if (tags.length > 0) properties.Tags = { multi_select: tags.map(t => ({ name: t })) };
  if (priority) properties.Priority = { select: { name: priority } };

  const notionClient = getClient();
  const result = await withRetry(() => notionClient.pages.create({
    parent: { database_id: DB.MARKETING_LOG },
    properties,
  }));

  // Invalidate any cached list results
  for (const [key] of cache) {
    if (key.startsWith(CACHE_KEY_PREFIX)) cache.delete(key);
  }

  return { id: result.id, url: result.url };
}

module.exports = {
  listEntries,
  createEntry,
  // exposed for route validation
  VALID_AREAS,
  VALID_TYPES,
  VALID_TAGS,
  VALID_PRIORITIES,
  VALID_STATUSES,
};
