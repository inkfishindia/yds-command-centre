'use strict';
// reads/commitments.js
// Purpose: All commitment read queries — filtered, aggregate, kanban, and recently-completed variants.
// Public exports: getCommitments, getOverdueCommitments, getUpcomingCommitments, getAllCommitments,
//   getActiveCommitments, getRecentlyCompletedCommitments, getCommitmentsForKanban
// DO NOT add: write operations (writes/commitments.js), marketing or tech domain reads.
// Cross-domain: getCommitmentsForKanban calls getPeople + getFocusAreas from peer reads (explicit requires).

const { getClient } = require('../client');
const { deduplicatedFetch, stableStringify } = require('../cache');
const { withRetry } = require('../retry');
const { simplify } = require('../simplify');
const { DB } = require('../databases');

/**
 * Fetch commitments with optional filters
 */
async function getCommitments(filter) {
  const cacheKey = 'commitments_' + stableStringify(filter || {});
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const params = {
      database_id: DB.COMMITMENTS,
      page_size: 50,
    };
    if (filter) params.filter = filter;
    const response = await withRetry(() => notion.databases.query(params));
    return response.results.map(page => ({
      id: page.id,
      ...simplify(page.properties),
    }));
  }).catch(err => {
    console.error('Failed to fetch commitments:', err.message);
    return [];
  });
}

/**
 * Fetch overdue commitments
 */
async function getOverdueCommitments() {
  const today = new Date().toISOString().split('T')[0];
  return getCommitments({
    and: [
      { property: 'Due Date', date: { before: today } },
      { property: 'Status', select: { does_not_equal: 'Done' } },
      { property: 'Status', select: { does_not_equal: 'Cancelled' } },
    ],
  });
}

/**
 * Fetch upcoming commitments (due within N days, not overdue, not done/cancelled)
 */
async function getUpcomingCommitments(days = 7) {
  const today = new Date().toISOString().split('T')[0];
  const future = new Date();
  future.setDate(future.getDate() + days);
  const futureDate = future.toISOString().split('T')[0];
  return getCommitments({
    and: [
      { property: 'Due Date', date: { on_or_after: today } },
      { property: 'Due Date', date: { on_or_before: futureDate } },
      { property: 'Status', select: { does_not_equal: 'Done' } },
      { property: 'Status', select: { does_not_equal: 'Cancelled' } },
    ],
  });
}

/**
 * Fetch all commitments (for counts per focus area).
 * Excludes Cancelled by default. Marks null Priority/Type as "Unset".
 * @param {boolean} includeCancelled - Pass true to include Cancelled status.
 */
async function getAllCommitments(includeCancelled = false) {
  const cacheKey = includeCancelled ? 'all_commitments_with_cancelled' : 'all_commitments';
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const commitments = [];
    let cursor;
    const params = {
      database_id: DB.COMMITMENTS,
      page_size: 100,
    };
    // Exclude Cancelled unless explicitly requested
    if (!includeCancelled) {
      params.filter = { property: 'Status', select: { does_not_equal: 'Cancelled' } };
    }
    do {
      const response = await withRetry(() => notion.databases.query({
        ...params,
        start_cursor: cursor,
      }));
      commitments.push(...response.results.map(page => {
        const simplified = simplify(page.properties);
        // Mark null Priority and Type as "Unset"
        if (!simplified.Priority) simplified.Priority = 'Unset';
        if (!simplified.Type) simplified.Type = 'Unset';
        return { id: page.id, last_edited_time: page.last_edited_time, ...simplified };
      }));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);
    return commitments;
  }).catch(err => {
    console.error('Failed to fetch all commitments:', err.message);
    return [];
  });
}

/**
 * Fetch only active commitments — excludes both Done and Cancelled.
 * Used by the dashboard and action queue where completed work is irrelevant.
 * Significantly reduces payload size vs getAllCommitments() on large workspaces.
 */
async function getActiveCommitments() {
  return deduplicatedFetch('active_commitments', async () => {
    const notion = getClient();
    const commitments = [];
    let cursor;
    const params = {
      database_id: DB.COMMITMENTS,
      page_size: 100,
      filter: {
        and: [
          { property: 'Status', select: { does_not_equal: 'Done' } },
          { property: 'Status', select: { does_not_equal: 'Cancelled' } },
        ],
      },
    };
    do {
      const response = await withRetry(() => notion.databases.query({
        ...params,
        start_cursor: cursor,
      }));
      commitments.push(...response.results.map(page => {
        const simplified = simplify(page.properties);
        if (!simplified.Priority) simplified.Priority = 'Unset';
        if (!simplified.Type) simplified.Type = 'Unset';
        return { id: page.id, last_edited_time: page.last_edited_time, ...simplified };
      }));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);
    return commitments;
  }).catch(err => {
    console.error('Failed to fetch active commitments:', err.message);
    return [];
  });
}

/**
 * Fetch commitments completed (Status = Done) in the last N days.
 * Uses last_edited_time as the recency signal.
 */
async function getRecentlyCompletedCommitments(days = 30) {
  const cacheKey = 'recently_completed_' + days;
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    const results = [];
    let cursor;
    const params = {
      database_id: DB.COMMITMENTS,
      page_size: 100,
      filter: {
        and: [
          { property: 'Status', select: { equals: 'Done' } },
          { timestamp: 'last_edited_time', last_edited_time: { on_or_after: sinceStr } },
        ],
      },
    };
    do {
      const response = await withRetry(() => notion.databases.query({
        ...params,
        start_cursor: cursor,
      }));
      results.push(...response.results.map(page => ({
        id: page.id,
        last_edited_time: page.last_edited_time,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);
    return results;
  }).catch(err => {
    console.error('Failed to fetch recently completed commitments:', err.message);
    return [];
  });
}

/**
 * Fetch all commitments with resolved relations (for kanban view).
 * Excludes Cancelled. Returns the full unfiltered list — filtering is done client-side.
 * Marks null Priority/Type as "Unset".
 * Cross-domain: requires getPeople and getFocusAreas for name resolution.
 */
async function getCommitmentsForKanban() {
  // Lazy require to honour live require.cache state at invocation time
  const { getPeople } = require('./people');
  const { getFocusAreas } = require('./focus-areas');

  return deduplicatedFetch('kanban_commitments_all', async () => {
    const notion = getClient();
    const commitments = [];
    let cursor;
    const params = {
      database_id: DB.COMMITMENTS,
      page_size: 100,
      filter: { property: 'Status', select: { does_not_equal: 'Cancelled' } },
    };
    do {
      const response = await withRetry(() => notion.databases.query({
        ...params,
        start_cursor: cursor,
      }));
      commitments.push(...response.results.map(page => {
        const simplified = simplify(page.properties);
        if (!simplified.Priority) simplified.Priority = 'Unset';
        if (!simplified.Type) simplified.Type = 'Unset';
        return { id: page.id, url: page.url, ...simplified };
      }));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Fetch people and focus areas for name resolution
    const [people, focusAreas] = await Promise.all([getPeople(), getFocusAreas()]);

    const peopleLookup = {};
    for (const p of people) {
      peopleLookup[p.id.replace(/-/g, '')] = p.Name || 'Unknown';
    }
    const faLookup = {};
    for (const fa of focusAreas) {
      faLookup[fa.id.replace(/-/g, '')] = fa.Name || 'Unknown';
    }

    // Resolve relation IDs to human-readable names
    return commitments.map(c => {
      const assignedIds = c['Assigned To'] || [];
      const assignedNames = Array.isArray(assignedIds)
        ? assignedIds.map(id => peopleLookup[id.replace(/-/g, '')] || id.slice(0, 8))
        : [];

      const faIds = c['Focus Area'] || c['Focus Areas'] || c['Focus area'] || [];
      const focusAreaNames = Array.isArray(faIds)
        ? faIds.map(id => faLookup[id.replace(/-/g, '')] || id.slice(0, 8))
        : [];

      return { ...c, assignedNames, focusAreaNames };
    });
  }).catch(err => {
    console.error('Failed to fetch kanban commitments:', err.message);
    return [];
  });
}

module.exports = {
  getCommitments,
  getOverdueCommitments,
  getUpcomingCommitments,
  getAllCommitments,
  getActiveCommitments,
  getRecentlyCompletedCommitments,
  getCommitmentsForKanban,
};
