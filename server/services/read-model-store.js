'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const db = require('./db');

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

function parseJsonValue(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function queryDb(text, params) {
  if (!db.isDatabaseEnabled()) return null;
  try {
    return await db.query(text, params);
  } catch (err) {
    console.error('[read-model-store] database error:', err.message);
    return null;
  }
}

async function saveReadModelToDb(record) {
  await queryDb(
    `INSERT INTO app_read_models (
      name,
      persisted_at,
      generated_at,
      last_synced_at,
      stale,
      partial,
      degraded_sources_json,
      payload_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
    ON CONFLICT (name) DO UPDATE SET
      persisted_at = EXCLUDED.persisted_at,
      generated_at = EXCLUDED.generated_at,
      last_synced_at = EXCLUDED.last_synced_at,
      stale = EXCLUDED.stale,
      partial = EXCLUDED.partial,
      degraded_sources_json = EXCLUDED.degraded_sources_json,
      payload_json = EXCLUDED.payload_json`,
    [
      record.name,
      record.persistedAt,
      record.payload?.meta?.generatedAt || null,
      record.payload?.meta?.lastSyncedAt || null,
      !!record.payload?.meta?.stale,
      !!record.payload?.meta?.partial,
      JSON.stringify(record.payload?.meta?.degradedSources || []),
      JSON.stringify(record.payload),
    ],
  );
}

async function loadReadModelFromDb(name) {
  const result = await queryDb(
    `SELECT name, persisted_at, payload_json
     FROM app_read_models
     WHERE name = $1`,
    [name],
  );
  const row = result?.rows?.[0];
  if (!row) return null;

  return {
    name: row.name,
    persistedAt: row.persisted_at ? new Date(row.persisted_at).toISOString() : null,
    payload: parseJsonValue(row.payload_json, null),
  };
}

async function loadReadModelStatusesFromDb() {
  const result = await queryDb(
    `SELECT
      name,
      persisted_at,
      generated_at,
      last_synced_at,
      partial,
      stale,
      degraded_sources_json
     FROM app_read_models
     ORDER BY name ASC`,
  );
  if (!result) return null;

  return result.rows.map((row) => ({
    name: row.name,
    persistedAt: row.persisted_at ? new Date(row.persisted_at).toISOString() : null,
    generatedAt: row.generated_at ? new Date(row.generated_at).toISOString() : null,
    lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at).toISOString() : null,
    partial: !!row.partial,
    stale: !!row.stale,
    degradedSources: parseJsonValue(row.degraded_sources_json, []),
  }));
}

async function saveSourceHealthToDb(next) {
  const sources = Object.entries(next.sources || {});
  if (sources.length === 0) return;

  for (const [sourceName, state] of sources) {
    await queryDb(
      `INSERT INTO app_source_health (
        source_name,
        status,
        checked_at,
        read_model,
        details_json
      ) VALUES ($1, $2, $3, $4, $5::jsonb)
      ON CONFLICT (source_name) DO UPDATE SET
        status = EXCLUDED.status,
        checked_at = EXCLUDED.checked_at,
        read_model = EXCLUDED.read_model,
        details_json = EXCLUDED.details_json`,
      [
        sourceName,
        state?.status || 'unknown',
        state?.checkedAt || null,
        state?.readModel || null,
        JSON.stringify(state || {}),
      ],
    );
  }
}

async function loadSourceHealthFromDb() {
  const result = await queryDb(
    `SELECT source_name, status, checked_at, read_model, details_json
     FROM app_source_health
     ORDER BY source_name ASC`,
  );
  if (!result) return null;

  const sources = {};
  let updatedAt = null;

  for (const row of result.rows) {
    const checkedAt = row.checked_at ? new Date(row.checked_at).toISOString() : null;
    if (checkedAt && (!updatedAt || checkedAt > updatedAt)) {
      updatedAt = checkedAt;
    }

    sources[row.source_name] = {
      ...parseJsonValue(row.details_json, {}),
      status: row.status || 'unknown',
      checkedAt,
      readModel: row.read_model || null,
    };
  }

  return { updatedAt, sources };
}

async function appendSyncRunToDb(run) {
  await queryDb(
    `INSERT INTO app_sync_runs (
      name,
      ok,
      started_at,
      finished_at,
      partial,
      stale,
      degraded_sources_json,
      last_synced_at,
      error_message,
      run_payload_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::jsonb)`,
    [
      run.name,
      run.ok !== false,
      run.startedAt || null,
      run.finishedAt || null,
      !!run.partial,
      !!run.stale,
      JSON.stringify(run.degradedSources || []),
      run.lastSyncedAt || null,
      run.error || null,
      JSON.stringify(run),
    ],
  );
}

async function loadSyncRunsFromDb() {
  const result = await queryDb(
    `SELECT run_payload_json
     FROM app_sync_runs
     ORDER BY COALESCE(finished_at, started_at) DESC, id DESC
     LIMIT $1`,
    [MAX_SYNC_RUNS],
  );
  if (!result) return null;
  return result.rows.map((row) => parseJsonValue(row.run_payload_json, {}));
}

async function saveReadModel(name, payload) {
  const persistedAt = new Date().toISOString();
  const record = {
    name,
    persistedAt,
    payload,
  };
  await writeJson(modelPath(name), record);
  await saveReadModelToDb(record);
  return record;
}

async function loadReadModel(name) {
  const dbRecord = await loadReadModelFromDb(name);
  if (dbRecord) return dbRecord;
  return readJson(modelPath(name));
}

async function loadAllReadModelStatuses() {
  const dbStatuses = await loadReadModelStatusesFromDb();
  if (dbStatuses) {
    return dbStatuses.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

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
  return (await loadSourceHealthFromDb()) || (await readJson(SOURCE_HEALTH_PATH)) || { updatedAt: null, sources: {} };
}

async function saveSourceHealth(next) {
  await writeJson(SOURCE_HEALTH_PATH, next);
  await saveSourceHealthToDb(next);
  return next;
}

async function loadSyncRuns() {
  const dbRuns = await loadSyncRunsFromDb();
  if (dbRuns) return dbRuns;

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
  await appendSyncRunToDb(run);
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
