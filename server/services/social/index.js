'use strict';
/**
 * Social Providers - Public Exports
 * 
 * Provides unified access to social platform integrations.
 * Each provider implements the social-provider-interface contract.
 */

const instagram = require('./instagram');
const linkedin = require('./linkedin');
const { validateMedia, validateMediaBatch } = require('./validate-media');
const constraints = require('./media-constraints.json');

// Provider registry
const providers = {
  instagram,
  linkedin,
};

/**
 * Get a provider by platform ID
 * @param {string} platformId - 'instagram' or 'linkedin'
 * @returns {Object|undefined}
 */
function getProvider(platformId) {
  return providers[platformId];
}

/**
 * List all available platforms
 * @returns {Array<{id: string, name: string}>}
 */
function listPlatforms() {
  return Object.values(providers).map(p => p.getProviderInfo());
}

/**
 * Get media constraints for a platform
 * @param {string} platformId 
 * @returns {Object|undefined}
 */
function getConstraints(platformId) {
  return constraints[platformId];
}

module.exports = {
  instagram,
  linkedin,
  getProvider,
  listPlatforms,
  validateMedia,
  validateMediaBatch,
  getConstraints,
  constraints,
};