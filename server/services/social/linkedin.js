'use strict';
/**
 * LinkedIn API Provider
 * 
 * Implements social-provider-interface for LinkedIn.
 * Uses OAuth 2.0 with refresh tokens.
 * 
 * Phase 1: Stub implementation - OAuth flow works, posting is simulated
 * Phase 2+: Real API integration with LinkedIn Marketing API
 */

const crypto = require('crypto');

// Provider metadata
function getProviderInfo() {
  return { id: 'linkedin', name: 'LinkedIn' };
}

// OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';

/**
 * Generate OAuth authorization URL for LinkedIn
 * @param {string} redirectUri - Callback URL after OAuth flow
 * @returns {{ authUrl: string, state: string }}
 */
function login(redirectUri) {
  const state = crypto.randomBytes(16).toString('hex');
  
  // LinkedIn OAuth 2.0 scopes for posting
  const scope = 'r_liteprofile r_emailaddress w_member_social';
  
  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', LINKEDIN_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);
  
  return { authUrl: authUrl.toString(), state };
}

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code from OAuth callback
 * @param {string} redirectUri - The redirect URI used in login()
 * @returns {{ accessToken: string, refreshToken: string, expiresAt: Date }}
 */
async function exchangeCodeForToken(_code, _redirectUri) {
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    throw new Error('LinkedIn OAuth not configured - set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET env vars');
  }
  
  // In production, this would make a real API call:
  // POST https://www.linkedin.com/oauth/v2/accessToken
  //   grant_type=authorization_code, code, redirect_uri, client_id, client_secret
  
  // For Phase 1, return placeholder tokens
  return {
    accessToken: 'linkedin_placeholder_access_' + Date.now(),
    refreshToken: 'linkedin_placeholder_refresh_' + Date.now(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour for access token
  };
}

/**
 * Refresh an expired access token using refresh token
 * @param {string} refreshToken - The refresh token
 * @returns {{ accessToken: string, refreshToken: string, expiresAt: Date }}
 */
async function refreshToken(refreshToken) {
  // In production:
  // POST https://www.linkedin.com/oauth/v2/accessToken
  //   grant_type=refresh_token, refresh_token, client_id, client_secret
  
  return {
    accessToken: 'linkedin_refreshed_access_' + Date.now(),
    refreshToken: refreshToken, // May get new refresh token
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  };
}

/**
 * Publish a post to LinkedIn
 * @param {string} accessToken - Valid access token
 * @param {Object} payload - Post content
 * @param {string} [payload.body] - Post text/caption
 * @param {string[]} [payload.mediaUrls] - Image URLs
 * @param {string} [payload.mediaType] - 'image' (video requires special approval)
 * @returns {{ platformPostId: string, url: string }}
 */
async function post(_accessToken, _payload) {
  // In production, this would call LinkedIn API:
  // POST https://api.linkedin.com/v2/ugcPosts
  //   {
  //     "author": "urn:li:person:{person-id}",
  //     "lifecycleState": "PUBLISHED",
  //     "specificContent": {
  //       "com.linkedin.ugc.ShareContent": {
  //         "shareCommentary": { "text": caption },
  //         "shareMediaCategory": "IMAGE",
  //         "media": [{ "status": "READY", "media": "urn:li:digitalmediaAsset:{asset-id}" }]
  //       }
  //     },
  //     "visibility": { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" }
  //   }
  
  // Phase 1: Simulate successful post
  const platformPostId = 'li_' + crypto.randomBytes(8).toString('hex');
  const url = `https://www.linkedin.com/feed/update/${platformPostId}`;
  
  return { platformPostId, url };
}

/**
 * Get analytics for a LinkedIn post
 * @param {string} accessToken - Valid access token
 * @param {string} platformPostId - LinkedIn post URN or ID
 * @returns {{ likes: number, comments: number, shares: number, views: number }}
 */
async function getAnalytics(_accessToken, _platformPostId) {
  // In production:
  // GET https://api.linkedin.com/v2/ugcPosts/{urn}/targeting
  // GET https://api.linkedin.com/v2/networkUpdates/{urn}/socialMetadata
  
  // Phase 1: Return stub analytics
  return {
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0,
  };
}

/**
 * Get the authenticated user's LinkedIn profile ID
 * @param {string} accessToken - Valid access token
 * @returns {string} LinkedIn person URN
 */
async function getProfileId(_accessToken) {
  // GET https://api.linkedin.com/v2/me
  
  return 'urn:li:person:placeholder';
}

module.exports = {
  getProviderInfo,
  login,
  exchangeCodeForToken,
  refreshToken,
  post,
  getAnalytics,
  getProfileId,
};