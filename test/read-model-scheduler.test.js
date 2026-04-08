'use strict';

const { afterEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const SCHEDULER_PATH = path.join(__dirname, '../server/services/read-model-scheduler.js');
const CONFIG_PATH = path.join(__dirname, '../server/config.js');
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

describe('Read Model Scheduler', () => {
  afterEach(() => {
    delete require.cache[SCHEDULER_PATH];
    delete require.cache[CONFIG_PATH];
    delete require.cache[SYNC_PATH];
  });

  it('reports disabled status when started disabled', () => {
    stubModule(CONFIG_PATH, {
      READ_MODEL_SYNC_ENABLED: false,
      READ_MODEL_SYNC_INTERVAL_MS: 60000,
      READ_MODEL_SYNC_STARTUP_DELAY_MS: 1000,
    });
    stubModule(SYNC_PATH, { syncAllReadModels: async () => ({ results: [] }) });

    const scheduler = require(SCHEDULER_PATH);
    const status = scheduler.startScheduler({ enabled: false });

    assert.equal(status.enabled, false);
    assert.equal(status.nextRunAt, null);
  });

  it('guards against overlapping runs', async () => {
    let resolveSync;
    stubModule(CONFIG_PATH, {
      READ_MODEL_SYNC_ENABLED: true,
      READ_MODEL_SYNC_INTERVAL_MS: 60000,
      READ_MODEL_SYNC_STARTUP_DELAY_MS: 1000,
    });
    stubModule(SYNC_PATH, {
      syncAllReadModels: () => new Promise((resolve) => {
        resolveSync = resolve;
      }),
    });

    const scheduler = require(SCHEDULER_PATH);
    const firstRun = scheduler.runScheduledSync('manual');
    const secondRun = await scheduler.runScheduledSync('manual');

    assert.equal(secondRun.skipped, true);
    assert.match(secondRun.reason, /already running/i);

    resolveSync({ results: [] });
    await firstRun;
    scheduler.stopScheduler();
  });
});
