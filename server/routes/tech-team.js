const express = require('express');
const router = express.Router();
const techTeamService = require('../services/tech-team-service');

// GET /api/tech-team — Tech team summary (command center data)
router.get('/', async (req, res) => {
  try {
    res.json(await techTeamService.getSummary());
  } catch (err) {
    console.error('Tech team summary error:', err);
    res.status(500).json({ error: 'Failed to load tech team data' });
  }
});

// GET /api/tech-team/sprint — Sprint board items with optional filters
router.get('/sprint', async (req, res) => {
  try {
    res.json(await techTeamService.getSprintItems({
      status: req.query.status,
      system: req.query.system,
      priority: req.query.priority,
      type: req.query.type,
    }));
  } catch (err) {
    console.error('Sprint items error:', err);
    res.status(500).json({ error: 'Failed to load sprint items' });
  }
});

// GET /api/tech-team/bugs — Sprint items filtered to Type=Bug
router.get('/bugs', async (req, res) => {
  try {
    res.json(await techTeamService.getBugs());
  } catch (err) {
    console.error('Bugs error:', err);
    res.status(500).json({ error: 'Failed to load bugs' });
  }
});

// GET /api/tech-team/specs — Spec pipeline
router.get('/specs', async (req, res) => {
  try {
    res.json(await techTeamService.getSpecs({ status: req.query.status }));
  } catch (err) {
    console.error('Specs error:', err);
    res.status(500).json({ error: 'Failed to load specs' });
  }
});

// GET /api/tech-team/decisions — Tech decision log
router.get('/decisions', async (req, res) => {
  try {
    res.json(await techTeamService.getDecisions());
  } catch (err) {
    console.error('Tech decisions error:', err);
    res.status(500).json({ error: 'Failed to load tech decisions' });
  }
});

// GET /api/tech-team/velocity — Sprint archive for velocity charts
router.get('/velocity', async (req, res) => {
  try {
    res.json(await techTeamService.getVelocity());
  } catch (err) {
    console.error('Velocity error:', err);
    res.status(500).json({ error: 'Failed to load velocity data' });
  }
});

// GET /api/tech-team/agents — Agent registry + skill catalog from file system
router.get('/agents', async (req, res) => {
  try {
    res.json(await techTeamService.getAgentsCatalog());
  } catch (err) {
    console.error('Agents error:', err);
    res.status(500).json({ error: 'Failed to load agent data' });
  }
});

// GET /api/tech-team/strategy — Strategy cascade from Google Sheets
router.get('/strategy', async (req, res) => {
  try {
    res.json(await techTeamService.getStrategy());
  } catch (err) {
    console.error('Strategy error:', err);
    res.status(500).json({ error: 'Failed to load strategy data' });
  }
});

// GET /api/tech-team/github — GitHub repo activity
router.get('/github', async (req, res) => {
  try {
    res.json(await techTeamService.getGithubActivity());
  } catch (err) {
    console.error('GitHub error:', err);
    res.status(500).json({ error: 'Failed to load GitHub data' });
  }
});

// GET /api/tech-team/backlog — Tech backlog with optional ?status=&priority=&area=&type= filters
router.get('/backlog', async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.priority) filters.priority = req.query.priority;
    if (req.query.area) filters.area = req.query.area;
    if (req.query.type) filters.type = req.query.type;
    res.json(await techTeamService.getTechBacklog(filters));
  } catch (err) {
    console.error('Tech backlog error:', err);
    res.status(500).json({ error: 'Failed to load tech backlog' });
  }
});

// PATCH /api/tech-team/sprint/:id — Update sprint item property (direct user write)
router.patch('/sprint/:id', async (req, res) => {
  try {
    const pageId = req.params.id;
    if (!/^[a-f0-9]{32}$|^[a-f0-9-]{36}$/.test(pageId)) {
      return res.status(400).json({ error: 'Invalid page ID format' });
    }

    const { property, value } = req.body;
    if (!property || !value) {
      return res.status(400).json({ error: 'property and value are required' });
    }

    const allowedProperties = ['Status', 'Priority', 'Waiting On'];
    if (!allowedProperties.includes(property)) {
      return res.status(400).json({ error: `Property must be one of: ${allowedProperties.join(', ')}` });
    }

    const allowedValues = {
      'Status': ['Backlog', 'This Sprint', 'In Progress', 'In Review', 'Blocked', 'Done', 'Cancelled'],
      'Priority': ['P0 - Critical', 'P1 - High', 'P2 - Medium', 'P3 - Low'],
      'Waiting On': ['Dan', 'Arjun', 'Developer', 'External', 'Platform Team'],
    };

    if (!allowedValues[property].includes(value)) {
      return res.status(400).json({ error: `Invalid value for ${property}. Allowed: ${allowedValues[property].join(', ')}` });
    }

    const result = await techTeamService.updateSprintItemProperty(pageId, property, value);
    res.json(result);
  } catch (err) {
    console.error('Sprint item update error:', err);
    res.status(500).json({ error: 'Failed to update sprint item' });
  }
});

module.exports = router;
