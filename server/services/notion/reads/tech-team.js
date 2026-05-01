'use strict';
// reads/tech-team.js
// Purpose: All tech team read queries — sprint board, spec library, tech decisions, sprint archive, and summary.
// Public exports: getSprintItems, getSpecLibrary, getTechDecisions, getSprintArchive, getTechTeamSummary
// DO NOT add: write operations (writes/tech-team.js), marketing or commitment domain reads.
// Dependency: infra leaves only (client, cache, retry, simplify, databases).

const { getClient } = require('../client');
const { deduplicatedFetch } = require('../cache');
const { withRetry } = require('../retry');
const { simplify } = require('../simplify');
const { DB } = require('../databases');

/**
 * Fetch all sprint board items, sorted by Priority ascending (P0 first).
 */
async function getSprintItems() {
  return deduplicatedFetch('tech_sprint', async () => {
    const notion = getClient();
    const items = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.TECH_SPRINT_BOARD,
        page_size: 100,
        start_cursor: cursor,
      }));
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
    console.error('Failed to fetch sprint items:', err.message);
    return [];
  });
}

/**
 * Fetch all spec library items, sorted by Status: Draft → In Review → Approved.
 */
async function getSpecLibrary() {
  return deduplicatedFetch('tech_specs', async () => {
    const notion = getClient();
    const specs = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.TECH_SPEC_LIBRARY,
        page_size: 100,
        start_cursor: cursor,
      }));
      specs.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        lastEdited: page.last_edited_time,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    const STATUS_ORDER = { 'Draft': 0, 'In Review': 1, 'Approved': 2 };
    specs.sort((a, b) => {
      const sa = STATUS_ORDER[a.Status] ?? 99;
      const sb = STATUS_ORDER[b.Status] ?? 99;
      return sa - sb;
    });

    return specs;
  }).catch(err => {
    console.error('Failed to fetch spec library:', err.message);
    return [];
  });
}

/**
 * Fetch all tech decisions, sorted by Date descending (most recent first).
 * Note: the title property in this DB is called "Decision" (not "Name").
 */
async function getTechDecisions() {
  return deduplicatedFetch('tech_decisions', async () => {
    const notion = getClient();
    const decisions = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.TECH_DECISION_LOG,
        page_size: 100,
        start_cursor: cursor,
      }));
      decisions.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        lastEdited: page.last_edited_time,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Sort by Date descending (most recent first)
    decisions.sort((a, b) => {
      const da = a.Date && typeof a.Date === 'object' ? a.Date.start : a.Date;
      const db2 = b.Date && typeof b.Date === 'object' ? b.Date.start : b.Date;
      if (!da && !db2) return 0;
      if (!da) return 1;
      if (!db2) return -1;
      return new Date(db2) - new Date(da);
    });

    return decisions;
  }).catch(err => {
    console.error('Failed to fetch tech decisions:', err.message);
    return [];
  });
}

/**
 * Fetch sprint archive, sorted by Sprint Number descending.
 */
async function getSprintArchive() {
  return deduplicatedFetch('tech_archive', async () => {
    const notion = getClient();
    const archive = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.TECH_SPRINT_ARCHIVE,
        page_size: 100,
        start_cursor: cursor,
      }));
      archive.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        lastEdited: page.last_edited_time,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Sort by Sprint Number descending
    archive.sort((a, b) => {
      const na = typeof a['Sprint Number'] === 'number' ? a['Sprint Number'] : 0;
      const nb = typeof b['Sprint Number'] === 'number' ? b['Sprint Number'] : 0;
      return nb - na;
    });

    return archive;
  }).catch(err => {
    console.error('Failed to fetch sprint archive:', err.message);
    return [];
  });
}

/**
 * Aggregated Tech Team summary with stats.
 */
async function getTechTeamSummary() {
  return deduplicatedFetch('tech_summary', async () => {
    const [sprintItems, specs, techDecisions, sprintArchive] = await Promise.all([
      getSprintItems(),
      getSpecLibrary(),
      getTechDecisions(),
      getSprintArchive(),
    ]);

    const inProgress = sprintItems.filter(i => i.Status === 'In Progress').length;
    const blocked = sprintItems.filter(i => i.Status === 'Blocked').length;
    const openBugs = sprintItems.filter(i => i.Type === 'Bug' && i.Status !== 'Done' && i.Status !== 'Cancelled').length;
    const specsInReview = specs.filter(s => s.Status === 'In Review').length;
    const totalItems = sprintItems.length;
    const doneItems = sprintItems.filter(i => i.Status === 'Done').length;
    const waitingOnDan = sprintItems.filter(i => i['Waiting On'] === 'Dan' && i.Status !== 'Done');
    const p0Bugs = sprintItems.filter(i => i.Type === 'Bug' && typeof i.Priority === 'string' && i.Priority.startsWith('P0')).length;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentDecisions = techDecisions.filter(d => {
      const dateStr = d.Date && typeof d.Date === 'object' ? d.Date.start : d.Date;
      return dateStr && new Date(dateStr) >= sevenDaysAgo;
    });

    return {
      sprintItems,
      specs,
      techDecisions,
      sprintArchive,
      stats: {
        inProgress,
        blocked,
        openBugs,
        specsInReview,
        totalItems,
        doneItems,
        waitingOnDan,
        p0Bugs,
        recentDecisions,
      },
    };
  }).catch(err => {
    console.error('Failed to fetch tech team summary:', err.message);
    return { sprintItems: [], specs: [], techDecisions: [], sprintArchive: [], stats: {} };
  });
}

module.exports = {
  getSprintItems,
  getSpecLibrary,
  getTechDecisions,
  getSprintArchive,
  getTechTeamSummary,
};
