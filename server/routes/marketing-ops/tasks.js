'use strict';

/**
 * tasks.js — Route handlers for marketing task endpoints.
 *
 * Public exports: getTasks, getTasksSummary
 *
 * Handlers registered onto shared router in index.js.
 * IMPORTANT: getTasksSummary (/tasks/summary) MUST be registered before
 *   getTasks (/tasks) in index.js to win the Express route match.
 * DO NOT put campaign, content, sequence, session, or metric logic here.
 * DO NOT require express or create a sub-router — index.js owns the router.
 */

const marketingOpsService = require('../../services/marketing-ops-service');

// GET /api/marketing-ops/tasks — marketing tasks with optional ?status=&priority=&channel= filters
async function getTasks(req, res) {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.priority) filters.priority = req.query.priority;
    if (req.query.channel) filters.channel = req.query.channel;
    res.json(await marketingOpsService.getMarketingTasks(filters));
  } catch (err) {
    console.error('Marketing tasks error:', err);
    res.status(500).json({ error: 'Failed to load marketing tasks' });
  }
}

// GET /api/marketing-ops/tasks/summary — aggregated stats across all marketing tasks
async function getTasksSummary(req, res) {
  try {
    res.json(await marketingOpsService.getMarketingTasksSummary());
  } catch (err) {
    console.error('Marketing tasks summary error:', err);
    res.status(500).json({ error: 'Failed to load marketing tasks summary' });
  }
}

module.exports = { getTasks, getTasksSummary };
