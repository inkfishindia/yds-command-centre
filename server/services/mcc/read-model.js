'use strict';
/**
 * MCC Read Model — Read MCC posts from Content Calendar (Decision #102)
 *
 * MCC posts live in CONTENT_CALENDAR. Field mapping from old MCC schema to
 * Content Calendar properties is documented in FILE-MAP.md.
 *
 * Status vocabulary: Content Calendar statuses are used directly.
 * MCC status groups for backward compat:
 *   "draft"             → Drafted
 *   "scheduled"         → Scheduled
 *   "awaiting-approval" → Brand Review
 *   "published"         → Published
 */

const { DB } = require('../notion/databases');
const notion = require('../notion');
const { simplify } = require('../notion/simplify');

/**
 * List posts, optionally filtered.
 * @param {Object} options
 * @param {string} [options.status] - Content Calendar status (e.g. 'Drafted', 'Scheduled')
 *   OR MCC internal shorthand (e.g. 'draft' → 'Drafted')
 * @param {string} [options.platform] - ignored (Content Type is single-select now)
 * @param {number} [options.limit=50]
 * @returns {Promise<Array>}
 */
async function listPosts(options = {}) {
  const { status, limit = 50 } = options;

  // Normalise status: MCC internal → Content Calendar
  const STATUS_MAP = {
    draft: 'Drafted',
    scheduled: 'Scheduled',
    'awaiting-approval': 'Brand Review',
    publishing: 'Brand Review',
    published: 'Published',
    failed: 'Brand Review',
  };
  const ccStatus = STATUS_MAP[status] || status;

  const filter = ccStatus
    ? { property: 'Status', select: { equals: ccStatus } }
    : undefined;

  try {
    const response = await notion.queryDatabase(DB.CONTENT_CALENDAR, {
      filter,
      pageSize: limit,
      sorts: [{ property: 'Publish Date', direction: 'ascending' }],
    });

    if (!response || !response.results) return [];

    return response.results.map(mapPageToPost);
  } catch (err) {
    console.error('[mcc-read-model] listPosts error:', err.message);
    return [];
  }
}

/**
 * Get a single post by Notion page ID.
 * @param {string} postId
 * @returns {Promise<Object|null>}
 */
async function getPost(postId) {
  try {
    const page = await notion.getPage(postId);
    if (!page) return null;

    const props = simplify(page.properties);
    return {
      id: page.id,
      title: props.Name || props.Title || '',
      body: props['Caption / Copy'] || '',
      contentType: props['Content Type'] || null,
      platforms: props['Content Type'] ? [props['Content Type']] : [],
      status: props.Status || 'Drafted',
      scheduledFor: props['Publish Date'] ? (typeof props['Publish Date'] === 'object' ? props['Publish Date'].start : props['Publish Date']) : null,
      mediaUrls: parseJsonArray(props['Media URLs'] || ''),
      audienceSegment: Array.isArray(props['Audience Segment']) ? props['Audience Segment'] : [],
      publishedAt: props['Publish Date'] ? (typeof props['Publish Date'] === 'object' ? props['Publish Date'].start : props['Publish Date']) : null,
      platformPostIds: parseJsonObj(props['Platform Post IDs'] || ''),
      failureReason: props['Brand Review Notes'] || null,
      hashtags: props.Hashtags || '',
      trackingUrl: props['Tracking URL'] || null,
      contentSeries: props['Content Series'] || null,
      cta: props.CTA || null,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
    };
  } catch (err) {
    console.error('[mcc-read-model] getPost error:', err.message);
    return null;
  }
}

/**
 * Map a raw queryDatabase result page to the MCC post shape.
 * queryDatabase results have already gone through simplify() in databases.js.
 */
function mapPageToPost(page) {
  // page already has id, url, created, updated, and simplified properties spread on it
  const publishDate = page['Publish Date'];
  const publishDateStr = publishDate && typeof publishDate === 'object' ? publishDate.start : (publishDate || null);

  return {
    id: page.id,
    title: page.Name || page.Title || '',
    body: page['Caption / Copy'] || '',
    contentType: page['Content Type'] || null,
    platforms: page['Content Type'] ? [page['Content Type']] : [],
    status: page.Status || 'Drafted',
    scheduledFor: publishDateStr,
    mediaUrls: parseJsonArray(page['Media URLs'] || ''),
    audienceSegment: Array.isArray(page['Audience Segment']) ? page['Audience Segment'] : [],
    publishedAt: publishDateStr,
    platformPostIds: parseJsonObj(page['Platform Post IDs'] || ''),
    failureReason: page['Brand Review Notes'] || null,
    hashtags: page.Hashtags || '',
    trackingUrl: page['Tracking URL'] || null,
    contentSeries: page['Content Series'] || null,
    cta: page.CTA || null,
    createdTime: page.created || page.created_time || null,
    lastEditedTime: page.updated || page.last_edited_time || null,
  };
}

/**
 * Get posts grouped by status (for kanban view).
 * Returns Content Calendar status keys.
 */
async function getPostsByStatus() {
  const posts = await listPosts({ limit: 100 });

  const grouped = {
    Drafted: [],
    Scheduled: [],
    'Brand Review': [],
    Published: [],
    Approved: [],
    Idea: [],
    Briefed: [],
    'In Design': [],
  };

  for (const post of posts) {
    const status = post.status || 'Drafted';
    if (grouped[status] !== undefined) {
      grouped[status].push(post);
    } else {
      grouped.Drafted.push(post);
    }
  }

  return grouped;
}

/**
 * Get posts past their Publish Date with status Scheduled.
 * @returns {Promise<Array>}
 */
async function getDuePosts() {
  const now = new Date().toISOString().split('T')[0];
  const posts = await listPosts({ status: 'scheduled', limit: 50 });
  return posts.filter(post => post.scheduledFor && post.scheduledFor <= now);
}

/**
 * Get count of posts by status.
 * @returns {Promise<Object>}
 */
async function getStatusCounts() {
  const posts = await listPosts({ limit: 200 });

  const counts = {};
  for (const post of posts) {
    const status = post.status || 'Drafted';
    counts[status] = (counts[status] || 0) + 1;
  }

  return counts;
}

// Helpers
function parseJsonArray(str) {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObj(str) {
  try {
    return JSON.parse(str) || {};
  } catch {
    return {};
  }
}

module.exports = {
  listPosts,
  getPost,
  getPostsByStatus,
  getDuePosts,
  getStatusCounts,
};
