'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const READ_MODELS_DIR = path.join(DATA_DIR, 'read-models');
const SOURCE_HEALTH_PATH = path.join(DATA_DIR, 'source-health.json');
const SYNC_RUNS_PATH = path.join(DATA_DIR, 'sync-runs.json');
const MAX_SYNC_RUNS = 100;

function sanitizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function modelPath(name) {
  return path.join(READ_MODELS_DIR, `${sanitizeName(name)}.json`);
}

async function ensureDir() {
  await fs.mkdir(READ_MODELS_DIR, { recursive: true });
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function writeJson(filePath, value) {
  const dirPath = path.dirname(filePath);
  await fs.mkdir(dirPath, { recursive: true });
  try {
    await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
      return;
    }
    throw err;
  }
}

async function saveReadModel(name, payload) {
  const persistedAt = new Date().toISOString();
  const record = {
    name,
    persistedAt,
    payload,
  };
  await writeJson(modelPath(name), record);
  return record;
}

async function loadReadModel(name) {
  return readJson(modelPath(name));
}

async function loadAllReadModelStatuses() {
  await ensureDir();
  const entries = await fs.readdir(READ_MODELS_DIR, { withFileTypes: true }).catch(() => []);
  const statuses = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const record = await readJson(path.join(READ_MODELS_DIR, entry.name));
    if (!record) continue;
    statuses.push({
      name: record.name,
      persistedAt: record.persistedAt || null,
      generatedAt: record.payload?.meta?.generatedAt || null,
      lastSyncedAt: record.payload?.meta?.lastSyncedAt || null,
      partial: !!record.payload?.meta?.partial,
      stale: !!record.payload?.meta?.stale,
      degradedSources: record.payload?.meta?.degradedSources || [],
    });
  }
  return statuses.sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

async function loadSourceHealth() {
  return (await readJson(SOURCE_HEALTH_PATH)) || { updatedAt: null, sources: {} };
}

async function saveSourceHealth(next) {
  await writeJson(SOURCE_HEALTH_PATH, next);
  return next;
}

async function loadSyncRuns() {
  const state = await readJson(SYNC_RUNS_PATH);
  return Array.isArray(state?.runs) ? state.runs : [];
}

async function loadLatestSyncStates() {
  const runs = await loadSyncRuns();
  const byModel = new Map();

  for (const run of runs) {
    const name = String(run?.name || '');
    if (!name) continue;

    const current = byModel.get(name) || {
      name,
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastError: null,
      lastStatus: 'unknown',
    };

    if (!current.lastRunAt) {
      current.lastRunAt = run.finishedAt || run.startedAt || null;
      current.lastStatus = run.ok === false ? 'failed' : (run.stale ? 'stale' : (run.partial ? 'partial' : 'ok'));
    }

    if (!current.lastSuccessAt && run.ok !== false) {
      current.lastSuccessAt = run.finishedAt || run.startedAt || null;
    }

    if (!current.lastFailureAt && run.ok === false) {
      current.lastFailureAt = run.finishedAt || run.startedAt || null;
      current.lastError = run.error || null;
    }

    byModel.set(name, current);
  }

  return Array.from(byModel.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

async function appendSyncRun(run) {
  const current = await loadSyncRuns();
  const next = {
    updatedAt: new Date().toISOString(),
    runs: [run, ...current].slice(0, MAX_SYNC_RUNS),
  };
  await writeJson(SYNC_RUNS_PATH, next);
  return next.runs;
}

async function updateSourceHealth(readModelName, sourceFreshness = {}) {
  const current = await loadSourceHealth();
  const next = {
    updatedAt: new Date().toISOString(),
    sources: { ...(current.sources || {}) },
  };

  for (const [source, state] of Object.entries(sourceFreshness || {})) {
    next.sources[source] = {
      status: state?.status || 'unknown',
      checkedAt: state?.checkedAt || new Date().toISOString(),
      readModel: readModelName,
    };
  }

  await saveSourceHealth(next);
  return next;
}

module.exports = {
  saveReadModel,
  loadReadModel,
  loadAllReadModelStatuses,
  loadSourceHealth,
  loadSyncRuns,
  loadLatestSyncStates,
  appendSyncRun,
  updateSourceHealth,
};
