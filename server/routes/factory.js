const express = require('express');
const router = express.Router();
const fs = require('fs/promises');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/factory-capacity.json');
let factoryConfigCache = null;

/**
 * Load config from disk. Throws on parse error.
 */
async function loadConfig() {
  if (factoryConfigCache) return factoryConfigCache;
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  factoryConfigCache = JSON.parse(raw);
  return factoryConfigCache;
}

/**
 * Persist config to disk with pretty formatting.
 */
async function saveConfig(config) {
  await fs.writeFile(DATA_FILE, JSON.stringify(config, null, 2), 'utf-8');
  factoryConfigCache = config;
}

/**
 * GET /api/factory/config
 * Returns the full factory config (machines, zones, order_mix, operating, formulas).
 */
router.get('/config', async (req, res) => {
  try {
    const config = await loadConfig();
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
    const current = await loadConfig();
    const body = req.body;

    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    // Preserve formulas — they are read-only
    const updated = { ...body, formulas: current.formulas };
    await saveConfig(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save factory config', detail: err.message });
  }
});

/**
 * Normalise optional formula/rules fields on a machine or zone object.
 * Mutates the object in place and returns it.
 */
function applyFormulaDefaults(obj) {
  if (obj.formula !== undefined && typeof obj.formula !== 'string') {
    throw new Error('formula must be a string');
  }
  if (obj.rules !== undefined && !Array.isArray(obj.rules)) {
    throw new Error('rules must be an array');
  }
  if (obj.formula === undefined) {
    obj.formula = 'theoretical_pcs_per_hour * (available_minutes / 60) * efficiency_factor';
  }
  if (obj.rules === undefined) {
    obj.rules = [];
  }
  return obj;
}

/**
 * POST /api/factory/machines
 * Add a new machine. Required fields: id, name, type, zone.
 * Optional fields: formula (string), rules (array).
 * Body: machine object.
 */
router.post('/machines', async (req, res) => {
  try {
    const machine = req.body;

    if (!machine || !machine.id || !machine.name || !machine.type || !machine.zone) {
      return res.status(400).json({ error: 'Missing required fields: id, name, type, zone' });
    }

    try {
      applyFormulaDefaults(machine);
    } catch (validErr) {
      return res.status(400).json({ error: validErr.message });
    }

    const current = await loadConfig();
    const config = { ...current, machines: [...current.machines] };

    if (config.machines.find(m => m.id === machine.id)) {
      return res.status(400).json({ error: `Machine with id "${machine.id}" already exists` });
    }

    config.machines.push(machine);
    await saveConfig(config);
    res.status(201).json(config);
  } catch (err) {
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
    const { id } = req.params;
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    if (updates.formula !== undefined && typeof updates.formula !== 'string') {
      return res.status(400).json({ error: 'formula must be a string' });
    }
    if (updates.rules !== undefined && !Array.isArray(updates.rules)) {
      return res.status(400).json({ error: 'rules must be an array' });
    }

    const current = await loadConfig();
    const config = { ...current, machines: [...current.machines] };
    const index = config.machines.findIndex(m => m.id === id);

    if (index === -1) {
      return res.status(404).json({ error: `Machine "${id}" not found` });
    }

    config.machines[index] = { ...config.machines[index], ...updates, id };
    await saveConfig(config);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update machine', detail: err.message });
  }
});

/**
 * DELETE /api/factory/machines/:id
 * Remove a machine by id.
 */
router.delete('/machines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const current = await loadConfig();
    const config = { ...current, machines: [...current.machines] };
    const index = config.machines.findIndex(m => m.id === id);

    if (index === -1) {
      return res.status(404).json({ error: `Machine "${id}" not found` });
    }

    config.machines.splice(index, 1);
    await saveConfig(config);
    res.json(config);
  } catch (err) {
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
    const { id } = req.params;
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    const current = await loadConfig();
    const config = { ...current, zones: [...current.zones] };
    const index = config.zones.findIndex(z => z.id === id);

    if (index === -1) {
      return res.status(404).json({ error: `Zone "${id}" not found` });
    }

    config.zones[index] = { ...config.zones[index], ...updates, id };
    await saveConfig(config);
    res.json(config);
  } catch (err) {
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
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    const current = await loadConfig();
    const config = { ...current, operating: { ...current.operating } };
    config.operating = { ...config.operating, ...updates };
    await saveConfig(config);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update operating assumptions', detail: err.message });
  }
});

module.exports = router;
