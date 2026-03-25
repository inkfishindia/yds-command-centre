'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ── Route module loading ───────────────────────────────────────────────────────

describe('CRM Route — module loading', () => {
  let crmRoute;

  it('loads without crashing', () => {
    crmRoute = require('../server/routes/crm');
    assert.ok(crmRoute);
  });

  it('exports an express router (function or stack)', () => {
    crmRoute = require('../server/routes/crm');
    assert.ok(typeof crmRoute === 'function' || Array.isArray(crmRoute.stack));
  });
});

// ── Registered routes ──────────────────────────────────────────────────────────

describe('CRM Route — registered paths', () => {
  let crmRoute;

  function getRoutes() {
    crmRoute = require('../server/routes/crm');
    return crmRoute.stack
      .filter(l => l.route)
      .map(l => ({ path: l.route.path, methods: Object.keys(l.route.methods) }));
  }

  it('has GET / registered', () => {
    const routes = getRoutes();
    const match = routes.find(r => r.path === '/' && r.methods.includes('get'));
    assert.ok(match, 'Expected GET / in routes');
  });

  it('has GET /leads registered', () => {
    const routes = getRoutes();
    const match = routes.find(r => r.path === '/leads' && r.methods.includes('get'));
    assert.ok(match, 'Expected GET /leads in routes');
  });

  it('has GET /leads/:id registered', () => {
    const routes = getRoutes();
    const match = routes.find(r => r.path === '/leads/:id' && r.methods.includes('get'));
    assert.ok(match, 'Expected GET /leads/:id in routes');
  });

  it('has GET /flows registered', () => {
    const routes = getRoutes();
    const match = routes.find(r => r.path === '/flows' && r.methods.includes('get'));
    assert.ok(match, 'Expected GET /flows in routes');
  });

  it('has GET /flows/:id registered', () => {
    const routes = getRoutes();
    const match = routes.find(r => r.path === '/flows/:id' && r.methods.includes('get'));
    assert.ok(match, 'Expected GET /flows/:id in routes');
  });

  it('has GET /team registered', () => {
    const routes = getRoutes();
    const match = routes.find(r => r.path === '/team' && r.methods.includes('get'));
    assert.ok(match, 'Expected GET /team in routes');
  });

  it('has GET /config registered', () => {
    const routes = getRoutes();
    const match = routes.find(r => r.path === '/config' && r.methods.includes('get'));
    assert.ok(match, 'Expected GET /config in routes');
  });

  it('does NOT have old /people route', () => {
    const routes = getRoutes();
    const match = routes.find(r => r.path === '/people');
    assert.equal(match, undefined, 'Old /people route should be removed');
  });

  it('does NOT have old /projects route', () => {
    const routes = getRoutes();
    const match = routes.find(r => r.path === '/projects');
    assert.equal(match, undefined, 'Old /projects route should be removed');
  });

  it('does NOT have old /tasks route', () => {
    const routes = getRoutes();
    const match = routes.find(r => r.path === '/tasks');
    assert.equal(match, undefined, 'Old /tasks route should be removed');
  });

  it('does NOT have old /campaigns route', () => {
    const routes = getRoutes();
    const match = routes.find(r => r.path === '/campaigns');
    assert.equal(match, undefined, 'Old /campaigns route should be removed');
  });

  it('does NOT have old /business-units route', () => {
    const routes = getRoutes();
    const match = routes.find(r => r.path === '/business-units');
    assert.equal(match, undefined, 'Old /business-units route should be removed');
  });
});

// ── Service dependency contracts ───────────────────────────────────────────────

describe('CRM Route — service dependencies', () => {
  it('sheets service exports fetchSheet', () => {
    const sheets = require('../server/services/sheets');
    assert.equal(typeof sheets.fetchSheet, 'function');
  });

  it('sheets service exports getPipelineData', () => {
    const sheets = require('../server/services/sheets');
    assert.equal(typeof sheets.getPipelineData, 'function');
  });

  it('crm-service exports getOverview', () => {
    const crmService = require('../server/services/crm-service');
    assert.equal(typeof crmService.getOverview, 'function');
  });

  it('crm-service exports getLeads', () => {
    const crmService = require('../server/services/crm-service');
    assert.equal(typeof crmService.getLeads, 'function');
  });

  it('crm-service exports getFlows', () => {
    const crmService = require('../server/services/crm-service');
    assert.equal(typeof crmService.getFlows, 'function');
  });

  it('crm-service exports getTeam', () => {
    const crmService = require('../server/services/crm-service');
    assert.equal(typeof crmService.getTeam, 'function');
  });

  it('crm-service exports getConfig', () => {
    const crmService = require('../server/services/crm-service');
    assert.equal(typeof crmService.getConfig, 'function');
  });
});

// ── Sheets registry — new CRM keys ────────────────────────────────────────────

describe('CRM Route — sheets registry has CRM keys', () => {
  it('SHEET_REGISTRY contains CRM_LEADS', () => {
    const { SHEET_REGISTRY } = require('../server/services/sheets');
    assert.ok(SHEET_REGISTRY.CRM_LEADS, 'Expected CRM_LEADS in SHEET_REGISTRY');
  });

  it('SHEET_REGISTRY contains CRM_LEAD_FLOWS', () => {
    const { SHEET_REGISTRY } = require('../server/services/sheets');
    assert.ok(SHEET_REGISTRY.CRM_LEAD_FLOWS, 'Expected CRM_LEAD_FLOWS in SHEET_REGISTRY');
  });

  it('SHEET_REGISTRY contains CRM_SYSTEM_USERS', () => {
    const { SHEET_REGISTRY } = require('../server/services/sheets');
    assert.ok(SHEET_REGISTRY.CRM_SYSTEM_USERS, 'Expected CRM_SYSTEM_USERS in SHEET_REGISTRY');
  });

  it('SHEET_REGISTRY contains CRM_SLA_RULES', () => {
    const { SHEET_REGISTRY } = require('../server/services/sheets');
    assert.ok(SHEET_REGISTRY.CRM_SLA_RULES, 'Expected CRM_SLA_RULES in SHEET_REGISTRY');
  });

  it('SHEET_REGISTRY contains CRM_STORE', () => {
    const { SHEET_REGISTRY } = require('../server/services/sheets');
    assert.ok(SHEET_REGISTRY.CRM_STORE, 'Expected CRM_STORE in SHEET_REGISTRY');
  });

  it('CRM_LEADS spreadsheetKey is CRM_CORE', () => {
    const { SHEET_REGISTRY } = require('../server/services/sheets');
    assert.equal(SHEET_REGISTRY.CRM_LEADS.spreadsheetKey, 'CRM_CORE');
  });

  it('CRM_SLA_RULES spreadsheetKey is CRM_CONFIG', () => {
    const { SHEET_REGISTRY } = require('../server/services/sheets');
    assert.equal(SHEET_REGISTRY.CRM_SLA_RULES.spreadsheetKey, 'CRM_CONFIG');
  });

  it('CRM_STORE spreadsheetKey is CRM_FLOWS', () => {
    const { SHEET_REGISTRY } = require('../server/services/sheets');
    assert.equal(SHEET_REGISTRY.CRM_STORE.spreadsheetKey, 'CRM_FLOWS');
  });
});

// ── Graceful degradation — CRM sheets respond with valid shape ─────────────────

describe('CRM Route — CRM sheet responses have valid shape', () => {
  it('fetchSheet("CRM_LEADS") returns an object with available field', async () => {
    const { fetchSheet } = require('../server/services/sheets');
    const result = await fetchSheet('CRM_LEADS');
    assert.ok(typeof result === 'object', 'result must be an object');
    assert.ok('available' in result, 'result must have available field');
    if (result.available !== false) {
      assert.ok(Array.isArray(result.rows), 'rows must be array when available');
    }
  });

  it('fetchSheet("CRM_LEAD_FLOWS") returns an object with available field', async () => {
    const { fetchSheet } = require('../server/services/sheets');
    const result = await fetchSheet('CRM_LEAD_FLOWS');
    assert.ok(typeof result === 'object');
    assert.ok('available' in result);
  });

  it('fetchSheet("CRM_SLA_RULES") returns an object with available field', async () => {
    const { fetchSheet } = require('../server/services/sheets');
    const result = await fetchSheet('CRM_SLA_RULES');
    assert.ok(typeof result === 'object');
    assert.ok('available' in result);
  });

  it('getPipelineData() returns an object with available field', async () => {
    const { getPipelineData } = require('../server/services/sheets');
    const result = await getPipelineData();
    assert.ok(typeof result === 'object');
    assert.ok('available' in result);
  });
});
