'use strict';
/**
 * MCC Read Model - Read posts from Notion
 * 
 * Lists posts by status, joins owner/brand information.
 * Uses Notion service via the read-model pattern.
 * 
 * TODO: Replace placeholder DB IDs with actual IDs from notion-hub.md
 *       once Dan creates the MCC Posts database.
 */

// Placeholder - replace with actual DB ID from notion-hub.md after DB creation
const MCC_POSTS_DB_ID = process.env.MCC_POSTS_DB_ID || 'REPLACE_WITH_MCC_POSTS_DB_ID';

const notion = require('../notion');
const { simplify } = require('../notion/simplify');

/**
 * List all posts, optionally filtered by status
 * @param {Object} options - Query options
 * @param {string} [options.status] - Filter by status
 * @param {string} [options.brand] - Filter by brand
 * @param {string} [options.platform] - Filter by platform
 * @param {number} [options.limit=50] - Max results
 * @returns {Promise<Array>} Array of post objects
 */
async function listPosts(options = {}) {
  const { status, brand, platform, limit = 50 } = options;
  
  const filter = {};
  
  if (status) {
    filter.status = { equals: status };
  }
  
  if (brand) {
    filter.brand = { equals: brand };
  }
  
  if (platform) {
    filter.platforms = { contains: platform };
  }
  
  try {
    const response = await notion.queryDatabase(MCC_POSTS_DB_ID, {
      filter: Object.keys(filter).length > 0 ? { and: Object.entries(filter).map(([k, v]) => ({ property: k, [k]: v })) } : undefined,
      page_size: limit,
      sorts: [{ property: 'Scheduled For', direction: 'ascending' }],
    });
    
    if (!response || !response.results) {
      return [];
    }
    
    return response.results.map(page => ({
      id: page.id,
      title: page.properties.Title?.title?.[0]?.plain_text || '',
      body: page.properties.Body?.rich_text?.[0]?.plain_text || '',
      platforms: page.properties.Platforms?.multi_select?.map(s => s.name) || [],
      status: page.properties.Status?.select?.name || 'draft',
      scheduledFor: page.properties['Scheduled For']?.date?.start || null,
      mediaUrls: parseMediaUrls(page.properties['Media URLs']?.rich_text?.[0]?.plain_text || ''),
      owner: page.properties.Owner?.people?.[0]?.name || null,
      brand: page.properties.Brand?.select?.name || null,
      publishedAt: page.properties['Published At']?.date?.start || null,
      platformPostIds: parsePlatformPostIds(page.properties['Platform Post IDs']?.rich_text?.[0]?.plain_text || ''),
      failureReason: page.properties['Failure Reason']?.rich_text?.[0]?.plain_text || null,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
    }));
  } catch (err) {
    console.error('[mcc-read-model] listPosts error:', err.message);
    return [];
  }
}

/**
 * Get a single post by ID
 * @param {string} postId - Notion page ID
 * @returns {Promise<Object|null>} Post object or null
 */
async function getPost(postId) {
  try {
    const page = await notion.getPage(postId);
    if (!page) return null;
    
    const props = simplify(page.properties);
    
    return {
      id: page.id,
      title: props.Title || '',
      body: props.Body || '',
      platforms: props.Platforms || [],
      status: props.Status || 'draft',
      scheduledFor: props['Scheduled For']?.start || null,
      mediaUrls: parseMediaUrls(props['Media URLs'] || ''),
      owner: props.Owner?.[0] || null,
      brand: props.Brand || null,
      publishedAt: props['Published At']?.start || null,
      platformPostIds: parsePlatformPostIds(props['Platform Post IDs'] || ''),
      failureReason: props['Failure Reason'] || null,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
    };
  } catch (err) {
    console.error('[mcc-read-model] getPost error:', err.message);
    return null;
  }
}

/**
 * Get posts grouped by status (for kanban view)
 * @returns {Promise<Object>} Object with status keys and post arrays
 */
async function getPostsByStatus() {
  const posts = await listPosts({ limit: 100 });
  
  const grouped = {
    draft: [],
    scheduled: [],
    'awaiting-approval': [],
    publishing: [],
    published: [],
    failed: [],
  };
  
  for (const post of posts) {
    const status = post.status || 'draft';
    if (grouped[status]) {
      grouped[status].push(post);
    } else {
      grouped.draft.push(post);
    }
  }
  
  return grouped;
}

/**
 * Get posts that are due for publishing (scheduled and past scheduled time)
 * @returns {Promise<Array>} Array of posts ready to publish
 */
async function getDuePosts() {
  const now = new Date().toISOString();
  
  const posts = await listPosts({ status: 'scheduled', limit: 50 });
  
  return posts.filter(post => {
    if (!post.scheduledFor) return false;
    return post.scheduledFor <= now;
  });
}

/**
 * Get count of posts by status
 * @returns {Promise<Object>} Status counts
 */
async function getStatusCounts() {
  const posts = await listPosts({ limit: 200 });
  
  const counts = {
    draft: 0,
    scheduled: 0,
    'awaiting-approval': 0,
    publishing: 0,
    published: 0,
    failed: 0,
  };
  
  for (const post of posts) {
    const status = post.status || 'draft';
    if (counts[status] !== undefined) {
      counts[status]++;
    }
  }
  
  return counts;
}

// Helper functions
function parseMediaUrls(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parsePlatformPostIds(jsonStr) {
  try {
    return JSON.parse(jsonStr);
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
  MCC_POSTS_DB_ID,
};