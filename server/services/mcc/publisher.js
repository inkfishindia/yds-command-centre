'use strict';
/**
 * MCC Publisher - Publish scheduled posts to social platforms
 * 
 * Handles the publishing workflow:
 * 1. scheduled → awaiting-approval (pre-approval)
 * 2. awaiting-approval → publishing (on approval)
 * 3. publishing → published (on success) or failed (on error)
 * 
 * All publishing goes through the approval gate.
 */

const social = require('../social');
const drafter = require('./drafter');
const readModel = require('./read-model');

/**
 * Get stored OAuth token for a platform
 * @param {string} platform - 'instagram' or 'linkedin'
 * @returns {Promise<Object|null>} Token object or null
 * 
 * TODO: Implement actual token retrieval from Notion DB
 *       Currently returns null - needs token DB integration
 */
async function getToken(platform) {
  // TODO: Query Notion token DB for stored tokens
  // This would query the Instagram Tokens or LinkedIn Tokens DB
  // and decrypt using SOCIAL_TOKEN_KEY
  
  console.log('[mcc-publisher] getToken called for:', platform);
  
  // Placeholder - would retrieve from Notion
  return null;
}

/**
 * Store OAuth token for a platform
 * @param {string} platform - 'instagram' or 'linkedin'
 * @param {Object} tokenData - { accessToken, refreshToken, expiresAt }
 * @returns {Promise<boolean>}
 * 
 * TODO: Implement actual token storage in Notion DB
 */
async function storeToken(platform, tokenData) {
  // TODO: Store encrypted token in Notion token DB
  console.log('[mcc-publisher] storeToken called for:', platform, tokenData);
  return true;
}

/**
 * Request approval for publishing a post
 * This is called before actual publishing - sets status to awaiting-approval
 * @param {string} postId - Notion page ID
 * @returns {Promise<Object>} Post with awaiting-approval status
 */
async function requestPublishApproval(postId) {
  const post = await readModel.getPost(postId);
  
  if (!post) {
    throw new Error('Post not found');
  }
  
  if (post.status !== 'scheduled') {
    throw new Error(`Cannot request approval for post in status: ${post.status}`);
  }
  
  // Update status to awaiting-approval
  await drafter.updateStatus(postId, 'awaiting-approval');
  
  return {
    id: postId,
    status: 'awaiting-approval',
    platforms: post.platforms,
    body: post.body,
    mediaUrls: post.mediaUrls,
  };
}

/**
 * Execute the actual publish after approval
 * @param {string} postId - Notion page ID
 * @returns {Promise<Object>} Publish result
 */
async function publish(postId) {
  const post = await readModel.getPost(postId);
  
  if (!post) {
    throw new Error('Post not found');
  }
  
  // Set to publishing status
  await drafter.updateStatus(postId, 'publishing');
  
  const platformPostIds = {};
  const errors = [];
  
  // Publish to each platform
  for (const platform of post.platforms) {
    try {
      const provider = social.getProvider(platform);
      
      if (!provider) {
        errors.push(`${platform}: Unknown provider`);
        continue;
      }
      
      // Get token
      const token = await getToken(platform);
      
      if (!token) {
        errors.push(`${platform}: No OAuth token - please connect in settings`);
        continue;
      }
      
      // Check if token needs refresh
      let accessToken = token.accessToken;
      if (token.expiresAt && new Date(token.expiresAt) <= new Date()) {
        const refreshed = await provider.refreshToken(token.refreshToken);
        accessToken = refreshed.accessToken;
        await storeToken(platform, { ...token, ...refreshed });
      }
      
      // Post to platform
      const result = await provider.post(accessToken, {
        body: post.body,
        mediaUrls: post.mediaUrls,
        mediaType: 'image', // TODO: detect from URL
      });
      
      platformPostIds[platform] = result.platformPostId;
      
      console.log(`[mcc-publisher] Published to ${platform}:`, result.platformPostId);
      
    } catch (err) {
      console.error(`[mcc-publisher] Failed to publish to ${platform}:`, err.message);
      errors.push(`${platform}: ${err.message}`);
    }
  }
  
  // Handle results
  if (errors.length > 0) {
    // Some or all platforms failed
    const someSucceeded = Object.keys(platformPostIds).length > 0;
    
    if (someSucceeded) {
      // Partial success - update with what succeeded
      await drafter.setPlatformPostIds(postId, platformPostIds);
      await drafter.updateStatus(postId, 'published');
      await drafter.setFailureReason(postId, `Partial: ${errors.join('; ')}`);
    } else {
      // Complete failure
      await drafter.updateStatus(postId, 'failed');
      await drafter.setFailureReason(postId, errors.join('; '));
    }
    
    return {
      id: postId,
      status: someSucceeded ? 'published' : 'failed',
      platformPostIds,
      errors,
    };
  }
  
  // All platforms succeeded
  await drafter.setPlatformPostIds(postId, platformPostIds);
  await drafter.updateStatus(postId, 'published');
  
  return {
    id: postId,
    status: 'published',
    platformPostIds,
  };
}

/**
 * Manual publish trigger - publish a scheduled post immediately
 * @param {string} postId - Notion page ID
 * @returns {Promise<Object>} Post ready for approval
 */
async function publishNow(postId) {
  const post = await readModel.getPost(postId);
  
  if (!post) {
    throw new Error('Post not found');
  }
  
  if (post.status !== 'scheduled' && post.status !== 'draft') {
    throw new Error(`Cannot publish now - post status is: ${post.status}`);
  }
  
  // Request approval (sets to awaiting-approval)
  return await requestPublishApproval(postId);
}

/**
 * Run scheduler tick - scan for due posts and trigger publishing
 * This is the manual/cron stub endpoint
 * @returns {Promise<Object>} Tick results
 */
async function runSchedulerTick() {
  const duePosts = await readModel.getDuePosts();
  
  const results = {
    scanned: duePosts.length,
    triggered: 0,
    errors: [],
  };
  
  for (const post of duePosts) {
    try {
      // For each due post, set to awaiting-approval
      // Actual publishing happens on Dan's approval
      await drafter.updateStatus(post.id, 'awaiting-approval');
      results.triggered++;
    } catch (err) {
      results.errors.push({ postId: post.id, error: err.message });
    }
  }
  
  return results;
}

module.exports = {
  getToken,
  storeToken,
  requestPublishApproval,
  publish,
  publishNow,
  runSchedulerTick,
};