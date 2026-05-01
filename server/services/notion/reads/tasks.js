'use strict';
// reads/tasks.js
// Purpose: Fetch marketing tasks and tech backlog items with optional filtering and sorting.
// Public exports: getMarketingTasks, getTechBacklog
// DO NOT add: write operations, sprint board reads (tech-team.js), or other domain functions.
// Dependency: infra leaves only (client, cache, retry, simplify, databases).

const { getClient } = require('../client');
const { deduplicatedFetch, stableStringify } = require('../cache');
const { withRetry } = require('../retry');
const { simplify } = require('../simplify');
const { DB } = require('../databases');

/**
 * Fetch marketing tasks with optional Status, Priority, and Channel filters.
 * Results are sorted by Due Date ascending (earliest first), nulls last.
 */
async function getMarketingTasks(filters = {}) {
  const cacheKey = 'marketing_tasks_' + stableStringify(filters);
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const items = [];
    let cursor;

    const filterClauses = [];
    if (filters.status) {
      filterClauses.push({ property: 'Status', select: { equals: filters.status } });
    }
    if (filters.priority) {
      filterClauses.push({ property: 'Priority', select: { equals: filters.priority } });
    }
    if (filters.channel) {
      filterClauses.push({ property: 'Channel', select: { equals: filters.channel } });
    }

    const params = {
      database_id: DB.MARKETING_TASKS,
      page_size: 100,
    };
    if (filterClauses.length === 1) {
      params.filter = filterClauses[0];
    } else if (filterClauses.length > 1) {
      params.filter = { and: filterClauses };
    }

    do {
      params.start_cursor = cursor;
      const response = await withRetry(() => notion.databases.query(params));
      items.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        created: page.created_time,
        lastEdited: page.last_edited_time,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Sort by Due Date ascending, nulls last
    items.sort((a, b) => {
      const da = a['Due Date'] && a['Due Date'].start ? a['Due Date'].start : null;
      const db = b['Due Date'] && b['Due Date'].start ? b['Due Date'].start : null;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da < db ? -1 : da > db ? 1 : 0;
    });

    return items;
  }).catch(err => {
    console.error('Failed to fetch marketing tasks:', err.message);
    return [];
  });
}

/**
 * Fetch tech backlog items with optional Status and Priority filters.
 * Results sorted by Priority ascending (P0 first).
 */
async function getTechBacklog(filters = {}) {
  const cacheKey = 'tech_backlog_' + stableStringify(filters);
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const items = [];
    let cursor;

    const filterClauses = [];
    if (filters.status) {
      filterClauses.push({ property: 'Status', select: { equals: filters.status } });
    }
    if (filters.priority) {
      filterClauses.push({ property: 'Priority', select: { equals: filters.priority } });
    }
    if (filters.area) {
      filterClauses.push({ property: 'Area', select: { equals: filters.area } });
    }
    if (filters.type) {
      filterClauses.push({ property: 'Type', select: { equals: filters.type } });
    }

    const params = {
      database_id: DB.TECH_BACKLOG,
      page_size: 100,
    };
    if (filterClauses.length === 1) {
      params.filter = filterClauses[0];
    } else if (filterClauses.length > 1) {
      params.filter = { and: filterClauses };
    }

    do {
      params.start_cursor = cursor;
      const response = await withRetry(() => notion.databases.query(params));
      items.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        lastEdited: page.last_edited_time,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Sort by Priority ascending (P0 first)
    const PRIORITY_ORDER = { 'P0 - Critical': 0, 'P1 - High': 1, 'P2 - Medium': 2, 'P3 - Low': 3 };
    items.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.Priority] ?? 99;
      const pb = PRIORITY_ORDER[b.Priority] ?? 99;
      return pa - pb;
    });

    return items;
  }).catch(err => {
    console.error('Failed to fetch tech backlog:', err.message);
    return [];
  });
}

module.exports = { getMarketingTasks, getTechBacklog };
