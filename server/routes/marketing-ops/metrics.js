'use strict';

/**
 * metrics.js — Route handlers for metrics and the root summary endpoint.
 *
 * Public exports: getSummary, getMetrics
 *
 * Handlers registered onto shared router in index.js.
 * DO NOT put campaign, content, sequence, session, or task logic here.
 * DO NOT require express or create a sub-router — index.js owns the router.
 */

const marketingOpsService = require('../../services/marketing-ops-service');
const marketingOpsReadModel = require('../../read-model/marketing-ops');

// GET /api/marketing-ops — aggregated summary
async function getSummary(req, res) {
  try {
    res.json(await marketingOpsReadModel.build());
  } catch (err) {
    console.error('Marketing ops summary error:', err);
    res.status(500).json({ error: 'Failed to load marketing ops data' });
  }
}

// GET /api/marketing-ops/metrics — key business metrics
async function getMetrics(req, res) {
  try {
    res.json(await marketingOpsService.getMetrics());
  } catch (err) {
    console.error('Metrics error:', err);
    res.status(500).json({ error: 'Failed to load metrics' });
  }
}

module.exports = { getSummary, getMetrics };
