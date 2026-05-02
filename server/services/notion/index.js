'use strict';
// index.js — Public API for the notion package.
// Re-exports all 56 keys consumed by routes, services, and tests via
// require('../services/notion') (which forwards here via the shim).
// getPage is defined here (not pages.js) to avoid a dep cycle:
//   pages.js → relations.js → pages.js. index.js sits above both leaves
//   so it can safely compose getPageRaw + resolveRelations.
// DO NOT add new functions here — add them to the appropriate sibling and
// extend this re-export block.

const { getClient } = require('./client');
const { simplify } = require('./simplify');
const { DB, listDatabases, queryDatabase, getKeyPages } = require('./databases');
const { resolveRelations, resolveRelationIdsToNamedItems } = require('./relations');
const { getPageRaw, getPageContent, getRelatedPages } = require('./pages');
const {
  setCachedWithTime,
  deduplicatedFetch,
  clearCache,
} = require('./cache');
const { invalidateCommitmentCaches } = require('./cache-invalidation');

// Domain reads
const { getFocusAreas } = require('./reads/focus-areas');
const { getPeople } = require('./reads/people');
const { getProjects } = require('./reads/projects');
const { getRecentDecisions } = require('./reads/decisions');
const {
  getCommitments,
  getOverdueCommitments,
  getUpcomingCommitments,
  getAllCommitments,
  getActiveCommitments,
  getCommitmentsForKanban,
} = require('./reads/commitments');
const {
  getCampaigns,
  getContentCalendar,
  getContentCalendarByMonth,
  getUnscheduledContent,
  resolveCampaignNames,
  getSequences,
  getSessionsLog,
  getMarketingOpsSummary,
  getCampaignCommitments,
} = require('./reads/marketing-ops');
const {
  getSprintItems,
  getSpecLibrary,
  getTechDecisions,
  getSprintArchive,
  getTechTeamSummary,
} = require('./reads/tech-team');
const { getAITeam } = require('./reads/ai-team');
const { getMarketingTasks, getTechBacklog } = require('./reads/tasks');
const {
  getIgPerformance,
  getHookPatternLog,
  getTemplateLibrary,
  getApprovalsLog,
  getWeeklyOpsLog,
} = require('./reads/marketing-ig');

// Domain writes
const {
  createCommitment,
  createDecision,
  updateCommitmentStatus,
  updateCommitmentPriority,
  updateCommitmentDueDate,
  updateCommitmentAssignee,
  appendCommitmentNote,
} = require('./writes/commitments');
const {
  createContentCalendarItem,
  updateContentCalendarItem,
  updateCampaignProperty,
} = require('./writes/marketing-ops');
const { updateSprintItemProperty } = require('./writes/tech-team');

// Composers
const { getDashboardSummary } = require('./dashboard-summary');
const {
  buildMorningBriefFromDashboard,
  getMorningBrief,
} = require('./morning-brief');

/**
 * Get a single page's properties with relations resolved to {id, name} objects.
 * Lives here (not pages.js) to avoid a dep cycle: pages.js → relations.js → pages.js.
 * index.js sits above both leaves and can safely compose them.
 */
async function getPage(pageId) {
  const raw = await getPageRaw(pageId);
  if (!raw) return null;
  return {
    ...raw,
    properties: await resolveRelations(raw.properties),
  };
}

module.exports = {
  // Infra
  DB,
  getClient,
  simplify,
  resolveRelations,
  resolveRelationIdsToNamedItems,
  listDatabases,
  queryDatabase,
  getKeyPages,

  // Pages
  getPage,
  getPageContent,
  getRelatedPages,

  // Cache
  clearCache,
  invalidateCommitmentCaches,
  setCachedWithTime,
  deduplicatedFetch,

  // Domain reads — commitments
  getCommitments,
  getOverdueCommitments,
  getUpcomingCommitments,
  getAllCommitments,
  getActiveCommitments,
  getCommitmentsForKanban,

  // Domain reads — core
  getFocusAreas,
  getPeople,
  getProjects,
  getRecentDecisions,

  // Domain reads — marketing
  getCampaigns,
  getContentCalendar,
  getContentCalendarByMonth,
  getUnscheduledContent,
  resolveCampaignNames,
  getSequences,
  getSessionsLog,
  getMarketingOpsSummary,
  getCampaignCommitments,

  // Domain reads — tech team
  getSprintItems,
  getSpecLibrary,
  getTechDecisions,
  getSprintArchive,
  getTechTeamSummary,

  // Domain reads — ai team + tasks
  getAITeam,
  getMarketingTasks,
  getTechBacklog,

  // Domain reads — IG playbook (Phase B)
  getIgPerformance,
  getHookPatternLog,
  getTemplateLibrary,
  getApprovalsLog,
  getWeeklyOpsLog,

  // Domain writes
  createCommitment,
  createDecision,
  updateCommitmentStatus,
  updateCommitmentPriority,
  updateCommitmentDueDate,
  updateCommitmentAssignee,
  appendCommitmentNote,
  createContentCalendarItem,
  updateContentCalendarItem,
  updateCampaignProperty,
  updateSprintItemProperty,

  // Composers
  getDashboardSummary,
  buildMorningBriefFromDashboard,
  getMorningBrief,
};
