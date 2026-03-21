const fs = require('fs/promises');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/factory-capacity.json');
const DEFAULT_FORMULA = 'theoretical_pcs_per_hour * (available_minutes / 60) * efficiency_factor';

let factoryConfigCache = null;

async function loadConfig() {
  if (factoryConfigCache) return factoryConfigCache;
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  factoryConfigCache = JSON.parse(raw);
  return factoryConfigCache;
}

async function saveConfig(config) {
  await fs.writeFile(DATA_FILE, JSON.stringify(config, null, 2), 'utf-8');
  factoryConfigCache = config;
  return config;
}

function applyFormulaDefaults(obj) {
  if (obj.formula !== undefined && typeof obj.formula !== 'string') {
    throw new Error('formula must be a string');
  }
  if (obj.rules !== undefined && !Array.isArray(obj.rules)) {
    throw new Error('rules must be an array');
  }
  if (obj.formula === undefined) {
    obj.formula = DEFAULT_FORMULA;
  }
  if (obj.rules === undefined) {
    obj.rules = [];
  }
  return obj;
}

async function getConfig() {
  return loadConfig();
}

async function replaceConfig(body) {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const current = await loadConfig();
  const updated = { ...body, formulas: current.formulas };
  return saveConfig(updated);
}

async function addMachine(machine) {
  if (!machine || !machine.id || !machine.name || !machine.type || !machine.zone) {
    throw new Error('Missing required fields: id, name, type, zone');
  }

  applyFormulaDefaults(machine);

  const current = await loadConfig();
  const config = { ...current, machines: [...current.machines] };

  if (config.machines.find((m) => m.id === machine.id)) {
    throw new Error(`Machine with id "${machine.id}" already exists`);
  }

  config.machines.push(machine);
  return saveConfig(config);
}

async function updateMachine(id, updates) {
  if (!updates || typeof updates !== 'object') {
    throw new Error('Request body must be a JSON object');
  }
  if (updates.formula !== undefined && typeof updates.formula !== 'string') {
    throw new Error('formula must be a string');
  }
  if (updates.rules !== undefined && !Array.isArray(updates.rules)) {
    throw new Error('rules must be an array');
  }

  const current = await loadConfig();
  const config = { ...current, machines: [...current.machines] };
  const index = config.machines.findIndex((m) => m.id === id);

  if (index === -1) {
    const err = new Error(`Machine "${id}" not found`);
    err.code = 'NOT_FOUND';
    throw err;
  }

  config.machines[index] = { ...config.machines[index], ...updates, id };
  return saveConfig(config);
}

async function deleteMachine(id) {
  const current = await loadConfig();
  const config = { ...current, machines: [...current.machines] };
  const index = config.machines.findIndex((m) => m.id === id);

  if (index === -1) {
    const err = new Error(`Machine "${id}" not found`);
    err.code = 'NOT_FOUND';
    throw err;
  }

  config.machines.splice(index, 1);
  return saveConfig(config);
}

async function updateZone(id, updates) {
  if (!updates || typeof updates !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const current = await loadConfig();
  const config = { ...current, zones: [...current.zones] };
  const index = config.zones.findIndex((z) => z.id === id);

  if (index === -1) {
    const err = new Error(`Zone "${id}" not found`);
    err.code = 'NOT_FOUND';
    throw err;
  }

  config.zones[index] = { ...config.zones[index], ...updates, id };
  return saveConfig(config);
}

async function updateOperating(updates) {
  if (!updates || typeof updates !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const current = await loadConfig();
  const config = { ...current, operating: { ...current.operating, ...updates } };
  return saveConfig(config);
}

module.exports = {
  getConfig,
  replaceConfig,
  addMachine,
  updateMachine,
  deleteMachine,
  updateZone,
  updateOperating,
  applyFormulaDefaults,
};
