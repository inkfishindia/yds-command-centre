'use strict';
// databases.js — DB constants, AI expert IDs, and generic database query functions.
// Public exports: DB, AI_EXPERT_IDS, listDatabases, queryDatabase, getKeyPages
// DO NOT add: page-level fetches (pages.js), relation resolution (relations.js),
//   domain reads like getCommitments (notion.js), write queue, cache data structures.

const { getClient } = require('./client');
const { withRetry } = require('./retry');
const { deduplicatedFetch, stableStringify } = require('./cache');
const { simplify } = require('./simplify');

// Database IDs from notion-hub.md
const DB = {
  FOCUS_AREAS: '274fc2b3b6f7430fbb27474320eb0f96',
  PROJECTS: '85c1b29205634f43b50dc16fc7466faa',
  COMMITMENTS: '0b50073e544942aab1099fc559b390fb',
  PEOPLE: 'de346469925e4d1a825a849bc9f5269f',
  DECISIONS: '3c8a9b22ba924f20bfdcab4cc7a46478',
  PLATFORMS: '1fcf264fd2cd4308bcfd28997d171360',
  AUDIENCES: '63ec25cae3b0432093fa639d4c8b5809',
  // Marketing Ops databases
  CAMPAIGNS: '9f5f3da620e64bf0bceef7f9a3465925',
  CONTENT_CALENDAR: '227f3365feab476e88791f2a4d0a72b9',
  SEQUENCES: 'e580d12cac8c43bd890176fc0985518e',
  SESSIONS_LOG: 'dffaf6eb216444858981203915991c22',
  // Tech Team databases
  TECH_SPRINT_BOARD: '2c459dc96d804bce913547e02b78776c',
  TECH_SPEC_LIBRARY: '5be6d7cf5607407cbca010b422bceb7e',
  TECH_DECISION_LOG: '1f9193d41ac3409484d2d0ae1442c95b',
  TECH_SPRINT_ARCHIVE: '9ba8330aa3c044d195b27eb450e278f2',
  // New databases
  AI_TEAM: '17f15cb3920948fb9721a776bbbcc6ea',
  MARKETING_TASKS: '1fa22f26f31842439dba9788e08ca413',
  TECH_BACKLOG: '4bb401d876dd4068851784c5cdb06363',
  // IG playbook v1 DBs (created 2026-05-02) — hardcoded for parity with existing DBs.
  // See docs/marketing/NOTION-SETUP.md §1 for the source-of-truth registry.
  // Supersedes Decision #98 (env-var gating); env override no longer supported here.
  IG_PERFORMANCE: '5959753fb4ff4b7a9d16c4e1ec46a811',
  HOOK_PATTERN_LOG: '3a32a0aea45b4537b73e76015c8ec9e0',
  TEMPLATE_LIBRARY: 'ff498859fead4048b9d6ea250b4ffc19',
  APPROVALS_LOG: '352b4779a93742e59553f9247317ed94',
  WEEKLY_OPS_LOG: '450968bb4a5042d4bab2590d99b3d03d',
  // Hub B — Marketing Log + Campaign Decisions (added Phase B, Decision #102)
  MARKETING_LOG: '3ca17008a2994dcfa662300438a9e295',       // Marketing Log — Type/Area/Tags capture stream
  CAMPAIGN_DECISIONS: '36f79d19dbfe4fddb593f919db15e8b2',  // Campaign Decisions — marketing-scoped decision log
};

// Known AI Expert Panel page IDs — excluded from people/team queries
const AI_EXPERT_IDS = new Set([
  '308247aa0d7b8185b2c1d2b738aee402', // Colin (Chief of Staff)
  '308247aa0d7b81c1948cf999fd8e3dcf', // Rory (Behavioral)
  '308247aa0d7b81b1a1fdfd6569d9b202', // JW / Jessica (Creative)
  '308247aa0d7b810f8322f160169f2344', // Copy Lead / Harry
  '308247aa0d7b811fa554f1a77b7e20bc', // Tech Advisor
]);

/**
 * List all known databases with metadata
 */
function listDatabases() {
  return [
    { id: DB.FOCUS_AREAS, name: 'Focus Areas', icon: 'F', description: 'Strategic focus areas with health status' },
    { id: DB.PROJECTS, name: 'Projects', icon: 'P', description: 'Mission briefs, initiatives, experiments' },
    { id: DB.COMMITMENTS, name: 'Commitments', icon: 'C', description: 'Tasks, deliverables, accountability tracking' },
    { id: DB.PEOPLE, name: 'People', icon: 'T', description: 'Team roster and AI expert panel' },
    { id: DB.DECISIONS, name: 'Decisions', icon: 'D', description: 'Decision log with rationale' },
    { id: DB.PLATFORMS, name: 'Platforms', icon: 'S', description: 'System and platform tracking' },
    { id: DB.AUDIENCES, name: 'Audiences', icon: 'A', description: 'Customer segments and targeting' },
    { id: DB.CAMPAIGNS, name: 'Campaigns', icon: 'M', description: 'Marketing campaigns with stage tracking' },
    { id: DB.CONTENT_CALENDAR, name: 'Content Calendar', icon: 'W', description: 'Content pipeline from idea to published' },
    { id: DB.SEQUENCES, name: 'Sequences', icon: 'Q', description: 'Email and messaging sequences' },
    { id: DB.SESSIONS_LOG, name: 'Sessions Log', icon: 'L', description: 'Session records with decisions and commitments' },
    { id: DB.TECH_SPRINT_BOARD, name: 'Sprint Board (Tech)', icon: '📋', description: 'Tech sprint items, bugs, and tasks' },
    { id: DB.TECH_SPEC_LIBRARY, name: 'Spec Library', icon: '📄', description: 'Technical specification pipeline' },
    { id: DB.TECH_DECISION_LOG, name: 'Tech Decision Log', icon: '⚖️', description: 'Technical decision records' },
    { id: DB.TECH_SPRINT_ARCHIVE, name: 'Sprint Archive', icon: '📊', description: 'Sprint velocity and history' },
    { id: DB.AI_TEAM, name: 'AI Team', icon: '🤖', description: 'AI agent roster — function, status, tools, and scope' },
    { id: DB.MARKETING_TASKS, name: 'Marketing Tasks', icon: '✅', description: 'Marketing action items with assignments and deadlines' },
    { id: DB.TECH_BACKLOG, name: 'Tech Backlog', icon: '🛠️', description: 'Technical backlog items waiting to be pulled into sprints' },
    { id: DB.IG_PERFORMANCE, name: 'IG Performance', icon: '📈', description: 'IG north-star measurement — SWPS, ad candidates, hit-target gating' },
    { id: DB.HOOK_PATTERN_LOG, name: 'Hook Pattern Log', icon: '🪝', description: 'Catalog of IG hook patterns with status' },
    { id: DB.TEMPLATE_LIBRARY, name: 'Template Library', icon: '🧩', description: 'Reusable carousel/reel/single/story templates by pillar' },
    { id: DB.APPROVALS_LOG, name: 'Approvals Log', icon: '✋', description: 'Append-only Brand Editor decisions log + 2-revision-kill trigger' },
    { id: DB.WEEKLY_OPS_LOG, name: 'Weekly Ops Log', icon: '📅', description: 'Friday IG pulse rollup feeding Decisions DB' },
    { id: DB.MARKETING_LOG, name: 'Marketing Log', icon: '📋', description: 'Marketing capture stream — observations, ideas, decisions, data points by Area/Type/Tags' },
    { id: DB.CAMPAIGN_DECISIONS, name: 'Campaign Decisions', icon: '⚖️', description: 'Marketing-specific decision log scoped to campaigns' },
  ];
}

/**
 * Query any database by ID with optional filter/sort/pagination
 */
async function queryDatabase(dbId, { filter, sorts, startCursor, pageSize = 50 } = {}) {
  const cacheKey = 'db_' + dbId + '_' + stableStringify({ filter, sorts, startCursor });
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const params = { database_id: dbId, page_size: pageSize };
    if (filter) params.filter = filter;
    if (sorts) params.sorts = sorts;
    if (startCursor) params.start_cursor = startCursor;
    const response = await withRetry(() => notion.databases.query(params));
    return {
      results: response.results.map(page => ({
        id: page.id,
        url: page.url,
        created: page.created_time,
        updated: page.last_edited_time,
        ...simplify(page.properties),
      })),
      hasMore: response.has_more,
      nextCursor: response.next_cursor,
    };
  }).catch(err => {
    console.error('Failed to query database ' + dbId + ':', err.message);
    return { results: [], hasMore: false, nextCursor: null };
  });
}

/**
 * Get key Notion pages
 */
function getKeyPages() {
  return [
    { id: '307247aa0d7b8039bf78d35962815014', name: 'Business Bible', description: 'Full business context and strategy' },
    { id: '307247aa0d7b8102bfa0f8a18d8809d9', name: 'Notion OS Root', description: 'System root page' },
    { id: '308247aa0d7b81cea80dca287155b137', name: 'Team Operating Manual', description: 'How teams interact with the system' },
    { id: '315247aa0d7b81c59fddf518c01e8556', name: 'Marketing Context Pack', description: 'Marketing-specific context' },
  ];
}

module.exports = { DB, AI_EXPERT_IDS, listDatabases, queryDatabase, getKeyPages };
