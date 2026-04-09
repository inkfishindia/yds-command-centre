'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const db = require('./db');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PROJECTION_JOBS_PATH = path.join(DATA_DIR, 'projection-jobs.json');
const MAX_PROJECTION_JOBS = 100;

function parseJsonValue(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
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
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function queryDb(text, params) {
  if (!db.isDatabaseEnabled()) return null;
  try {
    return await db.query(text, params);
  } catch (err) {
    console.error('[projection-job-store] database error:', err.message);
    return null;
  }
}

async function createProjectionJob({
  trigger = 'manual',
  requestedModels = [],
  status = 'running',
  startedAt = new Date().toISOString(),
} = {}) {
  const job = {
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    trigger,
    status,
    requestedModels: Array.isArray(requestedModels) ? requestedModels : [],
    startedAt,
    finishedAt: null,
    resultSummary: {},
    errorMessage: null,
  };

  const result = await queryDb(
    `INSERT INTO app_projection_jobs (
      trigger,
      status,
      requested_models_json,
      started_at,
      result_summary_json,
      error_message
    ) VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6)
    RETURNING id`,
    [
      job.trigger,
      job.status,
      JSON.stringify(job.requestedModels),
      job.startedAt,
      JSON.stringify(job.resultSummary),
      job.errorMessage,
    ],
  );

  if (result?.rows?.[0]?.id != null) {
    job.id = String(result.rows[0].id);
  }

  const current = await loadProjectionJobs();
  const next = {
    updatedAt: new Date().toISOString(),
    jobs: [job, ...current].slice(0, MAX_PROJECTION_JOBS),
  };
  await writeJson(PROJECTION_JOBS_PATH, next);
  return job;
}

async function updateProjectionJob(id, updates = {}) {
  const jobs = await loadProjectionJobs();
  const nextJobs = jobs.map((job) => {
    if (String(job.id) !== String(id)) return job;
    return {
      ...job,
      ...updates,
      id: job.id,
    };
  });

  await writeJson(PROJECTION_JOBS_PATH, {
    updatedAt: new Date().toISOString(),
    jobs: nextJobs.slice(0, MAX_PROJECTION_JOBS),
  });

  await queryDb(
    `UPDATE app_projection_jobs
     SET status = $2,
         finished_at = $3,
         result_summary_json = $4::jsonb,
         error_message = $5
     WHERE id = $1`,
    [
      String(id),
      updates.status || 'completed',
      updates.finishedAt || null,
      JSON.stringify(updates.resultSummary || {}),
      updates.errorMessage || null,
    ],
  );

  return nextJobs.find((job) => String(job.id) === String(id)) || null;
}

async function loadProjectionJobs() {
  const dbResult = await queryDb(
    `SELECT
      id,
      trigger,
      status,
      requested_models_json,
      started_at,
      finished_at,
      result_summary_json,
      error_message
     FROM app_projection_jobs
     ORDER BY started_at DESC, id DESC
     LIMIT $1`,
    [MAX_PROJECTION_JOBS],
  );

  if (dbResult) {
    return dbResult.rows.map((row) => ({
      id: String(row.id),
      trigger: row.trigger || 'manual',
      status: row.status || 'unknown',
      requestedModels: parseJsonValue(row.requested_models_json, []),
      startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
      finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : null,
      resultSummary: parseJsonValue(row.result_summary_json, {}),
      errorMessage: row.error_message || null,
    }));
  }

  const state = await readJson(PROJECTION_JOBS_PATH);
  return Array.isArray(state?.jobs) ? state.jobs : [];
}

module.exports = {
  createProjectionJob,
  updateProjectionJob,
  loadProjectionJobs,
};
