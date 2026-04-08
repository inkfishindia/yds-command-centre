'use strict';

const express = require('express');
const router = express.Router();
const crmService = require('../services/crm-service');
const crmReadModel = require('../read-model/crm');

/**
 * GET /api/crm
 * Aggregated CRM overview — pipeline stats, lead stats, team, flow stats
 */
router.get('/', async (req, res) => {
  try {
    res.json(await crmReadModel.build());
  } catch (err) {
    console.error('CRM overview error:', err);
    res.status(500).json({ error: 'Failed to load CRM data' });
  }
});

/**
 * GET /api/crm/leads
 * Leads from CRM_LEADS sheet with optional filters and pagination
 * Query: status, category, search, page, limit
 */
router.get('/leads', async (req, res) => {
  try {
    res.json(await crmService.getLeads({
      status: req.query.status,
      category: req.query.category,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    }));
  } catch (err) {
    console.error('CRM leads error:', err.message);
    res.status(500).json({ error: 'Failed to load leads' });
  }
});

/**
 * GET /api/crm/leads/:id
 * Single lead with all associated flows
 */
router.get('/leads/:id', async (req, res) => {
  try {
    const result = await crmService.getLead(req.params.id);
    if (result.reason === 'not_found') {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('CRM lead detail error:', err.message);
    res.status(500).json({ error: 'Failed to load lead' });
  }
});

/**
 * GET /api/crm/flows
 * All lead flows enriched with lead name, optional filters
 * Query: status, stage, owner, channel, priority, search
 */
router.get('/flows', async (req, res) => {
  try {
    res.json(await crmService.getFlows({
      status: req.query.status,
      stage: req.query.stage,
      owner: req.query.owner,
      channel: req.query.channel,
      priority: req.query.priority,
      search: req.query.search,
    }));
  } catch (err) {
    console.error('CRM flows error:', err.message);
    res.status(500).json({ error: 'Failed to load flows' });
  }
});

/**
 * GET /api/crm/flows/:id
 * Single flow with lead, details, and suggested actions
 */
router.get('/flows/:id', async (req, res) => {
  try {
    const result = await crmService.getFlow(req.params.id);
    if (result.reason === 'not_found') {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('CRM flow detail error:', err.message);
    res.status(500).json({ error: 'Failed to load flow' });
  }
});

/**
 * GET /api/crm/team
 * System users with flow count stats
 */
router.get('/team', async (req, res) => {
  try {
    res.json(await crmService.getTeam());
  } catch (err) {
    console.error('CRM team error:', err.message);
    res.status(500).json({ error: 'Failed to load team data' });
  }
});

/**
 * GET /api/crm/config
 * CRM config tables: SLA rules, routing rules, flow type config, message templates
 */
router.get('/config', async (req, res) => {
  try {
    res.json(await crmService.getConfig());
  } catch (err) {
    console.error('CRM config error:', err.message);
    res.status(500).json({ error: 'Failed to load CRM config' });
  }
});

module.exports = router;
