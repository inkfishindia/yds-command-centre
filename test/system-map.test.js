'use strict';

const { describe, it, afterEach, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const SERVICE_PATH = path.join(__dirname, '../server/services/system-map-service.js');
const ROUTE_PATH = path.join(__dirname, '../server/routes/system-map.js');
const CONFIG_PATH = path.join(__dirname, '../server/config.js');

function stubModule(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
    parent: null,
    children: [],
    paths: [],
  };
}

function findRouteHandler(router, method, routePath) {
  const layer = router.stack.find(
    (entry) => entry.route
      && entry.route.path === routePath
      && entry.route.methods[method],
  );
  return layer?.route?.stack?.[0]?.handle;
}

describe('system-map service', () => {
  afterEach(() => {
    delete require.cache[SERVICE_PATH];
    delete require.cache[ROUTE_PATH];
    delete require.cache[CONFIG_PATH];
  });

  it('buildSystemMap returns all six top-level keys', async () => {
    // Provide a minimal config stub so config.js doesn't fail on missing .env
    stubModule(CONFIG_PATH, {
      GOOGLE_SHEETS_ID: '',
      STRATEGY_SPREADSHEET_ID: '',
      EXECUTION_SPREADSHEET_ID: '',
      APP_LOGGING_SPREADSHEET_ID: '',
      BMC_SPREADSHEET_ID: '',
      CRM_CONFIG_SPREADSHEET_ID: '',
      CRM_FLOWS_SPREADSHEET_ID: '',
      OPS_INVENTORY_SPREADSHEET_ID: '',
      OPS_SALES_SPREADSHEET_ID: '',
      OPS_PRODUCTS_SPREADSHEET_ID: '',
      OPS_WAREHOUSE_SPREADSHEET_ID: '',
      COMPETITOR_INTEL_SPREADSHEET_ID: '',
    });

    const { buildSystemMap } = require(SERVICE_PATH);
    const map = await buildSystemMap(true);

    assert.ok(map.routes, 'routes key present');
    assert.ok(map.modules, 'modules key present');
    assert.ok(map.notionDatabases, 'notionDatabases key present');
    assert.ok(map.sheets, 'sheets key present');
    assert.ok(map.docs, 'docs key present');
    assert.ok(map.agents, 'agents key present');
    assert.ok(Array.isArray(map.views), 'views key present and is array');
    assert.ok(map.generatedAt, 'generatedAt timestamp present');
  });

  it('routes includes an entry for chat.js', async () => {
    stubModule(CONFIG_PATH, {});
    const { buildSystemMap } = require(SERVICE_PATH);
    const map = await buildSystemMap(true);

    const chatEntry = map.routes.find((r) => r.file === 'chat.js');
    assert.ok(chatEntry, 'routes should have a chat.js entry');
    assert.ok(Array.isArray(chatEntry.endpoints), 'chat.js entry should have an endpoints array');
    assert.ok(chatEntry.endpoints.length > 0, 'chat.js should have at least one endpoint');
  });

  it('notionDatabases is non-empty and entries have expected shape', async () => {
    stubModule(CONFIG_PATH, {});
    const { buildSystemMap } = require(SERVICE_PATH);
    const map = await buildSystemMap(true);

    assert.ok(map.notionDatabases.length > 0, 'notionDatabases should not be empty');

    const first = map.notionDatabases[0];
    assert.ok(typeof first.name === 'string', 'database entry has name');
    assert.ok(typeof first.id === 'string', 'database entry has id');
    assert.ok(typeof first.purpose === 'string', 'database entry has purpose');
    assert.ok(Array.isArray(first.propertiesSummary), 'database entry has propertiesSummary array');
  });

  it('sheets entries have idPresent booleans and no raw ID values', async () => {
    stubModule(CONFIG_PATH, {
      GOOGLE_SHEETS_ID: '',
      EXECUTION_SPREADSHEET_ID: 'some-real-id-value',
    });
    const { buildSystemMap } = require(SERVICE_PATH);
    const map = await buildSystemMap(true);

    assert.ok(map.sheets.length > 0, 'sheets array should be non-empty');

    for (const sheet of map.sheets) {
      assert.ok('idPresent' in sheet, 'each sheet has idPresent');
      assert.ok(typeof sheet.idPresent === 'boolean', 'idPresent is a boolean');
      assert.ok('key' in sheet, 'each sheet has key');
      assert.ok('envVar' in sheet, 'each sheet has envVar');
      assert.ok('label' in sheet, 'each sheet has label');
      // No raw spreadsheet ID values should be in the response
      assert.ok(!('id' in sheet), 'sheet entry must not expose raw id field');
      assert.ok(!('value' in sheet), 'sheet entry must not expose raw value field');
    }
  });

  it('docs has docsFiles and recentSessions arrays', async () => {
    stubModule(CONFIG_PATH, {});
    const { buildSystemMap } = require(SERVICE_PATH);
    const map = await buildSystemMap(true);

    assert.ok(Array.isArray(map.docs.docsFiles), 'docs.docsFiles is array');
    assert.ok(Array.isArray(map.docs.recentSessions), 'docs.recentSessions is array');
    assert.ok(map.docs.docsFiles.length > 0, 'docs directory has at least one file');
  });

  it('agents list includes backend-builder with description', async () => {
    stubModule(CONFIG_PATH, {});
    const { buildSystemMap } = require(SERVICE_PATH);
    const map = await buildSystemMap(true);

    assert.ok(map.agents.length > 0, 'agents array should be non-empty');
    const bb = map.agents.find((a) => a.name === 'backend-builder');
    assert.ok(bb, 'backend-builder agent should be present');
    assert.ok(typeof bb.description === 'string', 'agent has description field');
  });
});

describe('extractViews / views in system map', () => {
  afterEach(() => {
    delete require.cache[SERVICE_PATH];
    delete require.cache[CONFIG_PATH];
  });

  it('buildSystemMap includes a non-empty views array', async () => {
    stubModule(CONFIG_PATH, {});
    const { buildSystemMap } = require(SERVICE_PATH);
    const map = await buildSystemMap(true);

    assert.ok(Array.isArray(map.views), 'views key is an array');
    assert.ok(map.views.length > 0, 'views array is non-empty');
  });

  it('every view entry has all required fields with correct types', async () => {
    stubModule(CONFIG_PATH, {});
    const { buildSystemMap } = require(SERVICE_PATH);
    const map = await buildSystemMap(true);

    for (const v of map.views) {
      assert.ok(typeof v.id === 'string' && v.id.length > 0,        `${v.id}: id is a non-empty string`);
      assert.ok(typeof v.label === 'string' && v.label.length > 0,  `${v.id}: label is a non-empty string`);
      assert.ok(typeof v.status === 'string' && v.status.length > 0, `${v.id}: status is a non-empty string`);
      assert.ok(typeof v.partial === 'string' && v.partial.length > 0, `${v.id}: partial is a non-empty string`);
      assert.ok(typeof v.module === 'string' && v.module.length > 0, `${v.id}: module is a non-empty string`);
      assert.ok(typeof v.hasPartial === 'boolean', `${v.id}: hasPartial is a boolean`);
      assert.ok(typeof v.hasModule === 'boolean', `${v.id}: hasModule is a boolean`);
    }
  });

  it('dashboard view is present with status functional', async () => {
    stubModule(CONFIG_PATH, {});
    const { buildSystemMap } = require(SERVICE_PATH);
    const map = await buildSystemMap(true);

    const dashboard = map.views.find((v) => v.id === 'dashboard');
    assert.ok(dashboard, 'dashboard view should be in the list');
    assert.equal(dashboard.status, 'functional');
  });

  it('extractViews returns [] when public/index.html is missing', async () => {
    stubModule(CONFIG_PATH, {});

    // Temporarily redirect ROOT by stubbing readFileSync for the specific path.
    // We do this by loading the service fresh and then overriding fs.readFileSync
    // for the duration of the test via a pre-cached stub that returns null for index.html.
    // Simpler approach: patch fs inside the module by stubbing the service module
    // with a custom ROOT pointing to a temp dir with no index.html.
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svc-test-'));
    // Create subdirectory stubs so other extractors don't throw
    fs.mkdirSync(path.join(tmpDir, 'server', 'routes'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'server'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'src', 'js', 'modules'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'public', 'partials'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.claude', 'docs'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.claude', 'agents'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'data', 'sessions'), { recursive: true });
    // Write a minimal config.js stub into tmpDir
    fs.writeFileSync(path.join(tmpDir, 'server', 'config.js'), 'module.exports = {};');
    // No public/index.html — that's the point

    // Rewrite SERVICE_PATH in cache with a patched ROOT
    // The cleanest isolation: eval the module source with a patched ROOT variable
    const serviceSrc = fs.readFileSync(SERVICE_PATH, 'utf8');
    const patchedSrc = serviceSrc.replace(
      "const ROOT = path.join(__dirname, '..', '..');",
      `const ROOT = ${JSON.stringify(tmpDir)};`,
    );
    const tmpServicePath = path.join(tmpDir, 'system-map-service.js');
    fs.writeFileSync(tmpServicePath, patchedSrc);

    const { buildSystemMap: buildWithTmpRoot } = require(tmpServicePath);
    const map = await buildWithTmpRoot(true);

    assert.ok(Array.isArray(map.views), 'views is an array even when index.html missing');
    assert.equal(map.views.length, 0, 'views is empty when index.html is missing');

    // cleanup
    delete require.cache[tmpServicePath];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('unregistered view id gets status unknown', async () => {
    stubModule(CONFIG_PATH, {});

    // Build a minimal index.html with one known and one unknown view id
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svc-views-test-'));
    fs.mkdirSync(path.join(tmpDir, 'server', 'routes'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'src', 'js', 'modules'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'public', 'partials'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.claude', 'docs'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.claude', 'agents'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'data', 'sessions'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'server', 'config.js'), 'module.exports = {};');

    // index.html with a known view (dashboard) + unknown (superNewView)
    const fakeHtml = `
      <div x-show="view === 'dashboard'"></div>
      <div x-show="view === 'superNewView'"></div>
    `;
    fs.mkdirSync(path.join(tmpDir, 'public'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'public', 'index.html'), fakeHtml);

    const serviceSrc = fs.readFileSync(SERVICE_PATH, 'utf8');
    const patchedSrc = serviceSrc.replace(
      "const ROOT = path.join(__dirname, '..', '..');",
      `const ROOT = ${JSON.stringify(tmpDir)};`,
    );
    const tmpServicePath = path.join(tmpDir, 'system-map-service.js');
    fs.writeFileSync(tmpServicePath, patchedSrc);

    const { buildSystemMap: buildWithTmpRoot } = require(tmpServicePath);
    const map = await buildWithTmpRoot(true);

    const unknown = map.views.find((v) => v.id === 'superNewView');
    assert.ok(unknown, 'superNewView should appear in views list');
    assert.equal(unknown.status, 'unknown', 'unregistered view gets status unknown');

    const known = map.views.find((v) => v.id === 'dashboard');
    assert.ok(known, 'dashboard still present');
    assert.equal(known.status, 'functional');

    // cleanup
    delete require.cache[tmpServicePath];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('system-map route', () => {
  afterEach(() => {
    delete require.cache[ROUTE_PATH];
    delete require.cache[SERVICE_PATH];
    delete require.cache[CONFIG_PATH];
  });

  it('GET / calls buildSystemMap and returns json', async () => {
    const fakeMap = {
      routes: [{ file: 'chat.js', endpoints: [{ method: 'POST', path: '/', description: '' }] }],
      modules: [],
      notionDatabases: [{ name: 'Focus Areas', id: 'abc', propertiesSummary: [], purpose: '' }],
      sheets: [{ key: 'BMC_SPREADSHEET_ID', envVar: 'BMC_SPREADSHEET_ID', idPresent: false, label: 'Bmc' }],
      docs: { docsFiles: ['app-reference.md'], recentSessions: [] },
      agents: [{ name: 'backend-builder', description: 'Backend engineering agent' }],
      views: [{ id: 'chat', label: 'Chat', status: 'functional', partial: 'chat.html', module: 'chat', hasPartial: true, hasModule: true }],
      generatedAt: new Date().toISOString(),
    };

    stubModule(SERVICE_PATH, { buildSystemMap: async () => fakeMap });
    const router = require(ROUTE_PATH);
    const handler = findRouteHandler(router, 'get', '/');
    assert.ok(handler, 'GET / handler is registered');

    let jsonPayload = null;
    let statusCode = null;

    const fakeRes = {
      json(payload) { jsonPayload = payload; },
      status(code) {
        statusCode = code;
        return { json(p) { jsonPayload = p; } };
      },
    };

    await handler({ query: {} }, fakeRes);

    assert.equal(statusCode, null, 'no error status set');
    assert.deepEqual(jsonPayload, fakeMap);
  });

  it('GET / passes force=true when query param set', async () => {
    let capturedForce = null;
    stubModule(SERVICE_PATH, {
      buildSystemMap: async (force) => {
        capturedForce = force;
        return { routes: [], modules: [], notionDatabases: [], sheets: [], docs: { docsFiles: [], recentSessions: [] }, agents: [], views: [], generatedAt: '' };
      },
    });

    const router = require(ROUTE_PATH);
    const handler = findRouteHandler(router, 'get', '/');

    await handler({ query: { force: 'true' } }, {
      json() {},
      status(c) { return { json() {} }; },
    });

    assert.equal(capturedForce, true, 'force=true passed through from query param');
  });
});
