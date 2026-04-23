'use strict';

const express = require('express');

const config = require('../config');
const db = require('../services/db');
const dbMigrations = require('../services/db-migrations');
const readModelStore = require('../services/read-model-store');
const readModelSync = require('../services/read-model-sync');
const readModelScheduler = require('../services/read-model-scheduler');
const projectionJobStore = require('../services/projection-job-store');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    hasAnthropicKey: !!config.ANTHROPIC_API_KEY,
    hasNotionToken: !!config.NOTION_TOKEN,
    hasDatabaseUrl: !!config.DATABASE_URL,
    model: config.MODEL,
  });
});

router.get('/details', async (req, res) => {
  try {
    const [readModels, sourceHealth, syncRuns, projectionJobs, migrationStatus] = await Promise.all([
      readModelStore.loadAllReadModelStatuses(),
      readModelStore.loadSourceHealth(),
      readModelStore.loadSyncRuns(),
      projectionJobStore.loadProjectionJobs(),
      dbMigrations.getMigrationStatus(),
    ]);
    const syncSummary = await readModelStore.loadLatestSyncStates();

    res.json({
      status: 'ok',
      database: {
        enabled: db.isDatabaseEnabled(),
        ssl: config.DATABASE_SSL,
        migrations: migrationStatus,
      },
      readModels,
      sourceHealth,
      syncRuns: syncRuns.slice(0, 25),
      projectionJobs: projectionJobs.slice(0, 25),
      syncSummary,
      syncSchedule: readModelScheduler.getStatus(),
    });
  } catch (err) {
    console.error('[health] details error:', err.message);
    res.status(500).json({ error: 'Failed to load health details' });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const names = Array.isArray(req.body?.names) && req.body.names.length > 0
      ? req.body.names
      : undefined;

    const result = names
      ? await readModelScheduler.runScheduledSync('manual', names)
      : await readModelScheduler.runScheduledSync('manual');

    if (result?.skipped) {
      return res.status(409).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('[health] sync error:', err.message);
    res.status(500).json({ error: 'Failed to sync read models' });
  }
});

router.post('/sync/:name', async (req, res) => {
  try {
    const result = await readModelSync.syncReadModel(req.params.name);
    if (!result.ok) {
      return res.status(502).json(result);
    }
    res.json(result);
  } catch (err) {
    if (/Unknown read model/i.test(err.message || '')) {
      return res.status(404).json({ error: err.message });
    }
    console.error('[health] sync model error:', err.message);
    res.status(500).json({ error: 'Failed to sync read model' });
  }
});

module.exports = router;
