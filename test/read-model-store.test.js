'use strict';

const { afterEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const DB_PATH = path.join(__dirname, '../server/services/db.js');
const STORE_PATH = path.join(__dirname, '../server/services/read-model-store.js');
const READ_MODELS_DIR = path.join(__dirname, '../server/data/read-models');
const SOURCE_HEALTH_PATH = path.join(__dirname, '../server/data/source-health.json');
const SYNC_RUNS_PATH = path.join(__dirname, '../server/data/sync-runs.json');

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

async function cleanup() {
  await fs.rm(READ_MODELS_DIR, { recursive: true, force: true, maxRetries: 3, retryDelay: 25 }).catch(() => {});
  await fs.rm(SOURCE_HEALTH_PATH, { force: true });
  await fs.rm(SYNC_RUNS_PATH, { force: true });
}

describe('Read Model Store', () => {
  afterEach(async () => {
    delete require.cache[DB_PATH];
    delete require.cache[STORE_PATH];
    await cleanup();
  });

  it('saves and loads a read model payload', async () => {
    const store = require(STORE_PATH);
    await store.saveReadModel('ops', {
      data: { ok: true },
      meta: { generatedAt: '2026-04-08T00:00:00.000Z', partial: false },
    });

    const record = await store.loadReadModel('ops');
    assert.equal(record.name, 'ops');
    assert.equal(record.payload.data.ok, true);
    assert.ok(record.persistedAt);
  });

  it('tracks source health updates', async () => {
    const store = require(STORE_PATH);
    await store.updateSourceHealth('crm', {
      pipeline: { status: 'ok', checkedAt: '2026-04-08T00:00:00.000Z' },
      team: { status: 'degraded', checkedAt: '2026-04-08T00:01:00.000Z' },
    });

    const state = await store.loadSourceHealth();
    assert.equal(state.sources.pipeline.readModel, 'crm');
    assert.equal(state.sources.pipeline.status, 'ok');
    assert.equal(state.sources.team.status, 'degraded');
  });

  it('stores sync runs in newest-first order', async () => {
    const store = require(STORE_PATH);
    await store.appendSyncRun({ name: 'overview', ok: true, startedAt: '2026-04-08T00:00:00.000Z' });
    await store.appendSyncRun({ name: 'ops', ok: false, startedAt: '2026-04-08T00:01:00.000Z' });

    const runs = await store.loadSyncRuns();
    assert.equal(runs.length, 2);
    assert.equal(runs[0].name, 'ops');
    assert.equal(runs[1].name, 'overview');
  });

  it('builds latest sync state per model', async () => {
    const store = require(STORE_PATH);
    await store.appendSyncRun({ name: 'overview', ok: true, startedAt: '2026-04-08T00:00:00.000Z', finishedAt: '2026-04-08T00:01:00.000Z' });
    await store.appendSyncRun({ name: 'overview', ok: false, startedAt: '2026-04-08T00:02:00.000Z', finishedAt: '2026-04-08T00:03:00.000Z', error: 'offline' });
    await store.appendSyncRun({ name: 'ops', ok: true, partial: true, startedAt: '2026-04-08T00:04:00.000Z', finishedAt: '2026-04-08T00:05:00.000Z' });

    const summary = await store.loadLatestSyncStates();
    const overview = summary.find((item) => item.name === 'overview');
    const ops = summary.find((item) => item.name === 'ops');

    assert.equal(overview.lastStatus, 'failed');
    assert.equal(overview.lastFailureAt, '2026-04-08T00:03:00.000Z');
    assert.equal(overview.lastSuccessAt, '2026-04-08T00:01:00.000Z');
    assert.equal(overview.lastError, 'offline');
    assert.equal(ops.lastStatus, 'partial');
  });

  it('uses database-backed read model records when available', async () => {
    stubModule(DB_PATH, {
      isDatabaseEnabled: () => true,
      query: async (text) => {
        if (/FROM app_read_models/i.test(text)) {
          return {
            rows: [{
              name: 'dashboard',
              persisted_at: '2026-04-09T00:00:00.000Z',
              payload_json: {
                data: { ok: true },
                meta: { generatedAt: '2026-04-09T00:00:00.000Z' },
              },
            }],
          };
        }
        return { rows: [] };
      },
    });

    const store = require(STORE_PATH);
    const record = await store.loadReadModel('dashboard');

    assert.equal(record.name, 'dashboard');
    assert.equal(record.payload.data.ok, true);
  });

  it('writes read model records to the database when configured', async () => {
    const queries = [];
    stubModule(DB_PATH, {
      isDatabaseEnabled: () => true,
      query: async (text, params) => {
        queries.push({ text, params });
        return { rows: [] };
      },
    });

    const store = require(STORE_PATH);
    await store.saveReadModel('ops', {
      data: { ok: true },
      meta: { generatedAt: '2026-04-08T00:00:00.000Z', partial: false, degradedSources: [] },
    });

    assert.ok(queries.some((entry) => /INSERT INTO app_read_models/i.test(entry.text)));
  });

  it('writeJson swallows ENOENT without throwing', async () => {
    // Patch fs.mkdir and fs.writeFile on the required module's fs to simulate read-only FS.
    // We do this by loading the store (which loads fs), then exercising saveReadModel
    // from a path that will always fail with ENOENT on mkdir.
    // Instead we test the observable behaviour: saveReadModel with a patched writeFile.

    // Use a spy on the real fs module via module cache manipulation.
    const fsMod = require('node:fs/promises');
    const origMkdir = fsMod.mkdir;
    const origWriteFile = fsMod.writeFile;

    // Make mkdir succeed but writeFile throw ENOENT
    fsMod.writeFile = async () => {
      const err = new Error('ENOENT: no such file or directory');
      err.code = 'ENOENT';
      throw err;
    };

    const store = require(STORE_PATH);
    let threw = false;
    try {
      await store.saveReadModel('enoent-test', { data: { ok: true }, meta: {} });
    } catch {
      threw = true;
    }

    fsMod.mkdir = origMkdir;
    fsMod.writeFile = origWriteFile;

    assert.equal(threw, false, 'saveReadModel must not throw when fs is ENOENT');
  });

  it('writeJson throws on unexpected fs errors (EINVAL)', async () => {
    const fsMod = require('node:fs/promises');
    const origMkdir = fsMod.mkdir;
    const origWriteFile = fsMod.writeFile;

    fsMod.writeFile = async () => {
      const err = new Error('EINVAL: invalid argument');
      err.code = 'EINVAL';
      throw err;
    };

    const store = require(STORE_PATH);
    let threw = false;
    try {
      await store.saveReadModel('einval-test', { data: {}, meta: {} });
    } catch {
      threw = true;
    }

    fsMod.mkdir = origMkdir;
    fsMod.writeFile = origWriteFile;

    assert.equal(threw, true, 'saveReadModel must re-throw unexpected fs errors');
  });

  it('saveReadModel returns record and skips fs when EROFS, DB disabled', async () => {
    const fsMod = require('node:fs/promises');
    const origMkdir = fsMod.mkdir;
    const origWriteFile = fsMod.writeFile;

    fsMod.writeFile = async () => {
      const err = new Error('EROFS: read-only file system');
      err.code = 'EROFS';
      throw err;
    };

    const store = require(STORE_PATH);
    const payload = { data: { x: 1 }, meta: { generatedAt: '2026-04-23T00:00:00.000Z' } };
    let record;
    let threw = false;
    try {
      record = await store.saveReadModel('erofs-no-db', payload);
    } catch {
      threw = true;
    }

    fsMod.mkdir = origMkdir;
    fsMod.writeFile = origWriteFile;

    assert.equal(threw, false, 'must not throw');
    assert.ok(record, 'must return a record');
    assert.equal(record.name, 'erofs-no-db');
    assert.deepEqual(record.payload, payload);
  });

  it('saveReadModel calls DB INSERT when fs throws EROFS and DB is enabled', async () => {
    const fsMod = require('node:fs/promises');
    const origWriteFile = fsMod.writeFile;

    fsMod.writeFile = async () => {
      const err = new Error('EROFS: read-only file system');
      err.code = 'EROFS';
      throw err;
    };

    const queries = [];
    stubModule(DB_PATH, {
      isDatabaseEnabled: () => true,
      query: async (text, params) => {
        queries.push({ text, params });
        return { rows: [] };
      },
    });

    const store = require(STORE_PATH);
    let threw = false;
    try {
      await store.saveReadModel('erofs-with-db', {
        data: { ok: true },
        meta: { generatedAt: '2026-04-23T00:00:00.000Z', degradedSources: [] },
      });
    } catch {
      threw = true;
    }

    fsMod.writeFile = origWriteFile;

    assert.equal(threw, false, 'must not throw even with EROFS');
    assert.ok(
      queries.some((entry) => /INSERT INTO app_read_models/i.test(entry.text)),
      'DB INSERT must still be called when fs fails',
    );
  });
});
