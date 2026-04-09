'use strict';

const { afterEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const SYNC_SERVICE_PATH = path.join(__dirname, '../server/services/read-model-sync.js');
const STORE_PATH = path.join(__dirname, '../server/services/read-model-store.js');
const ACTION_QUEUE_PATH = path.join(__dirname, '../server/read-model/action-queue.js');
const DASHBOARD_PATH = path.join(__dirname, '../server/read-model/dashboard.js');
const OVERVIEW_PATH = path.join(__dirname, '../server/read-model/overview.js');
const OPS_PATH = path.join(__dirname, '../server/read-model/ops.js');
const CRM_PATH = path.join(__dirname, '../server/read-model/crm.js');
const MKT_PATH = path.join(__dirname, '../server/read-model/marketing-ops.js');
const TECH_PATH = path.join(__dirname, '../server/read-model/tech-team.js');

function stubReadModel(modulePath, impl) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports: impl,
    parent: null,
    children: [],
    paths: [],
  };
}

describe('Read Model Sync Service', () => {
  afterEach(() => {
    delete require.cache[SYNC_SERVICE_PATH];
    delete require.cache[STORE_PATH];
    delete require.cache[ACTION_QUEUE_PATH];
    delete require.cache[DASHBOARD_PATH];
    delete require.cache[OVERVIEW_PATH];
    delete require.cache[OPS_PATH];
    delete require.cache[CRM_PATH];
    delete require.cache[MKT_PATH];
    delete require.cache[TECH_PATH];
  });

  it('syncs all registered read models and reports statuses', async () => {
    const okPayload = { meta: { partial: false, stale: false, degradedSources: [] } };
    const syncRuns = [];
    stubReadModel(STORE_PATH, { appendSyncRun: async (run) => { syncRuns.push(run); } });
    stubReadModel(ACTION_QUEUE_PATH, { build: async () => okPayload });
    stubReadModel(DASHBOARD_PATH, { build: async () => okPayload });
    stubReadModel(OVERVIEW_PATH, { build: async () => okPayload });
    stubReadModel(OPS_PATH, { build: async () => okPayload });
    stubReadModel(CRM_PATH, { build: async () => okPayload });
    stubReadModel(MKT_PATH, { build: async () => okPayload });
    stubReadModel(TECH_PATH, { build: async () => okPayload });

    const syncService = require(SYNC_SERVICE_PATH);
    const result = await syncService.syncAllReadModels();

    assert.equal(result.results.length, 7);
    assert.equal(syncRuns.length, 7);
    result.results.forEach((item) => {
      assert.equal(item.ok, true);
      assert.equal(item.partial, false);
    });
  });

  it('returns an error result for unknown read model names', async () => {
    stubReadModel(ACTION_QUEUE_PATH, { build: async () => ({ meta: {} }) });
    stubReadModel(DASHBOARD_PATH, { build: async () => ({ meta: {} }) });
    stubReadModel(OVERVIEW_PATH, { build: async () => ({ meta: {} }) });
    stubReadModel(OPS_PATH, { build: async () => ({ meta: {} }) });
    stubReadModel(CRM_PATH, { build: async () => ({ meta: {} }) });
    stubReadModel(MKT_PATH, { build: async () => ({ meta: {} }) });
    stubReadModel(TECH_PATH, { build: async () => ({ meta: {} }) });

    const syncService = require(SYNC_SERVICE_PATH);
    await assert.rejects(() => syncService.syncReadModel('missing'), /Unknown read model/);
  });

  it('records failed sync runs', async () => {
    const syncRuns = [];
    stubReadModel(STORE_PATH, { appendSyncRun: async (run) => { syncRuns.push(run); } });
    stubReadModel(ACTION_QUEUE_PATH, { build: async () => ({ meta: {} }) });
    stubReadModel(DASHBOARD_PATH, { build: async () => ({ meta: {} }) });
    stubReadModel(OVERVIEW_PATH, { build: async () => { throw new Error('boom'); } });
    stubReadModel(OPS_PATH, { build: async () => ({ meta: {} }) });
    stubReadModel(CRM_PATH, { build: async () => ({ meta: {} }) });
    stubReadModel(MKT_PATH, { build: async () => ({ meta: {} }) });
    stubReadModel(TECH_PATH, { build: async () => ({ meta: {} }) });

    const syncService = require(SYNC_SERVICE_PATH);
    const result = await syncService.syncReadModel('overview');

    assert.equal(result.ok, false);
    assert.equal(syncRuns.length, 1);
    assert.equal(syncRuns[0].error, 'boom');
  });
});
