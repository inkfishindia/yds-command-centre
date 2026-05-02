'use strict';

/**
 * sessions.js — Route handler for the sessions marketing-ops endpoint.
 *
 * Public exports: getSessions
 *
 * Handler registered onto shared router in index.js.
 * DO NOT put campaign, content, sequence, task, or metric logic here.
 * DO NOT require express or create a sub-router — index.js owns the router.
 */

const marketingOpsService = require('../../services/marketing-ops-service');

// GET /api/marketing-ops/sessions
async function getSessions(req, res) {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
    res.json(await marketingOpsService.getSessions(days));
  } catch (err) {
    console.error('Sessions log error:', err);
    res.status(500).json({ error: 'Failed to load sessions' });
  }
}

module.exports = { getSessions };
