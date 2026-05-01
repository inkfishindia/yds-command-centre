'use strict';
// reads/people.js
// Purpose: Fetch real human team members from the PEOPLE Notion database, filtering out AI expert panel.
// Public exports: getPeople
// DO NOT add: writes, AI team reads (those live in ai-team.js), or functions from other domains.
// Dependency: infra leaves only (client, cache, retry, simplify, databases — including AI_EXPERT_IDS).

const { getClient } = require('../client');
const { deduplicatedFetch } = require('../cache');
const { withRetry } = require('../retry');
const { simplify } = require('../simplify');
const { DB, AI_EXPERT_IDS } = require('../databases');

/**
 * Fetch people (real humans only — filters out AI expert panel by page ID).
 */
async function getPeople() {
  return deduplicatedFetch('people', async () => {
    const notion = getClient();
    const response = await withRetry(() => notion.databases.query({
      database_id: DB.PEOPLE,
      page_size: 30,
    }));
    return response.results
      .filter(page => !AI_EXPERT_IDS.has(page.id.replace(/-/g, '')))
      .map(page => ({
        id: page.id,
        ...simplify(page.properties),
      }));
  }).catch(err => {
    console.error('Failed to fetch people:', err.message);
    return [];
  });
}

module.exports = { getPeople };
