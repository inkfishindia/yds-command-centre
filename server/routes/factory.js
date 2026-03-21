const express = require('express');
const router = express.Router();
const factoryService = require('../services/factory-service');

/**
 * GET /api/factory/config
 * Returns the full factory config (machines, zones, order_mix, operating, formulas).
 */
router.get('/config', async (req, res) => {
  try {
    const config = await factoryService.getConfig();
    res.json(config);
  } catch (err) {
    console.error('Factory config load error:', err);
    res.status(500).json({ error: 'Failed to load factory config' });
  }
});

/**
 * PUT /api/factory/config
 * Overwrite the full config. Formulas section is preserved from disk (read-only).
 * Body: full config object (machines, zones, order_mix, operating).
 */
router.put('/config', async (req, res) => {
  try {
    const updated = await factoryService.replaceConfig(req.body);
    res.json(updated);
  } catch (err) {
    if (err.message === 'Request body must be a JSON object') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to save factory config', detail: err.message });
  }
});

/**
 * POST /api/factory/machines
 * Add a new machine. Required fields: id, name, type, zone.
 * Optional fields: formula (string), rules (array).
 * Body: machine object.
 */
router.post('/machines', async (req, res) => {
  try {
    const config = await factoryService.addMachine(req.body);
    res.status(201).json(config);
  } catch (err) {
    if (
      err.message === 'Missing required fields: id, name, type, zone' ||
      err.message === 'formula must be a string' ||
      err.message === 'rules must be an array' ||
      err.message.includes('already exists')
    ) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to add machine', detail: err.message });
  }
});

/**
 * PUT /api/factory/machines/:id
 * Update a single machine by id.
 * Optional fields: formula (string), rules (array).
 * Body: partial or full machine object (id field is preserved from the URL param).
 */
router.put('/machines/:id', async (req, res) => {
  try {
    const config = await factoryService.updateMachine(req.params.id, req.body);
    res.json(config);
  } catch (err) {
    if (
      err.message === 'Request body must be a JSON object' ||
      err.message === 'formula must be a string' ||
      err.message === 'rules must be an array'
    ) {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update machine', detail: err.message });
  }
});

/**
 * DELETE /api/factory/machines/:id
 * Remove a machine by id.
 */
router.delete('/machines/:id', async (req, res) => {
  try {
    const config = await factoryService.deleteMachine(req.params.id);
    res.json(config);
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to delete machine', detail: err.message });
  }
});

/**
 * PUT /api/factory/zones/:id
 * Update a single zone by id.
 * Body: partial or full zone object (id field is preserved from the URL param).
 */
router.put('/zones/:id', async (req, res) => {
  try {
    const config = await factoryService.updateZone(req.params.id, req.body);
    res.json(config);
  } catch (err) {
    if (err.message === 'Request body must be a JSON object') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update zone', detail: err.message });
  }
});

/**
 * PUT /api/factory/operating
 * Replace the operating assumptions object.
 * Body: operating object (shift_hours, orders_per_day, etc.).
 */
router.put('/operating', async (req, res) => {
  try {
    const config = await factoryService.updateOperating(req.body);
    res.json(config);
  } catch (err) {
    if (err.message === 'Request body must be a JSON object') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update operating assumptions', detail: err.message });
  }
});

module.exports = router;
