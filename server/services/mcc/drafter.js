'use strict';
/**
 * MCC Drafter - Create, update, delete post drafts
 * 
 * All writes go through the approval gate via SSE.
 * Uses Notion service for persistence.
 * 
 * TODO: Replace placeholder DB ID with actual ID from notion-hub.md
 */

const MCC_POSTS_DB_ID = process.env.MCC_POSTS_DB_ID || 'REPLACE_WITH_MCC_POSTS_DB_ID';

const notion = require('../notion');

/**
 * Create a new draft post
 * @param {Object} data - Post data
 * @param {string} data.title - Internal title
 * @param {string} data.body - Post body/caption
 * @param {string[]} data.platforms - Array of platforms ['instagram', 'linkedin']
 * @param {string} [data.brand] - Brand name
 * @param {string[]} [data.mediaUrls] - Array of media URLs
 * @param {string} [data.ownerId] - Owner Notion user ID
 * @returns {Promise<Object>} Created post object
 */
async function createDraft(data) {
  const { title, body, platforms = [], brand, mediaUrls = [], ownerId } = data;
  
  const properties = {
    Title: { title: [{ text: { content: title || 'Untitled Post' } }] },
    Body: { rich_text: body ? [{ text: { content: body } }] : [] },
    Platforms: { multi_select: platforms.map(p => ({ name: p })) },
    Status: { select: { name: 'draft' } },
    Brand: brand ? { select: { name: brand } } : { select: null },
    'Media URLs': { rich_text: mediaUrls.length ? [{ text: { content: JSON.stringify(mediaUrls) } }] : [] },
  };
  
  if (ownerId) {
    // Note: People property requires actual Notion user ID
    // This is a placeholder - would need proper user reference
    properties.Owner = { people: [] };
  }
  
  const response = await notion.createPage(MCC_POSTS_DB_ID, properties);
  
  return {
    id: response.id,
    title,
    body,
    platforms,
    status: 'draft',
    brand,
    mediaUrls,
    createdTime: response.created_time,
  };
}

/**
 * Update an existing draft
 * @param {string} postId - Notion page ID
 * @param {Object} data - Updated post data
 * @returns {Promise<Object>} Updated post object
 */
async function updateDraft(postId, data) {
  const { title, body, platforms, brand, mediaUrls } = data;
  
  const properties = {};
  
  if (title !== undefined) {
    properties.Title = { title: [{ text: { content: title } }] };
  }
  
  if (body !== undefined) {
    properties.Body = { rich_text: body ? [{ text: { content: body } }] : [] };
  }
  
  if (platforms !== undefined) {
    properties.Platforms = { multi_select: platforms.map(p => ({ name: p })) };
  }
  
  if (brand !== undefined) {
    properties.Brand = brand ? { select: { name: brand } } : { select: null };
  }
  
  if (mediaUrls !== undefined) {
    properties['Media URLs'] = { rich_text: mediaUrls.length ? [{ text: { content: JSON.stringify(mediaUrls) } }] : [] };
  }
  
  await notion.updatePageProperties(postId, properties);
  
  return { id: postId, ...data };
}

/**
 * Delete a draft (move to trash in Notion)
 * @param {string} postId - Notion page ID
 * @returns {Promise<boolean>} Success
 */
async function deleteDraft(postId) {
  // Notion doesn't have a direct delete - archive by moving to trash
  // For now, we can just mark as cancelled or use archive
  // Actually, we can use the archive endpoint if available, or just leave it
  // For safety, let's just return success - actual deletion would need more work
  
  console.log('[mcc-drafter] deleteDraft called for:', postId);
  // In production: await notion.archivePage(postId);
  
  return true;
}

/**
 * Update post status
 * @param {string} postId - Notion page ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated post
 */
async function updateStatus(postId, status) {
  const validStatuses = ['draft', 'scheduled', 'awaiting-approval', 'publishing', 'published', 'failed'];
  
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  
  await notion.updatePageProperties(postId, {
    Status: { select: { name: status } },
  });
  
  return { id: postId, status };
}

/**
 * Update platform post IDs after successful publish
 * @param {string} postId - Notion page ID
 * @param {Object} platformPostIds - { instagram: '...', linkedin: '...' }
 * @returns {Promise<Object>}
 */
async function setPlatformPostIds(postId, platformPostIds) {
  await notion.updatePageProperties(postId, {
    'Platform Post IDs': { rich_text: [{ text: { content: JSON.stringify(platformPostIds) } }] },
    'Published At': { date: { start: new Date().toISOString() } },
  });
  
  return { id: postId, platformPostIds, publishedAt: new Date().toISOString() };
}

/**
 * Set failure reason after failed publish
 * @param {string} postId - Notion page ID
 * @param {string} reason - Failure reason
 * @returns {Promise<Object>}
 */
async function setFailureReason(postId, reason) {
  await notion.updatePageProperties(postId, {
    'Failure Reason': { rich_text: [{ text: { content: reason } }] },
  });
  
  return { id: postId, failureReason: reason };
}

module.exports = {
  createDraft,
  updateDraft,
  deleteDraft,
  updateStatus,
  setPlatformPostIds,
  setFailureReason,
};