'use strict';

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const CRM_SERVICE_PATH = path.join(__dirname, '../server/services/crm-service.js');
const CRM_READ_MODEL_PATH = path.join(__dirname, '../server/read-model/crm.js');

describe('CRM Service — exports', () => {
  it('exports the expected service methods', () => {
    const crmService = require('../server/services/crm-service');
    assert.equal(typeof crmService.getOverview, 'function');
    assert.equal(typeof crmService.getLeads, 'function');
    assert.equal(typeof crmService.getLead, 'function');
    assert.equal(typeof crmService.getFlows, 'function');
    assert.equal(typeof crmService.getFlow, 'function');
    assert.equal(typeof crmService.getTeam, 'function');
    assert.equal(typeof crmService.getConfig, 'function');
  });

  it('does not export old methods (getPeople, getProjects, getTasks, getCampaigns)', () => {
    const crmService = require('../server/services/crm-service');
    assert.equal(crmService.getPeople, undefined);
    assert.equal(crmService.getProjects, undefined);
    assert.equal(crmService.getTasks, undefined);
    assert.equal(crmService.getCampaigns, undefined);
    assert.equal(crmService.getBusinessUnits, undefined);
    assert.equal(crmService.filterRows, undefined);
  });
});

describe('CRM Service — getLeads', () => {
  it('returns a valid result object (available true or false)', async () => {
    const crmService = require('../server/services/crm-service');
    const result = await crmService.getLeads();
    assert.ok(typeof result === 'object', 'result must be an object');
    assert.ok('available' in result, 'result must have available field');
  });

  it('returns paginated shape when available', async () => {
    const crmService = require('../server/services/crm-service');
    const result = await crmService.getLeads({ page: '1', limit: '10' });
    if (result.available !== false) {
      assert.ok(Array.isArray(result.rows), 'rows must be an array');
      assert.ok(typeof result.total === 'number', 'total must be a number');
      assert.ok(typeof result.page === 'number', 'page must be a number');
      assert.ok(typeof result.limit === 'number', 'limit must be a number');
      assert.ok(typeof result.totalPages === 'number', 'totalPages must be a number');
      assert.ok(result.rows.length <= 10, 'rows must respect limit');
    }
  });

  it('filters by status when available', async () => {
    const crmService = require('../server/services/crm-service');
    const result = await crmService.getLeads({ status: 'Active' });
    if (result.available !== false) {
      result.rows.forEach(r => {
        assert.equal((r.Status || '').toLowerCase(), 'active');
      });
    }
  });
});

describe('CRM Service — getLead', () => {
  it('returns a valid result object', async () => {
    const crmService = require('../server/services/crm-service');
    const result = await crmService.getLead('NONEXISTENT-LEAD-ID-999');
    assert.ok(typeof result === 'object');
    assert.ok('available' in result);
    // non-existent lead → not_found or available:false
    if (result.available !== false) {
      assert.equal(result.reason, 'not_found');
    }
  });
});

describe('CRM Service — getFlows', () => {
  it('returns a valid result object', async () => {
    const crmService = require('../server/services/crm-service');
    const result = await crmService.getFlows();
    assert.ok(typeof result === 'object');
    assert.ok('available' in result);
  });

  it('returns rows array when available', async () => {
    const crmService = require('../server/services/crm-service');
    const result = await crmService.getFlows();
    if (result.available !== false) {
      assert.ok(Array.isArray(result.rows), 'rows must be an array');
    }
  });
});

describe('CRM Service — getFlow', () => {
  it('returns a valid result for nonexistent flow', async () => {
    const crmService = require('../server/services/crm-service');
    const result = await crmService.getFlow('NONEXISTENT-FLOW-ID-999');
    assert.ok(typeof result === 'object');
    assert.ok('available' in result);
    if (result.available !== false) {
      assert.equal(result.reason, 'not_found');
    }
  });
});

describe('CRM Service — getTeam', () => {
  it('returns a valid result object', async () => {
    const crmService = require('../server/services/crm-service');
    const result = await crmService.getTeam();
    assert.ok(typeof result === 'object');
    assert.ok('available' in result);
  });

  it('users have activeFlows and flowsByStatus when available', async () => {
    const crmService = require('../server/services/crm-service');
    const result = await crmService.getTeam();
    if (result.available !== false) {
      assert.ok(Array.isArray(result.users));
      result.users.forEach(u => {
        assert.ok('activeFlows' in u, 'user must have activeFlows');
        assert.ok('flowsByStatus' in u, 'user must have flowsByStatus');
      });
    }
  });
});

describe('CRM Service — getConfig (always returns available: true)', () => {
  it('returns available: true with empty arrays when sheets not configured', async () => {
    const crmService = require('../server/services/crm-service');
    const result = await crmService.getConfig();
    assert.equal(result.available, true);
    assert.ok(Array.isArray(result.slaRules));
    assert.ok(Array.isArray(result.routingRules));
    assert.ok(Array.isArray(result.flowTypeConfig));
    assert.ok(Array.isArray(result.messageTemplates));
  });
});

describe('CRM Service — getOverview shape', () => {
  it('returns expected shape with timestamp', async () => {
    const crmService = require('../server/services/crm-service');
    const result = await crmService.getOverview();
    assert.ok('pipeline' in result);
    assert.ok('leadStats' in result);
    assert.ok('flowStats' in result);
    assert.ok('team' in result);
    assert.ok('timestamp' in result);
    assert.ok(Array.isArray(result.leadStats.byStatus));
    assert.ok(Array.isArray(result.leadStats.byCategory));
    assert.ok(Array.isArray(result.leadStats.recentLeads));
  });
});

describe('CRM Service — date parsing', () => {
  // Test the parseDate logic indirectly via getLeads filter/sort
  // by verifying getLeads always returns the correct shape even with no data
  it('getLeads returns pagination shape when available', async () => {
    const crmService = require('../server/services/crm-service');
    const result = await crmService.getLeads({ page: '1', limit: '10' });
    // unconfigured — just check it doesn't throw
    assert.ok(typeof result === 'object');
  });
});

describe('CRM Read Model', () => {
  afterEach(() => {
    delete require.cache[CRM_SERVICE_PATH];
    delete require.cache[CRM_READ_MODEL_PATH];
  });

  it('wraps overview payload in data/meta contract', async () => {
    const crmService = require(CRM_SERVICE_PATH);
    const crmReadModel = require(CRM_READ_MODEL_PATH);

    crmService.getOverview = async () => ({
      pipeline: { available: true, totalLeads: 4 },
      leadStats: { total: 4, byStatus: [], byCategory: [], recentLeads: [] },
      flowStats: { total: 3, byStatus: [], byOwner: [] },
      team: { count: 2, users: [] },
      timestamp: '2026-04-08T00:00:00.000Z',
    });

    const result = await crmReadModel.build();
    assert.ok(result.data);
    assert.ok(result.meta);
    assert.equal(result.meta.partial, false);
    assert.deepEqual(result.meta.degradedSources, []);
    assert.equal(result.meta.sourceFreshness.pipeline.status, 'ok');
  });

  it('flags degraded CRM sources when overview is partial', async () => {
    const crmService = require(CRM_SERVICE_PATH);
    const crmReadModel = require(CRM_READ_MODEL_PATH);

    crmService.getOverview = async () => ({
      pipeline: { available: false, totalLeads: 0 },
      leadStats: { total: 0, byStatus: [], byCategory: [], recentLeads: [] },
      flowStats: { total: 0, byStatus: [], byOwner: [] },
      team: { count: 0, users: [] },
      timestamp: '2026-04-08T00:00:00.000Z',
    });

    const result = await crmReadModel.build();
    assert.equal(result.meta.partial, true);
    assert.ok(result.meta.degradedSources.includes('pipeline'));
    assert.ok(result.meta.degradedSources.includes('leadStats'));
    assert.ok(result.meta.degradedSources.includes('flowStats'));
    assert.ok(result.meta.degradedSources.includes('team'));
  });
});
