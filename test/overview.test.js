'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

// ── Service: exports ───────────────────────────────────────────────────────────

describe('Overview Service — exports', () => {
  it('exports getOverviewPayload as a function', () => {
    const service = require('../server/services/overview-service');
    assert.equal(typeof service.getOverviewPayload, 'function');
  });

  it('exports clearCache as a function', () => {
    const service = require('../server/services/overview-service');
    assert.equal(typeof service.clearCache, 'function');
  });
});

// ── Route: module loads ────────────────────────────────────────────────────────

describe('Overview Route — module loads', () => {
  it('loads the route module without error', () => {
    const route = require('../server/routes/overview');
    assert.ok(route, 'route module is truthy');
    assert.equal(typeof route, 'function', 'express router is a function');
  });
});

// ── Service: response shape ────────────────────────────────────────────────────

describe('Overview Service — response shape', () => {
  let payload;

  before(async () => {
    // Stub all upstream services so the test never hits Notion/Claude APIs
    const dashboardService = require('../server/services/dashboard-service');
    const marketingOpsService = require('../server/services/marketing-ops-service');
    const techTeamService = require('../server/services/tech-team-service');
    const notionService = require('../server/services/notion');

    dashboardService.getActionQueuePayload = async () => ({
      dansQueue: [{ id: 'c1', name: 'Test commitment', status: 'Blocked', assignedNames: ['Dan'], isOverdue: false, daysOverdue: 0 }],
      runnersQueue: [],
      dansQueueCount: 1,
      runnersQueueCount: 0,
      timestamp: new Date().toISOString(),
    });

    dashboardService.getDashboardPayload = async () => ({
      focusAreas: [
        { id: 'fa1', Name: 'Growth', Health: 'On Track', overdueCount: 0, blockedCount: 0 },
        { id: 'fa2', Name: 'Tech', Health: 'At Risk', overdueCount: 2, blockedCount: 1 },
      ],
      overdue: [
        { id: 'ov1', Name: 'Overdue task', Status: 'Blocked', 'Due Date': { start: '2024-01-01' }, assignedNames: ['Colin'] },
      ],
      upcoming: [
        { id: 'up1', Name: 'Upcoming task', Status: 'In Progress', 'Due Date': { start: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0] }, assignedNames: ['Dan'] },
      ],
      recentDecisions: [
        { id: 'd1', Name: 'Decision 1', Date: '2024-03-01' },
        { id: 'd2', Name: 'Decision 2', Date: '2024-03-02' },
      ],
      healthDistribution: { onTrack: 1, atRisk: 1, offTrack: 0 },
      morningBrief: {},
    });

    marketingOpsService.getSummary = async () => ({
      campaigns: [{ id: 'camp1', Stage: 'Active' }],
      content: [
        { id: 'con1', Status: 'Draft', 'Publish Date': null },
        { id: 'con2', Status: 'Draft', 'Publish Date': { start: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0] } },
      ],
      sequences: [],
      sessions: [],
      stats: {
        activeCampaigns: 1,
        contentInPipeline: 2,
        liveSequences: 0,
        sessionsThisWeek: 0,
        blockedCampaigns: [],
        needsReviewContent: [],
        unhealthySequences: [],
      },
    });

    marketingOpsService.getMarketingTasksSummary = async () => ({
      total: 10,
      byStatus: { Done: 4, 'In Progress': 3, Blocked: 1, Backlog: 2 },
      byPriority: {},
      byChannel: {},
      overdue: 2,
      urgent: 1,
      inProgress: 3,
      blocked: 1,
    });

    techTeamService.getSummary = async () => ({
      sprintItems: [
        { id: 'sp1', Status: 'Done', Type: 'Feature' },
        { id: 'sp2', Status: 'In Progress', Type: 'Feature' },
        { id: 'sp3', Status: 'Blocked', Type: 'Bug' },
        { id: 'sp4', Status: 'Backlog', Type: 'Feature' },
      ],
      specs: [],
      techDecisions: [],
      sprintArchive: [],
      stats: {
        totalItems: 4,
        doneItems: 1,
        inProgress: 1,
        blocked: 1,
        openBugs: 1,
        specsInReview: 0,
        waitingOnDan: [],
        p0Bugs: 0,
        recentDecisions: [],
      },
    });

    notionService.getAITeam = async () => [
      { id: 'ai1', Name: 'Colin', Status: 'Active', Function: 'Chief of Staff' },
      { id: 'ai2', Name: 'Scout', Status: 'Building', Function: 'Research' },
    ];

    // Clear any cached result from a previous test run
    const service = require('../server/services/overview-service');
    service.clearCache();

    payload = await service.getOverviewPayload();
  });

  after(() => {
    // Clear cache after tests
    const service = require('../server/services/overview-service');
    service.clearCache();
  });

  it('has all required top-level keys', () => {
    assert.ok(payload.attention, 'has attention');
    assert.ok(payload.health, 'has health');
    assert.ok(payload.insights, 'has insights');
    assert.ok(payload.timestamp, 'has timestamp');
    assert.ok(payload.sourceState, 'has sourceState');
  });

  it('attention has required sub-keys', () => {
    const { attention } = payload;
    assert.ok(Array.isArray(attention.waitingOnDan), 'waitingOnDan is array');
    assert.ok(Array.isArray(attention.blockedItems), 'blockedItems is array');
    assert.ok(Array.isArray(attention.upcomingDeadlines), 'upcomingDeadlines is array');
    assert.ok(attention.counts, 'has counts');
    assert.equal(typeof attention.counts.waitingOnDan, 'number');
    assert.equal(typeof attention.counts.blockedTotal, 'number');
    assert.equal(typeof attention.counts.overdueTotal, 'number');
    assert.equal(typeof attention.counts.upcomingThisWeek, 'number');
  });

  it('health has required sub-keys', () => {
    const { health } = payload;
    assert.ok(health.focusAreas, 'has focusAreas');
    assert.ok(health.focusAreas.distribution, 'has distribution');
    assert.ok(Array.isArray(health.focusAreas.atRiskItems), 'atRiskItems is array');
    assert.ok(health.marketing, 'has marketing');
    assert.ok(health.tech, 'has tech');
    assert.ok(health.aiTeam, 'has aiTeam');
  });

  it('health.marketing has expected numeric fields', () => {
    const { marketing } = payload.health;
    assert.equal(typeof marketing.activeCampaigns, 'number');
    assert.equal(typeof marketing.contentInPipeline, 'number');
    assert.equal(typeof marketing.contentScheduledNext7Days, 'number');
    assert.equal(typeof marketing.tasksOverdue, 'number');
    assert.equal(typeof marketing.tasksBlocked, 'number');
    assert.equal(typeof marketing.tasksTotal, 'number');
  });

  it('health.tech has expected numeric fields', () => {
    const { tech } = payload.health;
    assert.equal(typeof tech.sprintTotal, 'number');
    assert.equal(typeof tech.sprintDone, 'number');
    assert.equal(typeof tech.sprintInProgress, 'number');
    assert.equal(typeof tech.sprintBlocked, 'number');
    assert.equal(typeof tech.sprintPctComplete, 'number');
    assert.equal(typeof tech.backlogTotal, 'number');
    assert.equal(typeof tech.specsInReview, 'number');
  });

  it('health.aiTeam counts members correctly', () => {
    const { aiTeam } = payload.health;
    assert.equal(aiTeam.total, 2);
    assert.equal(aiTeam.active, 1);
    assert.equal(aiTeam.building, 1);
    assert.ok(aiTeam.byFunction['Chief of Staff']);
  });

  it('insights has required sub-keys', () => {
    const { insights } = payload;
    assert.ok(insights.completionRates, 'has completionRates');
    assert.ok(insights.completionRates.commitments, 'has commitments rate');
    assert.ok(insights.completionRates.sprintItems, 'has sprintItems rate');
    assert.ok(insights.completionRates.marketingTasks, 'has marketingTasks rate');
    assert.ok(Array.isArray(insights.recentDecisions), 'recentDecisions is array');
  });

  it('insights.recentDecisions is capped at 5', () => {
    assert.ok(payload.insights.recentDecisions.length <= 5);
  });

  it('timestamp is a valid ISO string', () => {
    assert.ok(!isNaN(Date.parse(payload.timestamp)));
  });

  it('tracks per-source resolution state', () => {
    assert.equal(payload.sourceState.actionQueue, 'fulfilled');
    assert.equal(payload.sourceState.dashboard, 'fulfilled');
    assert.equal(payload.sourceState.marketingOpsSummary, 'fulfilled');
    assert.equal(payload.sourceState.crmOverview, 'fulfilled');
    assert.equal(payload.sourceState.opsOverview, 'fulfilled');
  });

  it('returns cached result on second call', async () => {
    const service = require('../server/services/overview-service');
    const second = await service.getOverviewPayload();
    // Same object reference means cache was hit
    assert.equal(second.timestamp, payload.timestamp);
  });
});

// ── Service: graceful degradation ─────────────────────────────────────────────

describe('Overview Service — graceful degradation', () => {
  it('returns valid payload shape even when all sources fail', async () => {
    const dashboardService = require('../server/services/dashboard-service');
    const marketingOpsService = require('../server/services/marketing-ops-service');
    const techTeamService = require('../server/services/tech-team-service');
    const notionService = require('../server/services/notion');
    const service = require('../server/services/overview-service');

    // Make all sources reject
    const fail = async () => { throw new Error('source unavailable'); };
    dashboardService.getActionQueuePayload = fail;
    dashboardService.getDashboardPayload = fail;
    marketingOpsService.getSummary = fail;
    marketingOpsService.getMarketingTasksSummary = fail;
    techTeamService.getSummary = fail;
    notionService.getAITeam = fail;

    service.clearCache();
    const result = await service.getOverviewPayload();

    assert.ok(result.attention, 'has attention');
    assert.ok(result.health, 'has health');
    assert.ok(result.insights, 'has insights');
    assert.ok(result.timestamp, 'has timestamp');
    assert.ok(result.sourceState, 'has sourceState');
    assert.equal(result.attention.counts.waitingOnDan, 0);
    assert.equal(result.health.aiTeam.total, 0);
    assert.equal(result.sourceState.actionQueue, 'rejected');
    assert.equal(result.sourceState.dashboard, 'rejected');

    service.clearCache();
  });
});

describe('Overview Read Model', () => {
  it('wraps overview payload in data/meta contract', async () => {
    const dashboardService = require('../server/services/dashboard-service');
    const marketingOpsService = require('../server/services/marketing-ops-service');
    const techTeamService = require('../server/services/tech-team-service');
    const notionService = require('../server/services/notion');
    const projectsService = require('../server/services/projects-service');
    const crmService = require('../server/services/crm-service');
    const opsService = require('../server/services/ops-service');
    const overviewService = require('../server/services/overview-service');
    const overviewReadModel = require('../server/read-model/overview');

    dashboardService.getActionQueuePayload = async () => ({ dansQueue: [], runnersQueue: [], dansQueueCount: 0, runnersQueueCount: 0 });
    dashboardService.getDashboardPayload = async () => ({ focusAreas: [], overdue: [], upcoming: [], recentDecisions: [], healthDistribution: { onTrack: 0, atRisk: 0, offTrack: 0 }, teamWorkload: [] });
    marketingOpsService.getSummary = async () => ({ campaigns: [], content: [], stats: {} });
    marketingOpsService.getMarketingTasksSummary = async () => ({ total: 0, byStatus: {}, byPriority: {}, byChannel: {}, overdue: 0, urgent: 0, inProgress: 0, blocked: 0 });
    techTeamService.getSummary = async () => ({ stats: { totalItems: 0, doneItems: 0, inProgress: 0, blocked: 0, specsInReview: 0 } });
    techTeamService.getTechBacklog = async () => [];
    notionService.getAITeam = async () => [];
    notionService.getSessionsLog = async () => [];
    notionService.getPeople = async () => [];
    projectsService.getProjectsPayload = async () => ({ projects: [] });
    crmService.getOverview = async () => ({ pipeline: { totalLeads: 0, statusBreakdown: [], available: true } });
    opsService.getOverview = async () => ({ alerts: [], stockHealth: { outOfStock: 0 } });

    overviewService.clearCache();
    const result = await overviewReadModel.build();

    assert.ok(result.data, 'has data');
    assert.ok(result.meta, 'has meta');
    assert.equal(typeof result.meta.partial, 'boolean');
    assert.ok(!isNaN(Date.parse(result.meta.generatedAt)));
    assert.ok(Array.isArray(result.meta.degradedSources));
    assert.ok(result.meta.sourceFreshness.dashboard);
    assert.equal(result.meta.partial, false);
  });
});
