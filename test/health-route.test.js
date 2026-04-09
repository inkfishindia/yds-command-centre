'use strict';

const { afterEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROUTE_PATH = path.join(__dirname, '../server/routes/health.js');
const CONFIG_PATH = path.join(__dirname, '../server/config.js');
const STORE_PATH = path.join(__dirname, '../server/services/read-model-store.js');
const SYNC_PATH = path.join(__dirname, '../server/services/read-model-sync.js');
const SCHEDULER_PATH = path.join(__dirname, '../server/services/read-model-scheduler.js');
const JOB_STORE_PATH = path.join(__dirname, '../server/services/projection-job-store.js');

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
  const layer = router.stack.find((entry) => entry.route
    && entry.route.path === routePath
    && entry.route.methods[method]);
  return layer?.route?.stack?.[0]?.handle;
}

describe('Health Route', () => {
  afterEach(() => {
    delete require.cache[ROUTE_PATH];
    delete require.cache[CONFIG_PATH];
    delete require.cache[STORE_PATH];
    delete require.cache[SYNC_PATH];
    delete require.cache[SCHEDULER_PATH];
    delete require.cache[JOB_STORE_PATH];
  });

  it('registers the expected health endpoints', () => {
    stubModule(CONFIG_PATH, { ANTHROPIC_API_KEY: '', NOTION_TOKEN: '', MODEL: 'test-model' });
    stubModule(STORE_PATH, {
      loadAllReadModelStatuses: async () => [],
      loadSourceHealth: async () => ({ sources: {} }),
      loadSyncRuns: async () => [],
      loadLatestSyncStates: async () => [],
    });
    stubModule(SYNC_PATH, {
      syncAllReadModels: async () => ({ results: [] }),
      syncReadModel: async () => ({ ok: true }),
    });
    stubModule(JOB_STORE_PATH, {
      loadProjectionJobs: async () => [],
    });
    stubModule(SCHEDULER_PATH, {
      getStatus: () => ({ enabled: false, nextRunAt: null }),
      runScheduledSync: async () => ({ results: [] }),
    });

    const router = require(ROUTE_PATH);
    assert.ok(findRouteHandler(router, 'get', '/'));
    assert.ok(findRouteHandler(router, 'get', '/details'));
    assert.ok(findRouteHandler(router, 'post', '/sync'));
    assert.ok(findRouteHandler(router, 'post', '/sync/:name'));
  });

  it('returns sync runs in details payload', async () => {
    stubModule(CONFIG_PATH, { ANTHROPIC_API_KEY: '', NOTION_TOKEN: '', MODEL: 'test-model' });
    stubModule(STORE_PATH, {
      loadAllReadModelStatuses: async () => [{ name: 'overview' }],
      loadSourceHealth: async () => ({ updatedAt: '2026-04-08T00:00:00.000Z', sources: {} }),
      loadSyncRuns: async () => [{ name: 'overview', ok: true }],
      loadLatestSyncStates: async () => [{ name: 'overview', lastStatus: 'ok' }],
    });
    stubModule(SYNC_PATH, {
      syncAllReadModels: async () => ({ results: [] }),
      syncReadModel: async () => ({ ok: true }),
    });
    stubModule(JOB_STORE_PATH, {
      loadProjectionJobs: async () => [{ id: '1', trigger: 'manual', status: 'completed' }],
    });
    stubModule(SCHEDULER_PATH, {
      getStatus: () => ({ enabled: true, nextRunAt: '2026-04-08T00:15:00.000Z' }),
      runScheduledSync: async () => ({ results: [] }),
    });

    const router = require(ROUTE_PATH);
    const handler = findRouteHandler(router, 'get', '/details');
    let jsonPayload = null;

    await handler({}, {
      json(payload) {
        jsonPayload = payload;
      },
      status(code) {
        throw new Error(`Unexpected status ${code}`);
      },
    });

    assert.equal(jsonPayload.status, 'ok');
    assert.equal(jsonPayload.syncRuns.length, 1);
    assert.equal(jsonPayload.projectionJobs.length, 1);
    assert.equal(jsonPayload.syncRuns[0].name, 'overview');
    assert.equal(jsonPayload.syncSummary[0].name, 'overview');
    assert.equal(jsonPayload.syncSchedule.enabled, true);
  });
});
