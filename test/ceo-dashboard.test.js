'use strict';

const { before, after, describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('CEO Dashboard Service — exports', () => {
  it('exports getCeoDashboardPayload as a function', () => {
    const service = require('../server/services/ceo-dashboard-service');
    assert.equal(typeof service.getCeoDashboardPayload, 'function');
  });

  it('exports clearCache as a function', () => {
    const service = require('../server/services/ceo-dashboard-service');
    assert.equal(typeof service.clearCache, 'function');
  });
});

describe('CEO Dashboard Route — module loads', () => {
  it('loads the route module without error', () => {
    const route = require('../server/routes/ceo-dashboard');
    assert.ok(route);
    assert.equal(typeof route, 'function');
  });
});

describe('CEO Dashboard Service — response shape', () => {
  let payload;

  before(async () => {
    const dashboardService = require('../server/services/dashboard-service');
    const notionService = require('../server/services/notion');
    const marketingOpsService = require('../server/services/marketing-ops-service');
    const techTeamService = require('../server/services/tech-team-service');
    const opsService = require('../server/services/ops-service');
    const crmService = require('../server/services/crm-service');

    dashboardService.getDashboardPayload = async () => ({
      focusAreas: [
        { id: 'fa1', Name: 'Growth', Health: 'On Track' },
        { id: 'fa2', Name: 'Tech', Health: 'At Risk' },
      ],
      overdue: [
        {
          id: 'c1',
          Name: 'Fix overdue item',
          assignedNames: ['Dan'],
          'Due Date': { start: '2026-03-20' },
        },
      ],
      upcoming: [],
      recentDecisions: [{ id: 'd1', Name: 'Decision A', Date: '2026-03-21' }],
    });

    dashboardService.getActionQueuePayload = async () => ({
      dansQueue: [{ id: 'aq1', name: 'Approve budget', status: 'Blocked', assignedNames: ['Dan'] }],
      runnersQueue: [],
      dansQueueCount: 1,
      runnersQueueCount: 0,
    });

    dashboardService.getTeamWorkload = async () => ([
      { id: 'p1', name: 'Dan', activeCount: 4, overdueCount: 1, capacity: 'light' },
      { id: 'p2', name: 'Colin', activeCount: 6, overdueCount: 2, capacity: 'moderate' },
    ]);

    dashboardService.getMorningBrief = async () => ({
      headline: 'Executive summary ready',
      priorityActions: [{ name: 'Review launch timing' }],
      decisions: [{ name: 'Pricing call' }],
      blockers: [{ name: 'Awaiting design input' }],
    });

    notionService.getRecentDecisions = async () => ([
      { id: 'd1', Name: 'Pricing direction', Rationale: 'TBD', Date: '2026-03-21' },
      { id: 'd2', Name: 'Packaging change', Rationale: 'Approved', Date: '2026-03-20' },
    ]);

    notionService.getFocusAreas = async () => ([
      { id: 'fa1', Name: 'Growth', Health: 'On Track' },
      { id: 'fa2', Name: 'Tech', Health: 'At Risk' },
    ]);

    notionService.getPeople = async () => ([]);
    notionService.getProjects = async () => ([]);

    marketingOpsService.getSummary = async () => ({
      stats: { activeCampaigns: 3, contentInPipeline: 7, blockedCampaigns: [{ id: 'camp1' }] },
    });

    techTeamService.getSummary = async () => ({
      stats: { inProgress: 4, blocked: 1, p0Bugs: 0 },
    });

    opsService.getSummary = async () => ({
      summary: { lowStockCount: 2, pendingPoCount: 3, criticalStockCount: 0 },
    });

    crmService.getOverview = async () => ({
      pipeline: { totalLeads: 20, stalledCount: 2 },
    });

    const service = require('../server/services/ceo-dashboard-service');
    service.clearCache();
    payload = await service.getCeoDashboardPayload();
  });

  after(() => {
    const service = require('../server/services/ceo-dashboard-service');
    service.clearCache();
  });

  it('includes the expected top-level sections', () => {
    assert.ok(payload.pulseBar);
    assert.ok(payload.today);
    assert.ok(payload.workspace);
    assert.ok(payload.systemMap);
    assert.ok(payload.strategic);
    assert.ok(payload.velocity);
    assert.ok(payload.forge);
    assert.ok(payload.timestamp);
  });

  it('builds pulse widgets from source data', () => {
    assert.equal(payload.pulseBar.overdueBadge.count, 1);
    assert.equal(payload.pulseBar.decisionsPendingRationale.count, 1);
    assert.ok(Array.isArray(payload.pulseBar.teamLoad.people));
  });

  it('builds the today and workspace queues', () => {
    assert.ok(Array.isArray(payload.today.delegationAlerts));
    assert.ok(Array.isArray(payload.workspace.activeAgents));
    assert.ok(payload.workspace.sessionHandoff);
  });

  it('returns strategic sections and forge tools', () => {
    assert.ok(Array.isArray(payload.strategic.sections));
    assert.ok(Array.isArray(payload.forge.tools));
    assert.ok(payload.forge.tools.length > 0);
  });
});
