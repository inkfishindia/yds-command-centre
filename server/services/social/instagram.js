'use strict';
/**
 * Instagram Graph API Provider
 * 
 * Implements social-provider-interface for Instagram.
 * Uses Facebook Login flow via Instagram Graph API.
 * 
 * Phase 1: Stub implementation - OAuth flow works, posting is simulated
 * Phase 2+: Real API integration with Instagram Graph API
 */

const crypto = require('crypto');

// Provider metadata
function getProviderInfo() {
  return { id: 'instagram', name: 'Instagram' };
}

// OAuth configuration - these would come from env in production
const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || '';
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET || '';

/**
 * Generate OAuth authorization URL for Instagram
 * @param {string} redirectUri - Callback URL after OAuth flow
 * @returns {{ authUrl: string, state: string }}
 */
function login(redirectUri) {
  const state = crypto.randomBytes(16).toString('hex');
  
  // Instagram uses Facebook OAuth - scope for Instagram Graph API
  const scope = 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish';
  
  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  authUrl.searchParams.set('client_id', INSTAGRAM_APP_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_type', 'code');
  
  return { authUrl: authUrl.toString(), state };
}

/**
 * Exchange authorization code for access token
 * Note: This is called by the OAuth callback handler, not directly
 * @param {string} code - Authorization code from OAuth callback
 * @param {string} redirectUri - The redirect URI used in login()
 * @returns {{ accessToken: string, refreshToken?: string, expiresAt?: Date }}
 */
async function exchangeCodeForToken(_code, _redirectUri) {
  // In production, this would make a real API call to Facebook OAuth
  // POST https://graph.facebook.com/v18.0/oauth/access_token
  //   client_id, client_secret, code, redirect_uri
  
  // For Phase 1, return a placeholder - real implementation needs credentials
  if (!INSTAGRAM_APP_ID || !INSTAGRAM_APP_SECRET) {
    throw new Error('Instagram OAuth not configured - set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET env vars');
  }
  
  // Placeholder - would be real token exchange in production
  return {
    accessToken: 'instagram_placeholder_token_' + Date.now(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  };
}

/**
 * Refresh an expired access token
 * @param {string} refreshToken - The refresh token (or access token for short-lived)
 * @returns {{ accessToken: string, expiresAt: Date }}
 */
async function refreshToken(_refreshToken) {
  // In production: POST to https://graph.facebook.com/v18.0/access_token
  // with grant_type=fb_exchange_token and client credentials
  
  // For Phase 1, return a refreshed token
  return {
    accessToken: 'instagram_refreshed_token_' + Date.now(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  };
}

/**
 * Publish a post to Instagram
 * @param {string} accessToken - Valid access token
 * @param {Object} payload - Post content
 * @param {string} [payload.body] - Post caption
 * @param {string[]} [payload.mediaUrls] - Image/video URLs
 * @param {string} [payload.mediaType] - 'image' or 'video'
 * @returns {{ platformPostId: string, url: string }}
 */
async function post(_accessToken, _payload) {
  // In production, this would call Instagram Graph API:
  // POST https://graph.instagram.com/{ig-user-id}/media
  //   image_url or video_url, caption, access_token
  // Then POST {ig-user-id}/media_publish to publish
  
  // Phase 1: Simulate successful post
  const platformPostId = 'ig_' + crypto.randomBytes(8).toString('hex');
  
  // Return mock URL - in production would be real post URL
  const url = `https://instagram.com/p/${platformPostId}`;
  
  return { platformPostId, url };
}

/**
 * Get analytics for an Instagram post
 * @param {string} accessToken - Valid access token
 * @param {string} platformPostId - Instagram media ID
 * @returns {{ likes: number, comments: number, shares: number, views: number }}
 */
async function getAnalytics(_accessToken, _platformPostId) {
  // In production: GET https://graph.instagram.com/{media-id}
  //   fields=like_count,comments_count,share_count,insights
  
  // Phase 1: Return stub analytics
  return {
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0,
  };
}

/**
 * Get the Instagram Business Account ID associated with the access token
 * @param {string} accessToken - Valid access token
 * @returns {string} Instagram Business Account ID
 */
async function getInstagramAccountId(_accessToken) {
  // GET https://graph.facebook.com/me/accounts?fields=instagram_business_account
  // This would return the associated Instagram Business Account
  
  return 'ig_account_placeholder';
}

module.exports = {
  getProviderInfo,
  login,
  exchangeCodeForToken,
  refreshToken,
  post,
  getAnalytics,
  getInstagramAccountId,
};