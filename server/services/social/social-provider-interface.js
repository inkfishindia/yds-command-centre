'use strict';
/**
 * Social Provider Interface Contract
 * 
 * Each social provider (Instagram, LinkedIn) exports a module with these functions.
 * Pure modules - no classes, no inheritance. JSDoc-typed for documentation.
 * 
 * @typedef {Object} AuthUrlResult
 * @property {string} authUrl - OAuth authorization URL
 * @property {string} state - State parameter for CSRF protection
 * 
 * @typedef {Object} TokenResult
 * @property {string} accessToken - Valid access token
 * @property {string} [refreshToken] - Refresh token if applicable
 * @property {Date} [expiresAt] - Token expiration time
 * 
 * @typedef {Object} PostResult
 * @property {string} platformPostId - Platform-assigned post ID
 * @property {string} [url] - Public URL of the post
 * 
 * @typedef {Object} AnalyticsResult
 * @property {number} [likes] - Like count
 * @property {number} [comments] - Comment count
 * @property {number} [shares] - Share count
 * @property {number} [views] - View count (platform dependent)
 * 
 * @typedef {Object} MediaPayload
 * @property {string} [body] - Post text/caption
 * @property {string[]} [mediaUrls] - Array of media URLs (images/videos)
 * @property {string} [mediaType] - 'image' or 'video'
 */

/**
 * Provider metadata
 * @returns {{ id: string, name: string }}
 */
function getProviderInfo() {
  throw new Error('Not implemented - must be overridden by provider');
}

/**
 * Generate OAuth authorization URL
 * @param {string} redirectUri - Callback URL after OAuth flow
 * @returns {AuthUrlResult}
 */
function login(_redirectUri) {
  throw new Error('Not implemented - must be overridden by provider');
}

/**
 * Refresh an expired access token
 * @param {string} refreshToken - The refresh token
 * @returns {TokenResult}
 */
async function refreshToken(_refreshToken) {
  throw new Error('Not implemented - must be overridden by provider');
}

/**
 * Publish a post to the platform
 * @param {string} accessToken - Valid access token
 * @param {MediaPayload} payload - Post content
 * @returns {PostResult}
 */
async function post(_accessToken, _payload) {
  throw new Error('Not implemented - must be overridden by provider');
}

/**
 * Get analytics for a published post
 * @param {string} accessToken - Valid access token
 * @param {string} platformPostId - Platform post ID
 * @returns {AnalyticsResult}
 */
async function getAnalytics(_accessToken, _platformPostId) {
  throw new Error('Not implemented - must be overridden by provider');
}

module.exports = {
  getProviderInfo,
  login,
  refreshToken,
  post,
  getAnalytics,
};