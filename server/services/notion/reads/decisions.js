'use strict';
// reads/decisions.js
// Purpose: Fetch recent decisions from the DECISIONS Notion database.
// Public exports: getRecentDecisions
// DO NOT add: writes (those live in writes/commitments.js), tech decisions (tech-team.js), or other domain functions.
// Dependency: infra leaves only (client, cache, retry, simplify, databases).

const { getClient } = require('../client');
const { deduplicatedFetch } = require('../cache');
const { withRetry } = require('../retry');
const { simplify } = require('../simplify');
const { DB } = require('../databases');

/**
 * Fetch recent decisions (last N days)
 */
async function getRecentDecisions(days = 30) {
  return deduplicatedFetch('decisions_' + days, async () => {
    const notion = getClient();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const decisions = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.DECISIONS,
        filter: {
          property: 'Date',
          date: { on_or_after: since.toISOString().split('T')[0] },
        },
        sorts: [{ property: 'Date', direction: 'descending' }],
        page_size: 100,
        start_cursor: cursor,
      }));
      decisions.push(...response.results.map(page => ({
        id: page.id,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);
    return decisions;
  }).catch(err => {
    console.error('Failed to fetch decisions:', err.message);
    return [];
  });
}

module.exports = { getRecentDecisions };
