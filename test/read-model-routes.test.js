'use strict';

const { afterEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROUTE_PATH = path.join(__dirname, '../server/routes/read-models.js');
const STORE_PATH = path.join(__dirname, '../server/services/read-model-store.js');
const SYNC_PATH = path.join(__dirname, '../server/services/read-model-sync.js');

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

describe('Read Model Routes', () => {
  afterEach(() => {
    delete require.cache[ROUTE_PATH];
    delete require.cache[STORE_PATH];
    delete require.cache[SYNC_PATH];
  });

  it('registers index and detail endpoints', () => {
    stubModule(STORE_PATH, {
      loadAllReadModelStatuses: async () => [],
      loadLatestSyncStates: async () => [],
    });
    stubModule(SYNC_PATH, {
      getRegisteredReadModels: () => ({
        overview: { build: async () => ({}) },
      }),
    });

    const router = require(ROUTE_PATH);
    assert.ok(findRouteHandler(router, 'get', '/'));
    assert.ok(findRouteHandler(router, 'get', '/:name'));
  });

  it('returns registered models with persisted status and sync state', async () => {
    stubModule(STORE_PATH, {
      loadAllReadModelStatuses: async () => [
        { name: 'overview', partial: false, stale: false, persistedAt: '2026-04-09T00:00:00.000Z' },
      ],
      loadLatestSyncStates: async () => [
        { name: 'overview', lastStatus: 'ok', lastSuccessAt: '2026-04-09T00:00:00.000Z' },
      ],
    });
    stubModule(SYNC_PATH, {
      getRegisteredReadModels: () => ({
        overview: { build: async () => ({}) },
        ops: { build: async () => ({}) },
      }),
    });

    const router = require(ROUTE_PATH);
    const handler = findRouteHandler(router, 'get', '/');
    let jsonPayload = null;

    await handler({}, {
      json(payload) {
        jsonPayload = payload;
      },
      status(code) {
        throw new Error(`Unexpected status ${code}`);
      },
    });

    assert.equal(jsonPayload.models.length, 2);
    assert.equal(jsonPayload.models[0].name, 'ops');
    assert.equal(jsonPayload.models[0].sync, null);
    assert.equal(jsonPayload.models[1].name, 'overview');
    assert.equal(jsonPayload.models[1].sync.lastStatus, 'ok');
  });

  it('returns the built read model for known names', async () => {
    stubModule(STORE_PATH, {
      loadAllReadModelStatuses: async () => [],
      loadLatestSyncStates: async () => [],
    });
    stubModule(SYNC_PATH, {
      getRegisteredReadModels: () => ({
        overview: {
          build: async () => ({ data: { ok: true }, meta: { partial: false } }),
        },
      }),
    });

    const router = require(ROUTE_PATH);
    const handler = findRouteHandler(router, 'get', '/:name');
    let jsonPayload = null;

    await handler({ params: { name: 'overview' } }, {
      json(payload) {
        jsonPayload = payload;
      },
      status(code) {
        throw new Error(`Unexpected status ${code}`);
      },
    });

    assert.equal(jsonPayload.data.ok, true);
  });

  it('returns 404 for unknown read model names', async () => {
    stubModule(STORE_PATH, {
      loadAllReadModelStatuses: async () => [],
      loadLatestSyncStates: async () => [],
    });
    stubModule(SYNC_PATH, {
      getRegisteredReadModels: () => ({
        overview: { build: async () => ({}) },
      }),
    });

    const router = require(ROUTE_PATH);
    const handler = findRouteHandler(router, 'get', '/:name');
    let statusCode = null;
    let jsonPayload = null;

    await handler({ params: { name: 'missing' } }, {
      json(payload) {
        jsonPayload = payload;
      },
      status(code) {
        statusCode = code;
        return this;
      },
    });

    assert.equal(statusCode, 404);
    assert.match(jsonPayload.error, /Unknown read model/);
  });
});
