const express = require('express');
const router = express.Router();
const marketingOpsService = require('../services/marketing-ops-service');

// GET /api/marketing-ops — aggregated summary
router.get('/', async (req, res) => {
  try {
    res.json(await marketingOpsService.getSummary());
  } catch (err) {
    console.error('Marketing ops summary error:', err);
    res.status(500).json({ error: 'Failed to load marketing ops data' });
  }
});

// GET /api/marketing-ops/campaigns
router.get('/campaigns', async (req, res) => {
  try {
    res.json(await marketingOpsService.getCampaigns({ stage: req.query.stage }));
  } catch (err) {
    console.error('Campaigns error:', err);
    res.status(500).json({ error: 'Failed to load campaigns' });
  }
});

// GET /api/marketing-ops/content
router.get('/content', async (req, res) => {
  try {
    res.json(await marketingOpsService.getContent({ status: req.query.status }));
  } catch (err) {
    console.error('Content calendar error:', err);
    res.status(500).json({ error: 'Failed to load content calendar' });
  }
});

// GET /api/marketing-ops/sequences
router.get('/sequences', async (req, res) => {
  try {
    res.json(await marketingOpsService.getSequences({ journeyStage: req.query.journeyStage }));
  } catch (err) {
    console.error('Sequences error:', err);
    res.status(500).json({ error: 'Failed to load sequences' });
  }
});

// GET /api/marketing-ops/sessions
router.get('/sessions', async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
    res.json(await marketingOpsService.getSessions(days));
  } catch (err) {
    console.error('Sessions log error:', err);
    res.status(500).json({ error: 'Failed to load sessions' });
  }
});

// PATCH /api/marketing-ops/campaigns/:id — update campaign property (requires approval)
router.patch('/campaigns/:id', async (req, res) => {
  const pageId = req.params.id;
  if (!/^[a-f0-9]{32}$|^[a-f0-9-]{36}$/.test(pageId)) {
    return res.status(400).json({ error: 'Invalid page ID format' });
  }

  const { property, value } = req.body;

  if (!property || !value) {
    return res.status(400).json({ error: 'property and value are required' });
  }

  const allowed = {
    Stage: ['Briefing', 'In Progress', 'Review', 'Live', 'Complete'],
    Status: ['On Track', 'At Risk', 'Blocked', 'Needs Dan'],
  };

  if (!allowed[property]) {
    return res.status(400).json({ error: 'Invalid property. Allowed: Stage, Status' });
  }

  if (!allowed[property].includes(value)) {
    return res.status(400).json({ error: `Invalid value for ${property}. Allowed: ${allowed[property].join(', ')}` });
  }

  try {
    const result = await marketingOpsService.updateCampaignProperty(pageId, property, value);
    res.json(result);
  } catch (err) {
    console.error('Campaign update error:', err);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// GET /api/marketing-ops/campaigns/:id/commitments — commitments linked to a campaign
router.get('/campaigns/:id/commitments', async (req, res) => {
  const pageId = req.params.id;
  if (!/^[a-f0-9]{32}$|^[a-f0-9-]{36}$/.test(pageId)) {
    return res.status(400).json({ error: 'Invalid page ID format' });
  }
  try {
    res.json(await marketingOpsService.getCampaignCommitments(pageId));
  } catch (err) {
    console.error('Campaign commitments error:', err);
    res.status(500).json({ error: 'Failed to load campaign commitments' });
  }
});

// GET /api/marketing-ops/metrics — key business metrics
router.get('/metrics', async (req, res) => {
  try {
    res.json(await marketingOpsService.getMetrics());
  } catch (err) {
    console.error('Metrics error:', err);
    res.status(500).json({ error: 'Failed to load metrics' });
  }
});

module.exports = router;
