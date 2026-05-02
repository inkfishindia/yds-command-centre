'use strict';
// marketing-ig-service.js
// Purpose: Compose payload-shaped responses for the IG playbook read API.
//   Adds derived/summary fields on top of raw Notion reads. Read-only (Phase B).
// Public exports: getIgPerformance, getHookPatternLog, getTemplateLibrary,
//   getApprovalsLog, getWeeklyOpsLog
// DO NOT add: write operations, approval gate logic, SSE events. Those are Phase D.
// Lazy-require: notion service required inside function bodies to honour live
//   require.cache during tests (per file-discipline.md).

// Hit Target threshold from IG Playbook §3.4 — kept for future automations (Phase D)
// const SWPS_TARGET = 0.035;

// ─── ISO week helpers ─────────────────────────────────────────────────────────

/**
 * Return the Monday (week start) of the ISO week containing `date`.
 * @param {Date} date
 * @returns {Date}
 */
function isoWeekStart(date) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Return a YYYY-MM-DD string for a Date in UTC.
 */
function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Current ISO week boundaries: Monday 00:00 UTC → Sunday 23:59 UTC.
 */
function thisWeekRange() {
  const now = new Date();
  const start = isoWeekStart(now);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { weekStart: toIsoDate(start), weekEnd: toIsoDate(end) };
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Fetch IG Performance with optional filters, plus derived summary fields.
 * @param {object} filters — weekStart, weekEnd, adCandidate, graduatedToAds
 * @returns {{ rows, summary: { postCount, avgSWPS, hitTargetCount } }}
 */
async function getIgPerformance(filters = {}) {
  const notion = require('./notion');
  const rows = await notion.getIgPerformance(filters);

  // Derived summary
  const postCount = rows.length;
  const swpsValues = rows.map(r => r.swps).filter(v => v != null);
  const avgSWPS = swpsValues.length > 0
    ? swpsValues.reduce((sum, v) => sum + v, 0) / swpsValues.length
    : null;
  const hitTargetCount = rows.filter(r => r.hitTarget === true).length;

  return {
    rows,
    summary: { postCount, avgSWPS, hitTargetCount },
  };
}

/**
 * Fetch IG Performance for the current ISO week.
 */
async function getIgPerformanceThisWeek() {
  const { weekStart, weekEnd } = thisWeekRange();
  return getIgPerformance({ weekStart, weekEnd });
}

/**
 * Fetch IG Performance for posts that are ad candidates but not yet graduated.
 */
async function getIgAdCandidates() {
  return getIgPerformance({ adCandidate: true, graduatedToAds: false });
}

/**
 * Fetch posts from the last 14 days where Hit Target = false.
 * "Recent misses" used in the weekly ops review.
 */
async function getIgRecentMisses() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 14);
  const notion = require('./notion');
  const rows = await notion.getIgPerformance({
    weekStart: toIsoDate(start),
    weekEnd: toIsoDate(end),
  });
  const misses = rows.filter(r => r.hitTarget === false);
  return { rows: misses, summary: { postCount: misses.length } };
}

/**
 * Fetch Hook Pattern Log with optional status filter.
 */
async function getHookPatternLog({ status } = {}) {
  const notion = require('./notion');
  const rows = await notion.getHookPatternLog({ status });
  return { rows };
}

/**
 * Fetch Template Library with optional filters.
 */
async function getTemplateLibrary({ status, templateType, pillar } = {}) {
  const notion = require('./notion');
  const rows = await notion.getTemplateLibrary({ status, templateType, pillar });
  return { rows };
}

/**
 * Fetch Approvals Log with optional filters.
 * Flags rows where revisionRound=2 AND verdict='Revision' (kill-rule trigger).
 */
async function getApprovalsLog({ verdict, revisionRound, contentCalendarId } = {}) {
  const notion = require('./notion');
  const rows = await notion.getApprovalsLog({ verdict, revisionRound, contentCalendarId });
  // killRuleTrigger is already set per-row in the reads layer; surface aggregate count here
  const killRuleTriggerCount = rows.filter(r => r.killRuleTrigger).length;
  return { rows, killRuleTriggerCount };
}

/**
 * Fetch only kill-rule trigger rows (Verdict=Revision, Revision Round=2).
 */
async function getKillRuleTriggers() {
  return getApprovalsLog({ verdict: 'Revision', revisionRound: 2 });
}

/**
 * Fetch Weekly Ops Log. Defaults to latest 4 weeks.
 */
async function getWeeklyOpsLog({ limit = 4 } = {}) {
  const notion = require('./notion');
  const rows = await notion.getWeeklyOpsLog({ limit });
  const latest = rows.length > 0 ? rows[0] : null;
  return { rows, latest };
}

/**
 * Fetch only the most recent Weekly Ops Log entry.
 */
async function getLatestWeeklyOps() {
  const result = await getWeeklyOpsLog({ limit: 1 });
  return { row: result.latest };
}

module.exports = {
  getIgPerformance,
  getIgPerformanceThisWeek,
  getIgAdCandidates,
  getIgRecentMisses,
  getHookPatternLog,
  getTemplateLibrary,
  getApprovalsLog,
  getKillRuleTriggers,
  getWeeklyOpsLog,
  getLatestWeeklyOps,
};
