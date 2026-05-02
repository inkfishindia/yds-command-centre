'use strict';

/**
 * sequences.js — Route handler for the sequences marketing-ops endpoint.
 *
 * Public exports: getSequences
 *
 * Handler registered onto shared router in index.js.
 * DO NOT put campaign, content, session, task, or metric logic here.
 * DO NOT require express or create a sub-router — index.js owns the router.
 */

const marketingOpsService = require('../../services/marketing-ops-service');

// GET /api/marketing-ops/sequences
async function getSequences(req, res) {
  try {
    res.json(await marketingOpsService.getSequences({ journeyStage: req.query.journeyStage }));
  } catch (err) {
    console.error('Sequences error:', err);
    res.status(500).json({ error: 'Failed to load sequences' });
  }
}

module.exports = { getSequences };
