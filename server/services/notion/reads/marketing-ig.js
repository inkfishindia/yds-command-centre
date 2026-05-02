'use strict';
// reads/marketing-ig.js
// Purpose: Read queries for the 5 IG-playbook Notion databases (Phase B, 2026-05-02).
//   IG Performance, Hook Pattern Log, Template Library, Approvals Log, Weekly Ops Log.
// Public exports: getIgPerformance, getHookPatternLog, getTemplateLibrary,
//   getApprovalsLog, getWeeklyOpsLog
// DO NOT add: write operations, Content Calendar reads (reads/marketing-ops.js),
//   or dashboard composition. Lazy-require contract: external services required inside
//   function bodies to honour live require.cache during tests.

const { getClient } = require('../client');
const { deduplicatedFetch } = require('../cache');
const { withRetry } = require('../retry');
const { simplify } = require('../simplify');
const { DB } = require('../databases');

/**
 * Throw a clear error if the DB env var was not set.
 * @param {string|null} dbId
 * @param {string} envVar
 */
function requireDbId(dbId, envVar) {
  if (!dbId) {
    throw new Error(
      `Notion DB ID not set — add ${envVar} to your environment variables. See docs/marketing/NOTION-SETUP.md §7.`
    );
  }
  return dbId;
}

/**
 * Map a rollup array value (from simplify) to a single scalar — first non-null item.
 * IG Performance rollups return arrays like ['Permission'] for single-item selects.
 * @param {Array|null} arr
 * @returns {string|null}
 */
function firstRollupValue(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[0] != null ? arr[0] : null;
}

/**
 * Normalise a simplified IG Performance row.
 * Handles formula (SWPS, Hit Target, Week Of) and rollup (Pillar, Hook Pattern, Format) fields.
 */
function normaliseIgPerformanceRow(raw) {
  return {
    id: raw.id,
    url: raw.url,
    post: raw.Post || null,
    publishedDate: raw['Published Date']
      ? (typeof raw['Published Date'] === 'object' ? raw['Published Date'].start : raw['Published Date'])
      : null,
    publishedSlot: raw['Published Slot'] || null,
    // Rollups — simplify() returns arrays; extract first item
    pillar: firstRollupValue(raw.Pillar),
    hookPattern: firstRollupValue(raw['Hook Pattern']),
    format: firstRollupValue(raw.Format),
    // Metrics
    reach: raw.Reach != null ? raw.Reach : null,
    saves: raw.Saves != null ? raw.Saves : null,
    shares: raw.Shares != null ? raw.Shares : null,
    likes: raw.Likes != null ? raw.Likes : null,
    comments: raw.Comments != null ? raw.Comments : null,
    profileVisits: raw['Profile Visits Attributed'] != null ? raw['Profile Visits Attributed'] : null,
    linkClicks: raw['Link Clicks'] != null ? raw['Link Clicks'] : null,
    // Formulas — simplify() returns numeric/boolean values
    swps: raw.SWPS != null ? raw.SWPS : null,
    hitTarget: raw['Hit Target'] != null ? raw['Hit Target'] : null,
    weekOf: raw['Week Of'] || null,
    // Flags
    adCandidate: raw['Ad Candidate'] === true,
    graduatedToAds: raw['Graduated to Ads'] === true,
    learningNote: raw['Learning Note'] || null,
    enteredBy: raw['Entered By'] || null,
    enteredOn: raw['Entered On'] || null,
    // Keep raw CC relation IDs for linking
    contentCalendarIds: Array.isArray(raw['Content Calendar']) ? raw['Content Calendar'] : [],
  };
}

/**
 * Fetch IG Performance rows with optional filters.
 * @param {object} opts
 * @param {string} [opts.weekStart]       ISO date YYYY-MM-DD — Published Date on_or_after
 * @param {string} [opts.weekEnd]         ISO date YYYY-MM-DD — Published Date on_or_before
 * @param {boolean} [opts.adCandidate]    filter: Ad Candidate = true/false
 * @param {boolean} [opts.graduatedToAds] filter: Graduated to Ads = true/false
 */
async function getIgPerformance({ weekStart, weekEnd, adCandidate, graduatedToAds } = {}) {
  const dbId = requireDbId(DB.IG_PERFORMANCE, 'IG_PERFORMANCE_DB_ID');

  const cacheKey = `ig_perf_${weekStart || ''}_${weekEnd || ''}_${adCandidate}_${graduatedToAds}`;
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const filterClauses = [];

    if (weekStart) {
      filterClauses.push({ property: 'Published Date', date: { on_or_after: weekStart } });
    }
    if (weekEnd) {
      filterClauses.push({ property: 'Published Date', date: { on_or_before: weekEnd } });
    }
    if (adCandidate === true || adCandidate === 'true') {
      filterClauses.push({ property: 'Ad Candidate', checkbox: { equals: true } });
    } else if (adCandidate === false || adCandidate === 'false') {
      filterClauses.push({ property: 'Ad Candidate', checkbox: { equals: false } });
    }
    if (graduatedToAds === true || graduatedToAds === 'true') {
      filterClauses.push({ property: 'Graduated to Ads', checkbox: { equals: true } });
    } else if (graduatedToAds === false || graduatedToAds === 'false') {
      filterClauses.push({ property: 'Graduated to Ads', checkbox: { equals: false } });
    }

    const queryOpts = {
      database_id: dbId,
      sorts: [{ property: 'Published Date', direction: 'descending' }],
      page_size: 100,
    };
    if (filterClauses.length === 1) queryOpts.filter = filterClauses[0];
    if (filterClauses.length > 1) queryOpts.filter = { and: filterClauses };

    const rows = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        ...queryOpts,
        start_cursor: cursor,
      }));
      rows.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    return rows.map(normaliseIgPerformanceRow);
  }).catch(err => {
    console.error('Failed to fetch IG Performance:', err.message);
    return [];
  });
}

/**
 * Fetch Hook Pattern Log rows.
 * @param {object} opts
 * @param {string} [opts.status]  'Active' | 'Testing' | 'Retired'
 */
async function getHookPatternLog({ status } = {}) {
  const dbId = requireDbId(DB.HOOK_PATTERN_LOG, 'HOOK_PATTERN_LOG_DB_ID');

  const cacheKey = `ig_hook_patterns_${status || 'all'}`;
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const queryOpts = {
      database_id: dbId,
      sorts: [{ property: 'Pattern Name', direction: 'ascending' }],
      page_size: 100,
    };
    if (status) {
      queryOpts.filter = { property: 'Status', select: { equals: status } };
    }

    const rows = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        ...queryOpts,
        start_cursor: cursor,
      }));
      rows.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    return rows.map(row => ({
      id: row.id,
      url: row.url,
      patternName: row['Pattern Name'] || null,
      patternType: row['Pattern Type'] || null,
      description: row.Description || null,
      exampleHook: row['Example Hook'] || null,
      reversePattern: row['Reverse Pattern'] || null,
      status: row.Status || null,
      notes: row.Notes || null,
      postsUsingIds: Array.isArray(row['Posts Using']) ? row['Posts Using'] : [],
    }));
  }).catch(err => {
    console.error('Failed to fetch Hook Pattern Log:', err.message);
    return [];
  });
}

/**
 * Fetch Template Library rows.
 * @param {object} opts
 * @param {string} [opts.status]        'Active' | 'WIP' | 'Retired'
 * @param {string} [opts.templateType]  'Carousel' | 'Reel' | 'Single' | 'Story'
 * @param {string} [opts.pillar]        IG pillar name
 */
async function getTemplateLibrary({ status, templateType, pillar } = {}) {
  const dbId = requireDbId(DB.TEMPLATE_LIBRARY, 'TEMPLATE_LIBRARY_DB_ID');

  const cacheKey = `ig_templates_${status || ''}_${templateType || ''}_${pillar || ''}`;
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const filterClauses = [];

    if (status) filterClauses.push({ property: 'Status', select: { equals: status } });
    if (templateType) filterClauses.push({ property: 'Template Type', select: { equals: templateType } });
    if (pillar) filterClauses.push({ property: 'Pillar (IG)', select: { equals: pillar } });

    const queryOpts = {
      database_id: dbId,
      sorts: [{ property: 'Template Name', direction: 'ascending' }],
      page_size: 100,
    };
    if (filterClauses.length === 1) queryOpts.filter = filterClauses[0];
    if (filterClauses.length > 1) queryOpts.filter = { and: filterClauses };

    const rows = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        ...queryOpts,
        start_cursor: cursor,
      }));
      rows.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    return rows.map(row => ({
      id: row.id,
      url: row.url,
      templateName: row['Template Name'] || null,
      templateType: row['Template Type'] || null,
      pillar: row['Pillar (IG)'] || null,
      status: row.Status || null,
      frameCount: row['Frame Count'] != null ? row['Frame Count'] : null,
      assetLink: row['Asset Link'] || null,
      brandCodeNotes: row['Brand-Code Notes'] || null,
      lastUsed: row['Last Used']
        ? (typeof row['Last Used'] === 'object' ? row['Last Used'].start : row['Last Used'])
        : null,
      notes: row.Notes || null,
      postsUsingIds: Array.isArray(row['Posts Using']) ? row['Posts Using'] : [],
    }));
  }).catch(err => {
    console.error('Failed to fetch Template Library:', err.message);
    return [];
  });
}

/**
 * Fetch Approvals Log rows.
 * @param {object} opts
 * @param {string} [opts.verdict]             'Approved' | 'Revision' | 'Killed'
 * @param {number} [opts.revisionRound]       1 or 2
 * @param {string} [opts.contentCalendarId]   UUID — filter by CC relation
 */
async function getApprovalsLog({ verdict, revisionRound, contentCalendarId } = {}) {
  const dbId = requireDbId(DB.APPROVALS_LOG, 'APPROVALS_LOG_DB_ID');

  const cacheKey = `ig_approvals_${verdict || ''}_${revisionRound || ''}_${contentCalendarId || ''}`;
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const filterClauses = [];

    if (verdict) filterClauses.push({ property: 'Verdict', select: { equals: verdict } });
    if (revisionRound != null) {
      filterClauses.push({ property: 'Revision Round', number: { equals: Number(revisionRound) } });
    }
    // Note: filtering by relation ID is not directly supported in Notion query filters — omit if set;
    // caller can post-filter on contentCalendarIds. Surface the limitation in the shape.

    const queryOpts = {
      database_id: dbId,
      sorts: [{ property: 'Decided At', direction: 'descending' }],
      page_size: 100,
    };
    if (filterClauses.length === 1) queryOpts.filter = filterClauses[0];
    if (filterClauses.length > 1) queryOpts.filter = { and: filterClauses };

    const rows = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        ...queryOpts,
        start_cursor: cursor,
      }));
      rows.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    let result = rows.map(row => ({
      id: row.id,
      url: row.url,
      item: row.Item || null,
      reviewer: row.Reviewer || null,
      verdict: row.Verdict || null,
      reason: row.Reason || null,
      litmusCheck: row['Litmus check'] === true,
      bannedWordsCheck: row['Banned-words check'] === true,
      noFakeUgcCheck: row['No-fake-UGC check'] === true,
      decidedAt: row['Decided At']
        ? (typeof row['Decided At'] === 'object' ? row['Decided At'].start : row['Decided At'])
        : null,
      revisionRound: row['Revision Round'] != null ? row['Revision Round'] : null,
      // Kill-rule flag: revision at round 2 triggers two-revision kill rule (NOTION-SETUP.md §8.3)
      killRuleTrigger: row.Verdict === 'Revision' && row['Revision Round'] === 2,
      contentCalendarIds: Array.isArray(row['Content Calendar']) ? row['Content Calendar'] : [],
    }));

    // Post-filter by contentCalendarId if provided (relation filter not natively supported)
    if (contentCalendarId) {
      const cleanId = contentCalendarId.replace(/-/g, '');
      result = result.filter(r =>
        r.contentCalendarIds.some(id => id.replace(/-/g, '') === cleanId)
      );
    }

    return result;
  }).catch(err => {
    console.error('Failed to fetch Approvals Log:', err.message);
    return [];
  });
}

/**
 * Fetch Weekly Ops Log rows.
 * @param {object} opts
 * @param {number} [opts.limit]  Max rows to return (most recent first). Default 4.
 */
async function getWeeklyOpsLog({ limit = 4 } = {}) {
  const dbId = requireDbId(DB.WEEKLY_OPS_LOG, 'WEEKLY_OPS_LOG_DB_ID');

  const safeLimit = Math.min(Math.max(Number(limit) || 4, 1), 52);
  const cacheKey = `ig_weekly_ops_${safeLimit}`;
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const response = await withRetry(() => notion.databases.query({
      database_id: dbId,
      sorts: [{ property: 'Week Start Date', direction: 'descending' }],
      page_size: safeLimit,
    }));

    return response.results.map(page => {
      const row = { id: page.id, url: page.url, ...simplify(page.properties) };
      return {
        id: row.id,
        url: row.url,
        weekOf: row['Week Of'] || null,
        weekStartDate: row['Week Start Date']
          ? (typeof row['Week Start Date'] === 'object' ? row['Week Start Date'].start : row['Week Start Date'])
          : null,
        postsShipped: row['Posts Shipped'] != null ? row['Posts Shipped'] : null,
        pillarBalance: row['Pillar Balance'] || null,
        weeklySwps: row['Weekly SWPS'] != null ? row['Weekly SWPS'] : null,
        hookGraduationCount: row['Hook Graduation Count'] != null ? row['Hook Graduation Count'] : null,
        emailCaptures: row['Email Captures (IG bio)'] != null ? row['Email Captures (IG bio)'] : null,
        pipelineHealth: row['Pipeline Health'] || null,
        insight: row.Insight || null,
        questionForDan: row['Question for Dan'] || null,
        status: row.Status || null,
        sentAt: row['Sent At']
          ? (typeof row['Sent At'] === 'object' ? row['Sent At'].start : row['Sent At'])
          : null,
        decisionsTriggeredIds: Array.isArray(row['Decisions Triggered']) ? row['Decisions Triggered'] : [],
      };
    });
  }).catch(err => {
    console.error('Failed to fetch Weekly Ops Log:', err.message);
    return [];
  });
}

module.exports = {
  getIgPerformance,
  getHookPatternLog,
  getTemplateLibrary,
  getApprovalsLog,
  getWeeklyOpsLog,
};
