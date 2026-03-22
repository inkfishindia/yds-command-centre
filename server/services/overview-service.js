'use strict';

const dashboardService = require('./dashboard-service');
const marketingOpsService = require('./marketing-ops-service');
const techTeamService = require('./tech-team-service');
const notionService = require('./notion');

const CACHE_TTL_MS = 30 * 1000;

let overviewCache = null;

function getFreshCache() {
  if (!overviewCache) return null;
  if (Date.now() - overviewCache.time > CACHE_TTL_MS) return null;
  return overviewCache.data;
}

function buildAttention(actionQueue, dashboard) {
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const waitingOnDan = actionQueue ? (actionQueue.dansQueue || []) : [];

  // Blocked items from dashboard overdue list (status === 'Blocked')
  const dashboardOverdue = (dashboard && dashboard.overdue) ? dashboard.overdue : [];
  const blockedItems = dashboardOverdue
    .filter(c => c.Status === 'Blocked')
    .map(c => {
      const dueDate = c['Due Date'] && typeof c['Due Date'] === 'object'
        ? c['Due Date'].start
        : c['Due Date'];
      const daysOverdue = dueDate && dueDate < today
        ? Math.floor((new Date(today) - new Date(dueDate)) / 86400000)
        : 0;
      return {
        id: c.id,
        name: c.Name,
        source: 'commitments',
        status: c.Status,
        dueDate: dueDate || null,
        daysOverdue,
        owner: Array.isArray(c.assignedNames) ? c.assignedNames[0] || null : null,
      };
    });

  // Overdue items (due < today, not blocked — blocked already captured above)
  const overdueItems = dashboardOverdue
    .filter(c => c.Status !== 'Blocked')
    .map(c => {
      const dueDate = c['Due Date'] && typeof c['Due Date'] === 'object'
        ? c['Due Date'].start
        : c['Due Date'];
      const daysOverdue = dueDate && dueDate < today
        ? Math.floor((new Date(today) - new Date(dueDate)) / 86400000)
        : 0;
      return {
        id: c.id,
        name: c.Name,
        source: 'commitments',
        status: c.Status,
        dueDate: dueDate || null,
        daysOverdue,
        owner: Array.isArray(c.assignedNames) ? c.assignedNames[0] || null : null,
      };
    });

  // Upcoming deadlines in next 7 days
  const dashboardUpcoming = (dashboard && dashboard.upcoming) ? dashboard.upcoming : [];
  const upcomingDeadlines = dashboardUpcoming
    .filter(c => {
      const dueDate = c['Due Date'] && typeof c['Due Date'] === 'object'
        ? c['Due Date'].start
        : c['Due Date'];
      return dueDate && dueDate >= today && dueDate <= sevenDaysOut;
    })
    .map(c => {
      const dueDate = c['Due Date'] && typeof c['Due Date'] === 'object'
        ? c['Due Date'].start
        : c['Due Date'];
      return {
        id: c.id,
        name: c.Name,
        source: 'commitments',
        status: c.Status,
        dueDate: dueDate || null,
        daysOverdue: 0,
        owner: Array.isArray(c.assignedNames) ? c.assignedNames[0] || null : null,
      };
    });

  return {
    waitingOnDan,
    blockedItems,
    upcomingDeadlines,
    counts: {
      waitingOnDan: waitingOnDan.length,
      blockedTotal: blockedItems.length,
      overdueTotal: overdueItems.length,
      upcomingThisWeek: upcomingDeadlines.length,
    },
  };
}

function buildHealth(dashboard, mktOpsSummary, mktTasksSummary, techSummary, aiTeam, techBacklog, sessions) {
  // Focus areas health distribution
  const healthDist = (dashboard && dashboard.healthDistribution) || { onTrack: 0, atRisk: 0, offTrack: 0 };
  const atRiskItems = (dashboard && dashboard.focusAreas)
    ? dashboard.focusAreas
        .filter(fa => {
          const h = (fa.Health || fa.Status || '').toLowerCase();
          return h.includes('risk') || h.includes('attention');
        })
        .map(fa => ({ id: fa.id, name: fa.Name, health: fa.Health || fa.Status }))
    : [];

  // Marketing stats from both getSummary and getMarketingTasksSummary
  const mktStats = (mktOpsSummary && mktOpsSummary.stats) || {};
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Content scheduled in next 7 days
  const contentItems = (mktOpsSummary && mktOpsSummary.content) || [];
  const contentScheduledNext7Days = contentItems.filter(c => {
    const pub = c['Publish Date'] && typeof c['Publish Date'] === 'object'
      ? c['Publish Date'].start
      : c['Publish Date'];
    return pub && pub >= today && pub <= sevenDaysOut;
  }).length;

  // Tech team stats
  const techStats = (techSummary && techSummary.stats) || {};
  const sprintTotal = techStats.totalItems || 0;
  const sprintDone = techStats.doneItems || 0;
  const sprintInProgress = techStats.inProgress || 0;
  const sprintBlocked = techStats.blocked || 0;
  const sprintPctComplete = sprintTotal > 0 ? Math.round((sprintDone / sprintTotal) * 100) : 0;
  // Tech Backlog from dedicated DB (not sprint board)
  const backlogItems = Array.isArray(techBacklog) ? techBacklog : (techBacklog && techBacklog.items ? techBacklog.items : []);
  const backlogTotal = backlogItems.length;
  const backlogP0P1 = backlogItems.filter(i => i.Priority === 'P0' || i.Priority === 'P1').length;

  // Sessions (last 30 days)
  const sessionsList = Array.isArray(sessions) ? sessions : [];
  const sessionsThisMonth = sessionsList.length;

  // AI team stats
  const aiMembers = Array.isArray(aiTeam) ? aiTeam : [];
  const aiActive = aiMembers.filter(m => m.Status === 'Active' || m.Status === 'Live').length;
  const aiBuilding = aiMembers.filter(m => m.Status === 'Building' || m.Status === 'In Progress').length;
  const byFunction = {};
  for (const member of aiMembers) {
    const fn = member.Function || member.Role || member.Type || 'Other';
    byFunction[fn] = (byFunction[fn] || 0) + 1;
  }

  return {
    focusAreas: {
      distribution: {
        onTrack: healthDist.onTrack || 0,
        atRisk: healthDist.atRisk || 0,
        offTrack: healthDist.offTrack || 0,
      },
      atRiskItems,
    },
    marketing: {
      activeCampaigns: mktStats.activeCampaigns || 0,
      contentInPipeline: mktStats.contentInPipeline || 0,
      contentScheduledNext7Days,
      tasksOverdue: mktTasksSummary ? (mktTasksSummary.overdue || 0) : 0,
      tasksBlocked: mktTasksSummary ? (mktTasksSummary.blocked || 0) : 0,
      tasksTotal: mktTasksSummary ? (mktTasksSummary.total || 0) : 0,
    },
    tech: {
      sprintTotal,
      sprintDone,
      sprintInProgress,
      sprintBlocked,
      sprintPctComplete,
      backlogTotal,
      backlogP0P1,
      specsInReview: techStats.specsInReview || 0,
    },
    aiTeam: {
      total: aiMembers.length,
      active: aiActive,
      building: aiBuilding,
      byFunction,
    },
    sessions: {
      last30Days: sessionsThisMonth,
    },
  };
}

function buildInsights(dashboard, actionQueue, mktTasksSummary, techSummary) {
  // Commitments completion rate: active-only data doesn't include done items,
  // so use the action queue total as the denominator proxy for pending work.
  const commitmentsDone = 0; // can't derive "done" from active-only data without extra query
  const commitmentsDoneTotal = actionQueue
    ? (actionQueue.dansQueueCount || 0) + (actionQueue.runnersQueueCount || 0)
    : 0;

  // Sprint completion
  const techStats = (techSummary && techSummary.stats) || {};
  const sprintDone = techStats.doneItems || 0;
  const sprintTotal = techStats.totalItems || 0;

  // Marketing tasks completion
  const mktByStatus = (mktTasksSummary && mktTasksSummary.byStatus) || {};
  const mktDone = mktByStatus['Done'] || 0;
  const mktTotal = mktTasksSummary ? (mktTasksSummary.total || 0) : 0;

  const recentDecisions = (dashboard && Array.isArray(dashboard.recentDecisions))
    ? dashboard.recentDecisions.slice(0, 5)
    : [];

  return {
    completionRates: {
      commitments: {
        done: commitmentsDone,
        total: commitmentsDoneTotal,
        pct: commitmentsDoneTotal > 0 ? Math.round((commitmentsDone / commitmentsDoneTotal) * 100) : 0,
      },
      sprintItems: {
        done: sprintDone,
        total: sprintTotal,
        pct: sprintTotal > 0 ? Math.round((sprintDone / sprintTotal) * 100) : 0,
      },
      marketingTasks: {
        done: mktDone,
        total: mktTotal,
        pct: mktTotal > 0 ? Math.round((mktDone / mktTotal) * 100) : 0,
      },
    },
    recentDecisions,
  };
}

async function getOverviewPayload() {
  const cached = getFreshCache();
  if (cached) return cached;

  const [
    actionQueueResult,
    dashboardResult,
    mktOpsSummaryResult,
    mktTasksSummaryResult,
    techSummaryResult,
    aiTeamResult,
    techBacklogResult,
    sessionsResult,
  ] = await Promise.allSettled([
    dashboardService.getActionQueuePayload(),
    dashboardService.getDashboardPayload(),
    marketingOpsService.getSummary(),
    marketingOpsService.getMarketingTasksSummary(),
    techTeamService.getSummary(),
    notionService.getAITeam(),
    techTeamService.getTechBacklog({}),
    notionService.getSessionsLog(30),
  ]);

  const actionQueue = actionQueueResult.status === 'fulfilled' ? actionQueueResult.value : null;
  const dashboard = dashboardResult.status === 'fulfilled' ? dashboardResult.value : null;
  const mktOpsSummary = mktOpsSummaryResult.status === 'fulfilled' ? mktOpsSummaryResult.value : null;
  const mktTasksSummary = mktTasksSummaryResult.status === 'fulfilled' ? mktTasksSummaryResult.value : null;
  const techSummary = techSummaryResult.status === 'fulfilled' ? techSummaryResult.value : null;
  const aiTeam = aiTeamResult.status === 'fulfilled' ? aiTeamResult.value : [];
  const techBacklog = techBacklogResult.status === 'fulfilled' ? techBacklogResult.value : [];
  const sessions = sessionsResult.status === 'fulfilled' ? sessionsResult.value : [];

  // Log any source failures but continue with partial data
  [
    ['action-queue', actionQueueResult],
    ['dashboard', dashboardResult],
    ['marketing-ops-summary', mktOpsSummaryResult],
    ['marketing-tasks-summary', mktTasksSummaryResult],
    ['tech-summary', techSummaryResult],
    ['ai-team', aiTeamResult],
    ['tech-backlog', techBacklogResult],
    ['sessions', sessionsResult],
  ].forEach(([name, result]) => {
    if (result.status === 'rejected') {
      console.error(`[overview] ${name} failed:`, result.reason && result.reason.message);
    }
  });

  const payload = {
    attention: buildAttention(actionQueue, dashboard),
    health: buildHealth(dashboard, mktOpsSummary, mktTasksSummary, techSummary, aiTeam, techBacklog, sessions),
    insights: buildInsights(dashboard, actionQueue, mktTasksSummary, techSummary),
    timestamp: new Date().toISOString(),
  };

  overviewCache = { data: payload, time: Date.now() };
  return payload;
}

function clearCache() {
  overviewCache = null;
}

module.exports = {
  getOverviewPayload,
  clearCache,
};
