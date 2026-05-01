'use strict';
// reads/focus-areas.js
// Purpose: Fetch focus areas with health status from the FOCUS_AREAS Notion database.
// Public exports: getFocusAreas
// DO NOT add: writes, cache invalidation, or functions from other domains.
// Dependency: infra leaves only (client, cache, retry, simplify, databases).

const { getClient } = require('../client');
const { deduplicatedFetch } = require('../cache');
const { withRetry } = require('../retry');
const { simplify } = require('../simplify');
const { DB } = require('../databases');

/**
 * Fetch all focus areas with health status
 */
async function getFocusAreas() {
  return deduplicatedFetch('focus_areas', async () => {
    const notion = getClient();
    const response = await withRetry(() => notion.databases.query({
      database_id: DB.FOCUS_AREAS,
      page_size: 20,
    }));
    return response.results.map(page => ({
      id: page.id,
      ...simplify(page.properties),
    }));
  }).catch(err => {
    console.error('Failed to fetch focus areas:', err.message);
    return [];
  });
}

module.exports = { getFocusAreas };
