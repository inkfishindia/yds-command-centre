const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs/promises');

const PROJECTS_PATH = path.join(__dirname, '../data/projects.json');
let projectsCache = null;

async function loadProjects() {
  if (projectsCache) return projectsCache;
  const raw = await fs.readFile(PROJECTS_PATH, 'utf8');
  projectsCache = JSON.parse(raw);
  return projectsCache;
}

async function saveProjects(projects) {
  await fs.writeFile(PROJECTS_PATH, JSON.stringify(projects, null, 2));
  projectsCache = projects;
}

// GET /api/registry — all projects sorted by priority desc
router.get('/', async (req, res) => {
  try {
    const projects = [...await loadProjects()].sort((a, b) => b.priority - a.priority);

    // Compute aggregate stats
    const stats = {
      total: projects.length,
      active: projects.filter(p => p.status === 'active').length,
      totalAgents: projects.reduce((sum, p) => sum + (p.agent_count || 0), 0),
      totalSkills: projects.reduce((sum, p) => sum + (p.skill_count || 0), 0),
      totalCommands: projects.reduce((sum, p) => sum + (p.command_count || 0), 0),
    };

    res.json({ projects, stats });
  } catch (err) {
    console.error('Registry load error:', err);
    res.status(500).json({ error: 'Failed to load project registry' });
  }
});

// GET /api/registry/:slug — single project
router.get('/:slug', async (req, res) => {
  try {
    const projects = await loadProjects();
    const project = projects.find(p => p.slug === req.params.slug);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    console.error('Registry load error:', err);
    res.status(500).json({ error: 'Failed to load project' });
  }
});

// PATCH /api/registry/:slug — update a project field
router.patch('/:slug', async (req, res) => {
  try {
    const projects = [...await loadProjects()];
    const idx = projects.findIndex(p => p.slug === req.params.slug);
    if (idx === -1) return res.status(404).json({ error: 'Project not found' });

    // Only allow updating safe fields
    const allowed = ['status', 'last_action', 'last_action_date', 'last_action_by',
                     'agent_count', 'skill_count', 'command_count', 'health_score',
                     'description', 'priority'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        // Validate numeric fields
        if (['health_score', 'agent_count', 'skill_count', 'command_count', 'priority'].includes(key)) {
          const num = Number(req.body[key]);
          if (isNaN(num)) {
            return res.status(400).json({ error: `${key} must be a number` });
          }
          updates[key] = num;
          projects[idx][key] = num;
        } else {
          updates[key] = req.body[key];
          projects[idx][key] = req.body[key];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await saveProjects(projects);
    res.json({ ok: true, updated: updates, project: projects[idx] });
  } catch (err) {
    console.error('Registry update error:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

module.exports = router;
