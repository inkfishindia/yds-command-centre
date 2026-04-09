'use strict';

const express = require('express');

const readModelStore = require('../services/read-model-store');
const readModelSync = require('../services/read-model-sync');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [statuses, syncSummary] = await Promise.all([
      readModelStore.loadAllReadModelStatuses(),
      readModelStore.loadLatestSyncStates(),
    ]);

    const statusByName = new Map(statuses.map((item) => [item.name, item]));
    const syncByName = new Map(syncSummary.map((item) => [item.name, item]));
    const models = Object.keys(readModelSync.getRegisteredReadModels())
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        name,
        ...(statusByName.get(name) || {}),
        sync: syncByName.get(name) || null,
      }));

    res.json({
      models,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[read-models] index error:', err.message);
    res.status(500).json({ error: 'Failed to load read model registry' });
  }
});

router.get('/:name', async (req, res) => {
  try {
    const registry = readModelSync.getRegisteredReadModels();
    const name = String(req.params.name || '').trim();
    const target = registry[name];

    if (!target || typeof target.build !== 'function') {
      return res.status(404).json({ error: `Unknown read model: ${name}` });
    }

    res.json(await target.build());
  } catch (err) {
    console.error(`[read-models] ${req.params.name} error:`, err.message);
    res.status(500).json({ error: 'Failed to load read model' });
  }
});

module.exports = router;
