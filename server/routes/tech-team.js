const express = require('express');
const router = express.Router();
const notionService = require('../services/notion');
const githubService = require('../services/github');
const sheetsService = require('../services/sheets');
const path = require('path');
const fs = require('fs');

// GET /api/tech-team — Tech team summary (command center data)
router.get('/', async (req, res) => {
  try {
    const data = await notionService.getTechTeamSummary();
    res.json(data);
  } catch (err) {
    console.error('Tech team summary error:', err);
    res.status(500).json({ error: 'Failed to load tech team data' });
  }
});

// GET /api/tech-team/sprint — Sprint board items with optional filters
router.get('/sprint', async (req, res) => {
  try {
    let items = await notionService.getSprintItems();
    if (req.query.status) items = items.filter(i => i.Status === req.query.status);
    if (req.query.system) items = items.filter(i => i.System === req.query.system);
    if (req.query.priority) items = items.filter(i => i.Priority === req.query.priority);
    if (req.query.type) items = items.filter(i => i.Type === req.query.type);
    res.json({ items });
  } catch (err) {
    console.error('Sprint items error:', err);
    res.status(500).json({ error: 'Failed to load sprint items' });
  }
});

// GET /api/tech-team/bugs — Sprint items filtered to Type=Bug
router.get('/bugs', async (req, res) => {
  try {
    const items = await notionService.getSprintItems();
    const bugs = items.filter(i => i.Type === 'Bug' && i.Status !== 'Cancelled');
    const stats = {
      total: bugs.length,
      open: bugs.filter(b => b.Status !== 'Done').length,
      byPriority: {},
      bySystem: {},
    };
    bugs.filter(b => b.Status !== 'Done').forEach(b => {
      const p = b.Priority || 'Unset';
      const s = b.System || 'Unset';
      stats.byPriority[p] = (stats.byPriority[p] || 0) + 1;
      stats.bySystem[s] = (stats.bySystem[s] || 0) + 1;
    });
    res.json({ bugs, stats });
  } catch (err) {
    console.error('Bugs error:', err);
    res.status(500).json({ error: 'Failed to load bugs' });
  }
});

// GET /api/tech-team/specs — Spec pipeline
router.get('/specs', async (req, res) => {
  try {
    let specs = await notionService.getSpecLibrary();
    if (req.query.status) specs = specs.filter(s => s.Status === req.query.status);
    res.json({ specs });
  } catch (err) {
    console.error('Specs error:', err);
    res.status(500).json({ error: 'Failed to load specs' });
  }
});

// GET /api/tech-team/decisions — Tech decision log
router.get('/decisions', async (req, res) => {
  try {
    const decisions = await notionService.getTechDecisions();
    res.json({ decisions });
  } catch (err) {
    console.error('Tech decisions error:', err);
    res.status(500).json({ error: 'Failed to load tech decisions' });
  }
});

// GET /api/tech-team/velocity — Sprint archive for velocity charts
router.get('/velocity', async (req, res) => {
  try {
    const archive = await notionService.getSprintArchive();
    res.json({ sprints: archive });
  } catch (err) {
    console.error('Velocity error:', err);
    res.status(500).json({ error: 'Failed to load velocity data' });
  }
});

// GET /api/tech-team/agents — Agent registry + skill catalog from file system
router.get('/agents', async (req, res) => {
  try {
    const agentsDir = path.join(__dirname, '../../.claude/agents');
    const skillsDir = path.join(__dirname, '../../.claude/skills');

    const agents = [];
    if (fs.existsSync(agentsDir)) {
      const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
        const nameMatch = content.match(/^#\s+(.+)/m);
        const modelMatch = content.match(/model[:\s]+(\S+)/im) || content.match(/uses?\s+(sonnet|opus|haiku)/im);
        const descMatch = content.match(/(?:description|purpose)[:\s]+(.+)/im);
        agents.push({
          id: file.replace('.md', ''),
          name: nameMatch ? nameMatch[1].trim() : file.replace('.md', ''),
          model: modelMatch ? modelMatch[1].trim() : 'Unknown',
          description: descMatch ? descMatch[1].trim() : '',
          file: file,
        });
      }
    }

    const skills = [];
    if (fs.existsSync(skillsDir)) {
      const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const indexPath = path.join(skillsDir, entry.name, 'index.md');
          const promptPath = path.join(skillsDir, entry.name, 'prompt.md');
          const readmePath = path.join(skillsDir, entry.name, 'README.md');
          let desc = '';
          for (const p of [indexPath, promptPath, readmePath]) {
            if (fs.existsSync(p)) {
              const content = fs.readFileSync(p, 'utf8');
              const descLine = content.match(/(?:description|purpose)[:\s]+(.+)/im);
              if (descLine) desc = descLine[1].trim();
              break;
            }
          }
          skills.push({ id: entry.name, name: entry.name, description: desc });
        }
      }
    }

    res.json({ agents, skills });
  } catch (err) {
    console.error('Agents error:', err);
    res.status(500).json({ error: 'Failed to load agent data' });
  }
});

// GET /api/tech-team/strategy — Strategy cascade from Google Sheets
router.get('/strategy', async (req, res) => {
  try {
    const data = await sheetsService.getStrategyCascade();
    res.json(data);
  } catch (err) {
    console.error('Strategy error:', err);
    res.status(500).json({ error: 'Failed to load strategy data' });
  }
});

// GET /api/tech-team/github — GitHub repo activity
router.get('/github', async (req, res) => {
  try {
    const data = await githubService.getRepoActivity('inkfishindia', 'YD-CRM');
    res.json(data);
  } catch (err) {
    console.error('GitHub error:', err);
    res.status(500).json({ error: 'Failed to load GitHub data' });
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

    const result = await notionService.updateSprintItemProperty(pageId, property, value);
    res.json(result);
  } catch (err) {
    console.error('Sprint item update error:', err);
    res.status(500).json({ error: 'Failed to update sprint item' });
  }
});

module.exports = router;
