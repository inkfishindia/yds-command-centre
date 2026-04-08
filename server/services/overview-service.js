'use strict';

const dashboardService = require('./dashboard-service');
const crmService = require('./crm-service');
const marketingOpsService = require('./marketing-ops-service');
const opsService = require('./ops-service');
const techTeamService = require('./tech-team-service');
const notionService = require('./notion');
const projectsService = require('./projects-service');

const CACHE_TTL_MS = 2 * 60 * 1000;

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

function getAreaStatus({ critical = 0, atRisk = 0, warning = 0, hasData = true } = {}) {
  if (!hasData) return 'unknown';
  if (critical > 0) return 'critical';
  if (atRisk > 0 || warning > 0) return 'at-risk';
  return 'healthy';
}

function statusLabel(status) {
  if (status === 'critical') return 'Critical';
  if (status === 'at-risk') return 'At Risk';
  if (status === 'healthy') return 'Healthy';
  return 'Unknown';
}

function getCrmStalledCount(crmOverview) {
  const statuses = crmOverview?.pipeline?.statusBreakdown || crmOverview?.leadStats?.byStatus || [];
  return statuses.reduce((sum, item) => {
    const name = String(item.name || item.Status || '').toLowerCase();
    return name.includes('stall') ? sum + (item.count || 0) : sum;
  }, 0);
}

function buildExecutiveKpis({ health, projects, people, crmOverview, opsOverview, dashboard }) {
  const stalledCrm = getCrmStalledCount(crmOverview);
  const focusAreaTotal =
    (health?.focusAreas?.distribution?.onTrack || 0) +
    (health?.focusAreas?.distribution?.atRisk || 0) +
    (health?.focusAreas?.distribution?.offTrack || 0);
  const overloadedPeople = (dashboard?.teamWorkload || []).filter(person => person.capacity === 'overloaded').length;
  const opsAlerts = opsOverview?.alerts?.length || 0;
  const opsOutOfStock = opsOverview?.stockHealth?.outOfStock || 0;
  return [
    {
      id: 'focus-areas',
      title: 'Focus Areas',
      value: focusAreaTotal,
      label: 'total',
      sublabel: `${(health?.focusAreas?.distribution?.atRisk || 0) + (health?.focusAreas?.distribution?.offTrack || 0)} at risk`,
      badge: (health?.focusAreas?.distribution?.atRisk || 0) + (health?.focusAreas?.distribution?.offTrack || 0) > 0
        ? `${(health?.focusAreas?.distribution?.atRisk || 0) + (health?.focusAreas?.distribution?.offTrack || 0)} at risk`
        : null,
      status: getAreaStatus({
        critical: health?.focusAreas?.distribution?.offTrack || 0,
        atRisk: health?.focusAreas?.distribution?.atRisk || 0,
        hasData: focusAreaTotal > 0,
      }),
      targetView: 'dashboard',
      healthSegments: health?.focusAreas?.distribution || null,
    },
    {
      id: 'projects',
      title: 'Projects',
      value: projects?.active || 0,
      label: 'active',
      sublabel: `${projects?.avgProgress || 0}% avg progress`,
      status: getAreaStatus({ atRisk: (projects?.items || []).filter(item => (item.overdueCount || 0) > 0).length, hasData: true }),
      targetView: 'projects',
    },
    {
      id: 'crm',
      title: 'CRM',
      value: crmOverview?.pipeline?.totalLeads || crmOverview?.leadStats?.total || 0,
      label: 'leads',
      sublabel: stalledCrm > 0 ? `${stalledCrm} stalled` : 'Pipeline healthy',
      badge: stalledCrm > 0 ? `${stalledCrm} stalled` : null,
      status: getAreaStatus({
        atRisk: stalledCrm,
        hasData: (crmOverview?.pipeline?.available !== false) || (crmOverview?.leadStats?.total || 0) > 0,
      }),
      targetView: 'crm',
    },
    {
      id: 'marketing',
      title: 'Marketing',
      value: health?.marketing?.activeCampaigns || 0,
      label: 'campaigns',
      sublabel: `${health?.marketing?.tasksOverdue || 0} overdue tasks`,
      badge: (health?.marketing?.tasksOverdue || 0) > 0 ? `${health?.marketing?.tasksOverdue || 0} overdue` : null,
      status: getAreaStatus({
        critical: health?.marketing?.tasksBlocked || 0,
        atRisk: health?.marketing?.tasksOverdue || 0,
        hasData: true,
      }),
      targetView: 'marketingOps',
    },
    {
      id: 'tech',
      title: 'Tech',
      value: health?.tech?.sprintPctComplete || 0,
      label: 'complete',
      valueSuffix: '%',
      sublabel: `${health?.tech?.sprintBlocked || 0} blocked items`,
      badge: (health?.tech?.sprintBlocked || 0) > 0 ? `${health?.tech?.sprintBlocked || 0} blocked` : null,
      status: getAreaStatus({
        critical: health?.tech?.sprintBlocked || 0,
        hasData: (health?.tech?.sprintTotal || 0) > 0,
      }),
      targetView: 'techTeam',
      progress: health?.tech?.sprintPctComplete || 0,
    },
    {
      id: 'operations',
      title: 'Operations',
      value: opsAlerts,
      label: 'alerts',
      sublabel: opsOutOfStock > 0 ? `${opsOutOfStock} out of stock` : 'Stock watch stable',
      badge: opsOutOfStock > 0 ? `${opsOutOfStock} out` : null,
      status: getAreaStatus({
        critical: opsOutOfStock,
        atRisk: opsAlerts,
        hasData: !!opsOverview,
      }),
      targetView: 'ops',
    },
    {
      id: 'team',
      title: 'Team Load',
      value: overloadedPeople,
      label: 'overloaded',
      sublabel: `${people?.total || 0} people tracked`,
      badge: overloadedPeople > 0 ? `${overloadedPeople} overloaded` : null,
      status: getAreaStatus({ atRisk: overloadedPeople, hasData: (people?.total || 0) > 0 }),
      targetView: 'team',
    },
  ];
}

function buildAreaCards({ health, crmOverview, opsOverview, projects, people, dashboard }) {
  const stalledCrm = getCrmStalledCount(crmOverview);
  const overloadedPeople = (dashboard?.teamWorkload || []).filter(person => person.capacity === 'overloaded');
  const activeProjects = projects?.active || 0;
  const atRiskProjects = (projects?.items || []).filter(item => (item.overdueCount || 0) > 0).length;
  const areaCards = [
    {
      id: 'projects',
      label: 'Projects & Focus Areas',
      status: getAreaStatus({
        critical: health?.focusAreas?.distribution?.offTrack || 0,
        atRisk: (health?.focusAreas?.distribution?.atRisk || 0) + atRiskProjects,
        hasData: activeProjects > 0 || ((health?.focusAreas?.distribution?.onTrack || 0) + (health?.focusAreas?.distribution?.atRisk || 0) + (health?.focusAreas?.distribution?.offTrack || 0) > 0),
      }),
      owner: 'Command Centre',
      headlineMetric: { label: 'Active projects', value: activeProjects },
      secondaryMetrics: [
        { label: 'Avg progress', value: `${projects?.avgProgress || 0}%` },
        { label: 'At risk focus areas', value: (health?.focusAreas?.distribution?.atRisk || 0) + (health?.focusAreas?.distribution?.offTrack || 0) },
        { label: 'Overdue projects', value: atRiskProjects },
      ],
      topRisk: (health?.focusAreas?.atRiskItems || [])[0]
        ? `${health.focusAreas.atRiskItems[0].name} is ${String(health.focusAreas.atRiskItems[0].health || '').toLowerCase()}`
        : 'No focus areas flagged',
      nextMilestone: `${attentionLabel(projects?.items?.[0]?.name, 'Next active project')}`,
      targetView: 'projects',
      ctaLabel: 'Open Projects',
    },
    {
      id: 'marketing',
      label: 'Marketing',
      status: getAreaStatus({
        critical: health?.marketing?.tasksBlocked || 0,
        atRisk: health?.marketing?.tasksOverdue || 0,
        hasData: true,
      }),
      owner: 'Marketing Ops',
      headlineMetric: { label: 'Active campaigns', value: health?.marketing?.activeCampaigns || 0 },
      secondaryMetrics: [
        { label: 'Content pipeline', value: health?.marketing?.contentInPipeline || 0 },
        { label: 'Overdue tasks', value: health?.marketing?.tasksOverdue || 0 },
        { label: 'Due next 7d', value: health?.marketing?.contentScheduledNext7Days || 0 },
      ],
      topRisk: (health?.marketing?.tasksBlocked || 0) > 0
        ? `${health.marketing.tasksBlocked} blocked marketing tasks`
        : `${health?.marketing?.tasksOverdue || 0} overdue marketing tasks`,
      nextMilestone: `${health?.marketing?.contentScheduledNext7Days || 0} content items scheduled in the next 7 days`,
      targetView: 'marketingOps',
      ctaLabel: 'Open Marketing',
    },
    {
      id: 'crm',
      label: 'CRM Pipeline',
      status: getAreaStatus({
        atRisk: stalledCrm,
        hasData: (crmOverview?.pipeline?.available !== false) || (crmOverview?.leadStats?.total || 0) > 0,
      }),
      owner: 'CRM',
      headlineMetric: { label: 'Total leads', value: crmOverview?.pipeline?.totalLeads || crmOverview?.leadStats?.total || 0 },
      secondaryMetrics: [
        { label: 'Lead flows', value: crmOverview?.flowStats?.total || 0 },
        { label: 'Stalled', value: stalledCrm },
        { label: 'Team', value: crmOverview?.team?.count || 0 },
      ],
      topRisk: stalledCrm > 0 ? `${stalledCrm} leads are stalled` : 'No stalled pipeline signal',
      nextMilestone: crmOverview?.leadStats?.recentLeads?.[0]?.name
        ? `Newest lead: ${crmOverview.leadStats.recentLeads[0].name}`
        : 'Review newest qualified leads',
      targetView: 'crm',
      ctaLabel: 'Open CRM',
    },
    {
      id: 'tech',
      label: 'Tech Team',
      status: getAreaStatus({
        critical: health?.tech?.sprintBlocked || 0,
        atRisk: (health?.tech?.backlogP0P1 || 0) > 0 ? 1 : 0,
        hasData: (health?.tech?.sprintTotal || 0) > 0,
      }),
      owner: 'Tech Team',
      headlineMetric: { label: 'Sprint progress', value: `${health?.tech?.sprintPctComplete || 0}%` },
      secondaryMetrics: [
        { label: 'Blocked', value: health?.tech?.sprintBlocked || 0 },
        { label: 'Backlog', value: health?.tech?.backlogTotal || 0 },
        { label: 'P0/P1', value: health?.tech?.backlogP0P1 || 0 },
      ],
      topRisk: (health?.tech?.sprintBlocked || 0) > 0
        ? `${health.tech.sprintBlocked} sprint items are blocked`
        : `${health?.tech?.backlogP0P1 || 0} high-priority backlog items`,
      nextMilestone: `${health?.tech?.specsInReview || 0} specs in review`,
      targetView: 'techTeam',
      ctaLabel: 'Open Tech',
    },
    {
      id: 'operations',
      label: 'Operations',
      status: getAreaStatus({
        critical: opsOverview?.stockHealth?.outOfStock || 0,
        atRisk: (opsOverview?.stockHealth?.lowStock || 0) + (opsOverview?.stockHealth?.reorderNeeded || 0),
        hasData: !!opsOverview,
      }),
      owner: 'Ops',
      headlineMetric: { label: 'Stock alerts', value: opsOverview?.alerts?.length || 0 },
      secondaryMetrics: [
        { label: 'Out of stock', value: opsOverview?.stockHealth?.outOfStock || 0 },
        { label: 'Reorder', value: opsOverview?.stockHealth?.reorderNeeded || 0 },
        { label: 'Pending POs', value: opsOverview?.pendingPOs?.count || 0 },
      ],
      topRisk: (opsOverview?.alerts || [])[0]
        ? `${opsOverview.alerts[0].product || 'Item'} is ${String(opsOverview.alerts[0].stockStatus || '').trim()}`
        : 'No urgent stock alerts',
      nextMilestone: `${opsOverview?.products?.total || 0} product types tracked`,
      targetView: 'ops',
      ctaLabel: 'Open Ops',
    },
    {
      id: 'team',
      label: 'Team',
      status: getAreaStatus({
        atRisk: overloadedPeople.length,
        hasData: (people?.total || 0) > 0,
      }),
      owner: 'People',
      headlineMetric: { label: 'People tracked', value: people?.total || 0 },
      secondaryMetrics: [
        { label: 'Overloaded', value: overloadedPeople.length },
        { label: 'Moderate', value: (dashboard?.teamWorkload || []).filter(person => person.capacity === 'moderate').length },
        { label: 'Light', value: (dashboard?.teamWorkload || []).filter(person => person.capacity === 'light').length },
      ],
      topRisk: overloadedPeople[0]
        ? `${overloadedPeople[0].name} has ${overloadedPeople[0].activeCount} active commitments`
        : 'No overload signals right now',
      nextMilestone: people?.members?.[0]?.name
        ? `Next check-in: ${people.members[0].name}`
        : 'Open team directory',
      targetView: 'team',
      ctaLabel: 'Open Team',
    },
  ];
  return areaCards.map(card => ({
    ...card,
    statusLabel: statusLabel(card.status),
  }));
}

function buildActivityFeed({ dashboard, attention, insights }) {
  const items = [];
  for (const blocker of (dashboard?.recentActivity?.newBlockers || []).slice(0, 4)) {
    items.push({
      id: `blocker-${blocker.id}`,
      type: 'blocked',
      title: blocker.name,
      detail: 'New blocker raised',
      timestamp: blocker.lastEdited,
      targetView: 'dashboard',
      tone: 'critical',
    });
  }
  for (const completion of (dashboard?.recentActivity?.completions || []).slice(0, 4)) {
    items.push({
      id: `completion-${completion.id}`,
      type: 'done',
      title: completion.name,
      detail: 'Commitment completed',
      timestamp: completion.lastEdited,
      targetView: 'commitments',
      tone: 'healthy',
    });
  }
  for (const decision of (insights?.recentDecisions || []).slice(0, 4)) {
    const date = typeof decision.Date === 'object' ? decision.Date?.start : decision.Date;
    items.push({
      id: `decision-${decision.id}`,
      type: 'decision',
      title: decision.Name || decision.Decision || 'Decision',
      detail: 'Recent decision logged',
      timestamp: date || null,
      targetView: 'decisions',
      tone: 'neutral',
    });
  }
  for (const item of (attention?.upcomingDeadlines || []).slice(0, 3)) {
    items.push({
      id: `deadline-${item.id}`,
      type: 'deadline',
      title: item.name,
      detail: item.owner ? `Due soon · ${item.owner}` : 'Due soon',
      timestamp: item.dueDate,
      targetView: 'commitments',
      tone: 'warning',
    });
  }
  return items
    .filter(item => item.title)
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 10);
}

function attentionLabel(value, fallback) {
  return value || fallback;
}

function buildQuickLinks({ attention, areaCards }) {
  const links = [
    {
      id: 'action-queue',
      label: 'Action Queue',
      description: `${attention?.counts?.waitingOnDan || 0} items waiting on Dan`,
      targetView: 'actionQueue',
    },
    {
      id: 'dashboard',
      label: 'Execution Dashboard',
      description: `${attention?.counts?.overdueTotal || 0} overdue commitments`,
      targetView: 'dashboard',
    },
  ];
  return links.concat((areaCards || []).slice(0, 4).map(card => ({
    id: `area-${card.id}`,
    label: card.label,
    description: card.topRisk,
    targetView: card.targetView,
  })));
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
    peopleResult,
    projectsPayloadResult,
    crmOverviewResult,
    opsOverviewResult,
  ] = await Promise.allSettled([
    dashboardService.getActionQueuePayload(),
    dashboardService.getDashboardPayload(),
    marketingOpsService.getSummary(),
    marketingOpsService.getMarketingTasksSummary(),
    techTeamService.getSummary(),
    notionService.getAITeam(),
    techTeamService.getTechBacklog({}),
    notionService.getSessionsLog(30),
    notionService.getPeople(),
    projectsService.getProjectsPayload(),
    crmService.getOverview(),
    opsService.getOverview(),
  ]);

  const actionQueue = actionQueueResult.status === 'fulfilled' ? actionQueueResult.value : null;
  const dashboard = dashboardResult.status === 'fulfilled' ? dashboardResult.value : null;
  const mktOpsSummary = mktOpsSummaryResult.status === 'fulfilled' ? mktOpsSummaryResult.value : null;
  const mktTasksSummary = mktTasksSummaryResult.status === 'fulfilled' ? mktTasksSummaryResult.value : null;
  const techSummary = techSummaryResult.status === 'fulfilled' ? techSummaryResult.value : null;
  const aiTeam = aiTeamResult.status === 'fulfilled' ? aiTeamResult.value : [];
  const techBacklog = techBacklogResult.status === 'fulfilled' ? techBacklogResult.value : [];
  const sessions = sessionsResult.status === 'fulfilled' ? sessionsResult.value : [];
  const peopleRaw = peopleResult.status === 'fulfilled' ? (peopleResult.value || []) : [];
  const projectsRaw = projectsPayloadResult.status === 'fulfilled'
    ? (projectsPayloadResult.value && projectsPayloadResult.value.projects ? projectsPayloadResult.value.projects : [])
    : [];
  const crmOverview = crmOverviewResult.status === 'fulfilled' ? crmOverviewResult.value : null;
  const opsOverview = opsOverviewResult.status === 'fulfilled' ? opsOverviewResult.value : null;
  const sourceState = {
    actionQueue: actionQueueResult.status,
    dashboard: dashboardResult.status,
    marketingOpsSummary: mktOpsSummaryResult.status,
    marketingTasksSummary: mktTasksSummaryResult.status,
    techSummary: techSummaryResult.status,
    aiTeam: aiTeamResult.status,
    techBacklog: techBacklogResult.status,
    sessions: sessionsResult.status,
    people: peopleResult.status,
    projects: projectsPayloadResult.status,
    crmOverview: crmOverviewResult.status,
    opsOverview: opsOverviewResult.status,
  };

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
    ['people', peopleResult],
    ['projects', projectsPayloadResult],
    ['crm-overview', crmOverviewResult],
    ['ops-overview', opsOverviewResult],
  ].forEach(([name, result]) => {
    if (result.status === 'rejected') {
      console.error(`[overview] ${name} failed:`, result.reason && result.reason.message);
    }
  });

  const attention = buildAttention(actionQueue, dashboard);
  const health = buildHealth(dashboard, mktOpsSummary, mktTasksSummary, techSummary, aiTeam, techBacklog, sessions);
  const insights = buildInsights(dashboard, actionQueue, mktTasksSummary, techSummary);
  const people = {
    total: peopleRaw.length,
    members: peopleRaw.map(p => ({
      id: p.id,
      name: p.Name,
      role: p.Role || p.Title || '',
      status: p.Status || 'Active',
    })).slice(0, 12),
  };
  const projects = {
    total: projectsRaw.length,
    active: projectsRaw.filter(p => p.Status !== 'Done' && p.Status !== 'Cancelled').length,
    avgProgress: Math.round(projectsRaw.reduce((sum, p) => sum + (p.progressPercent || 0), 0) / Math.max(projectsRaw.length, 1)),
    items: projectsRaw.slice(0, 8).map(p => ({
      id: p.id,
      name: p.Name,
      status: p.Status,
      progress: p.progressPercent || 0,
      openCount: p.openCount || 0,
      overdueCount: p.overdueCount || 0,
    })),
  };
  const executiveKpis = buildExecutiveKpis({ attention, health, projects, people, crmOverview, opsOverview, dashboard });
  const areaCards = buildAreaCards({ health, crmOverview, opsOverview, projects, people, dashboard });
  const activityFeed = buildActivityFeed({ dashboard, attention, insights });

  const payload = {
    attention,
    health,
    insights,
    people,
    projects,
    crm: crmOverview,
    ops: opsOverview,
    executiveKpis,
    areaCards,
    activityFeed,
    quickLinks: buildQuickLinks({ attention, areaCards }),
    sourceState,
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
