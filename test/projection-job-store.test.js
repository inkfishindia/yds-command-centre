'use strict';

const { beforeEach, afterEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const DB_PATH = path.join(__dirname, '../server/services/db.js');
const STORE_PATH = path.join(__dirname, '../server/services/projection-job-store.js');
const JOBS_PATH = path.join(__dirname, '../server/data/projection-jobs.json');

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

describe('Projection Job Store', () => {
  beforeEach(async () => {
    await fs.rm(JOBS_PATH, { force: true });
  });

  afterEach(async () => {
    delete require.cache[DB_PATH];
    delete require.cache[STORE_PATH];
    await fs.rm(JOBS_PATH, { force: true });
  });

  it('creates and loads jobs from file storage', async () => {
    stubModule(DB_PATH, {
      isDatabaseEnabled: () => false,
    });

    const store = require(STORE_PATH);
    await store.createProjectionJob({ trigger: 'manual', requestedModels: ['overview'] });
    const jobs = await store.loadProjectionJobs();

    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].trigger, 'manual');
    assert.deepEqual(jobs[0].requestedModels, ['overview']);
  });

  it('updates an existing job', async () => {
    stubModule(DB_PATH, {
      isDatabaseEnabled: () => false,
    });

    const store = require(STORE_PATH);
    const job = await store.createProjectionJob({ trigger: 'manual' });
    const updated = await store.updateProjectionJob(job.id, {
      status: 'completed',
      finishedAt: '2026-04-09T00:10:00.000Z',
      resultSummary: { total: 2, failed: 0 },
    });

    assert.equal(updated.status, 'completed');
    assert.equal(updated.resultSummary.total, 2);
  });
});
