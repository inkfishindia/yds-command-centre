'use strict';

const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheets');
const hydrationService = require('../services/hydration');

/**
 * GET /api/crm
 * Aggregated CRM summary — pipeline stats from existing pipeline + people from sheets registry
 */
router.get('/', async (req, res) => {
  try {
    const [pipeline, people] = await Promise.all([
      sheetsService.getPipelineData(),
      sheetsService.fetchSheet('PEOPLE').catch(() => ({ available: false })),
    ]);

    res.json({
      pipeline,
      people: people.available !== false ? (people.rows || []) : [],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('CRM summary error:', err);
    res.status(500).json({ error: 'Failed to load CRM data' });
  }
});

/**
 * GET /api/crm/people
 * Team/people data from the PEOPLE sheet, hydrated (resolves manager_id)
 */
router.get('/people', async (req, res) => {
  try {
    const data = await hydrationService.hydrateSheetData('PEOPLE');
    res.json(data);
  } catch (err) {
    console.error('CRM people error:', err.message);
    res.status(500).json({ error: 'Failed to load people data' });
  }
});

/**
 * GET /api/crm/projects
 * Projects from the PROJECTS sheet, hydrated (resolves owner, business unit)
 */
router.get('/projects', async (req, res) => {
  try {
    const data = await hydrationService.hydrateSheetData('PROJECTS');
    if (data.available === false) return res.json(data);

    let rows = data.rows || [];
    if (req.query.status) {
      rows = rows.filter(r => (r.Status || r.status || '').toLowerCase() === req.query.status.toLowerCase());
    }
    if (req.query.owner) {
      rows = rows.filter(r => (r.owner_User_id_resolved || '').toLowerCase().includes(req.query.owner.toLowerCase()));
    }

    res.json({ available: true, headers: data.headers, rows });
  } catch (err) {
    console.error('CRM projects error:', err.message);
    res.status(500).json({ error: 'Failed to load projects data' });
  }
});

/**
 * GET /api/crm/tasks
 * Tasks from the TASKS sheet, hydrated (resolves assignee, project name)
 */
router.get('/tasks', async (req, res) => {
  try {
    const data = await hydrationService.hydrateSheetData('TASKS');
    if (data.available === false) return res.json(data);

    let rows = data.rows || [];
    if (req.query.status) {
      rows = rows.filter(r => (r.status || '').toLowerCase() === req.query.status.toLowerCase());
    }
    if (req.query.assignee) {
      rows = rows.filter(r => (r.assignee_User_id_resolved || '').toLowerCase().includes(req.query.assignee.toLowerCase()));
    }
    if (req.query.project) {
      rows = rows.filter(r => (r['Project id_resolved'] || '').toLowerCase().includes(req.query.project.toLowerCase()));
    }

    res.json({ available: true, headers: data.headers, rows });
  } catch (err) {
    console.error('CRM tasks error:', err.message);
    res.status(500).json({ error: 'Failed to load tasks data' });
  }
});

/**
 * GET /api/crm/campaigns
 * Campaigns from the Execution spreadsheet CAMPAIGNS sheet
 */
router.get('/campaigns', async (req, res) => {
  try {
    const data = await sheetsService.fetchSheet('CAMPAIGNS');
    if (data.available === false) return res.json(data);

    let rows = data.rows || [];
    if (req.query.status) {
      rows = rows.filter(r => (r.status || '').toLowerCase() === req.query.status.toLowerCase());
    }

    res.json({ available: true, headers: data.headers, rows });
  } catch (err) {
    console.error('CRM campaigns error:', err.message);
    res.status(500).json({ error: 'Failed to load campaigns data' });
  }
});

/**
 * GET /api/crm/business-units
 * Business units from Strategy spreadsheet, hydrated
 */
router.get('/business-units', async (req, res) => {
  try {
    const data = await hydrationService.hydrateSheetData('BUSINESS_UNITS');
    res.json(data);
  } catch (err) {
    console.error('CRM business-units error:', err.message);
    res.status(500).json({ error: 'Failed to load business units' });
  }
});

/**
 * PATCH /api/crm/tasks/:rowIdx
 * Update a task row (status, assignee, priority, etc.)
 */
router.patch('/tasks/:rowIdx', async (req, res) => {
  const rowIndex = parseInt(req.params.rowIdx, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    return res.status(400).json({ error: 'rowIdx must be an integer >= 2' });
  }
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }
  try {
    const result = await sheetsService.updateRow('TASKS', rowIndex, req.body);
    res.json(result);
  } catch (err) {
    console.error('CRM task update error:', err.message);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

/**
 * POST /api/crm/tasks
 * Create a new task
 */
router.post('/tasks', async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }
  try {
    const result = await sheetsService.appendRow('TASKS', req.body);
    res.status(201).json(result);
  } catch (err) {
    console.error('CRM task create error:', err.message);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

module.exports = router;
