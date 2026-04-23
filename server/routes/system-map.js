'use strict';

const express = require('express');
const router = express.Router();
const { buildSystemMap } = require('../services/system-map-service');

/**
 * GET /api/system-map
 * Aggregates the app's own structure: routes, frontend modules, Notion databases,
 * Sheets IDs, docs inventory, and agent configs.
 * Cached 60s server-side. Pass ?force=true to bust the cache.
 */
router.get('/', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const map = await buildSystemMap(force);
    res.json(map);
  } catch (err) {
    console.error('[system-map] error:', err);
    res.status(500).json({ error: err.message || 'Failed to build system map' });
  }
});

module.exports = router;
