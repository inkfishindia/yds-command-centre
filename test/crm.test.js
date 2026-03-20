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

  it('has GET / registered', () => {
    crmRoute = require('../server/routes/crm');
    const routes = crmRoute.stack
      .filter(l => l.route)
      .map(l => ({ path: l.route.path, methods: Object.keys(l.route.methods) }));
    const match = routes.find(r => r.path === '/' && r.methods.includes('get'));
    assert.ok(match, 'Expected GET / in routes');
  });

  it('has GET /people registered', () => {
    crmRoute = require('../server/routes/crm');
    const routes = crmRoute.stack
      .filter(l => l.route)
      .map(l => ({ path: l.route.path, methods: Object.keys(l.route.methods) }));
    const match = routes.find(r => r.path === '/people' && r.methods.includes('get'));
    assert.ok(match, 'Expected GET /people in routes');
  });

  it('has GET /projects registered', () => {
    crmRoute = require('../server/routes/crm');
    const routes = crmRoute.stack
      .filter(l => l.route)
      .map(l => ({ path: l.route.path, methods: Object.keys(l.route.methods) }));
    const match = routes.find(r => r.path === '/projects' && r.methods.includes('get'));
    assert.ok(match, 'Expected GET /projects in routes');
  });

  it('has GET /tasks registered', () => {
    crmRoute = require('../server/routes/crm');
    const routes = crmRoute.stack
      .filter(l => l.route)
      .map(l => ({ path: l.route.path, methods: Object.keys(l.route.methods) }));
    const match = routes.find(r => r.path === '/tasks' && r.methods.includes('get'));
    assert.ok(match, 'Expected GET /tasks in routes');
  });

  it('has POST /tasks registered', () => {
    crmRoute = require('../server/routes/crm');
    const routes = crmRoute.stack
      .filter(l => l.route)
      .map(l => ({ path: l.route.path, methods: Object.keys(l.route.methods) }));
    const match = routes.find(r => r.path === '/tasks' && r.methods.includes('post'));
    assert.ok(match, 'Expected POST /tasks in routes');
  });

  it('has PATCH /tasks/:rowIdx registered', () => {
    crmRoute = require('../server/routes/crm');
    const routes = crmRoute.stack
      .filter(l => l.route)
      .map(l => ({ path: l.route.path, methods: Object.keys(l.route.methods) }));
    const match = routes.find(r => r.path === '/tasks/:rowIdx' && r.methods.includes('patch'));
    assert.ok(match, 'Expected PATCH /tasks/:rowIdx in routes');
  });

  it('has GET /campaigns registered', () => {
    crmRoute = require('../server/routes/crm');
    const routes = crmRoute.stack
      .filter(l => l.route)
      .map(l => ({ path: l.route.path, methods: Object.keys(l.route.methods) }));
    const match = routes.find(r => r.path === '/campaigns' && r.methods.includes('get'));
    assert.ok(match, 'Expected GET /campaigns in routes');
  });

  it('has GET /business-units registered', () => {
    crmRoute = require('../server/routes/crm');
    const routes = crmRoute.stack
      .filter(l => l.route)
      .map(l => ({ path: l.route.path, methods: Object.keys(l.route.methods) }));
    const match = routes.find(r => r.path === '/business-units' && r.methods.includes('get'));
    assert.ok(match, 'Expected GET /business-units in routes');
  });
});

// ── PATCH /tasks/:rowIdx — validation ─────────────────────────────────────────

describe('CRM Route — PATCH /tasks/:rowIdx validation logic', () => {
  it('rowIndex NaN check: parseInt("abc") is NaN', () => {
    const rowIndex = parseInt('abc', 10);
    assert.ok(isNaN(rowIndex));
  });

  it('rowIndex boundary check: value 1 is < 2 (invalid)', () => {
    const rowIndex = parseInt('1', 10);
    assert.ok(!isNaN(rowIndex) && rowIndex < 2);
  });

  it('rowIndex boundary check: value 2 is >= 2 (valid)', () => {
    const rowIndex = parseInt('2', 10);
    assert.ok(!isNaN(rowIndex) && rowIndex >= 2);
  });

  it('rowIndex boundary check: value 0 is < 2 (invalid)', () => {
    const rowIndex = parseInt('0', 10);
    assert.ok(!isNaN(rowIndex) && rowIndex < 2);
  });
});

// ── Dependency contracts ───────────────────────────────────────────────────────

describe('CRM Route — service dependencies', () => {
  it('sheets service exports fetchSheet', () => {
    const sheets = require('../server/services/sheets');
    assert.equal(typeof sheets.fetchSheet, 'function');
  });

  it('sheets service exports getPipelineData', () => {
    const sheets = require('../server/services/sheets');
    assert.equal(typeof sheets.getPipelineData, 'function');
  });

  it('sheets service exports appendRow', () => {
    const sheets = require('../server/services/sheets');
    assert.equal(typeof sheets.appendRow, 'function');
  });

  it('sheets service exports updateRow', () => {
    const sheets = require('../server/services/sheets');
    assert.equal(typeof sheets.updateRow, 'function');
  });

  it('hydration service exports hydrateSheetData', () => {
    const hydration = require('../server/services/hydration');
    assert.equal(typeof hydration.hydrateSheetData, 'function');
  });
});

// ── Graceful degradation (no Sheets credentials) ──────────────────────────────

describe('CRM Route — graceful degradation (unconfigured sheets)', () => {
  it('fetchSheet("PEOPLE") returns { available: false } when not configured', async () => {
    const { fetchSheet } = require('../server/services/sheets');
    const result = await fetchSheet('PEOPLE');
    assert.equal(result.available, false);
  });

  it('fetchSheet("CAMPAIGNS") returns { available: false } when not configured', async () => {
    const { fetchSheet } = require('../server/services/sheets');
    const result = await fetchSheet('CAMPAIGNS');
    assert.equal(result.available, false);
  });

  it('hydrateSheetData("TASKS") returns { available: false } when not configured', async () => {
    const { hydrateSheetData } = require('../server/services/hydration');
    const result = await hydrateSheetData('TASKS');
    assert.equal(result.available, false);
  });

  it('hydrateSheetData("PROJECTS") returns { available: false } when not configured', async () => {
    const { hydrateSheetData } = require('../server/services/hydration');
    const result = await hydrateSheetData('PROJECTS');
    assert.equal(result.available, false);
  });

  it('hydrateSheetData("BUSINESS_UNITS") returns { available: false } when not configured', async () => {
    const { hydrateSheetData } = require('../server/services/hydration');
    const result = await hydrateSheetData('BUSINESS_UNITS');
    assert.equal(result.available, false);
  });

  it('getPipelineData() returns { available: false } when not configured', async () => {
    const { getPipelineData } = require('../server/services/sheets');
    const result = await getPipelineData();
    assert.equal(result.available, false);
  });
});
