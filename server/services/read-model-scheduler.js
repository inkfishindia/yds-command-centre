'use strict';

const config = require('../config');
const readModelSync = require('./read-model-sync');
const projectionJobStore = require('./projection-job-store');

const state = {
  enabled: false,
  intervalMs: 0,
  startupDelayMs: 0,
  running: false,
  currentTrigger: null,
  lastRunStartedAt: null,
  lastRunFinishedAt: null,
  nextRunAt: null,
};

let intervalTimer = null;
let startupTimer = null;

function clearTimers() {
  if (intervalTimer) clearTimeout(intervalTimer);
  if (startupTimer) clearTimeout(startupTimer);
  intervalTimer = null;
  startupTimer = null;
}

function getStatus() {
  return {
    enabled: !!state.enabled,
    running: !!state.running,
    intervalMs: state.intervalMs,
    startupDelayMs: state.startupDelayMs,
    currentTrigger: state.currentTrigger,
    lastRunStartedAt: state.lastRunStartedAt,
    lastRunFinishedAt: state.lastRunFinishedAt,
    nextRunAt: state.nextRunAt,
  };
}

function scheduleNextInterval() {
  if (!state.enabled || !(state.intervalMs > 0)) {
    state.nextRunAt = null;
    return;
  }

  if (intervalTimer) clearTimeout(intervalTimer);
  state.nextRunAt = new Date(Date.now() + state.intervalMs).toISOString();
  intervalTimer = setTimeout(async () => {
    await runScheduledSync('interval');
  }, state.intervalMs);
}

async function runScheduledSync(trigger = 'manual', names) {
  if (state.running) {
    return {
      ok: false,
      skipped: true,
      reason: 'sync already running',
      trigger,
    };
  }

  state.running = true;
  state.currentTrigger = trigger;
  state.lastRunStartedAt = new Date().toISOString();
  state.nextRunAt = null;
  const requestedModels = Array.isArray(names) && names.length > 0 ? names : undefined;
  const job = await projectionJobStore.createProjectionJob({
    trigger,
    requestedModels: requestedModels || [],
    startedAt: state.lastRunStartedAt,
  });

  try {
    const result = await readModelSync.syncAllReadModels(requestedModels);
    state.lastRunFinishedAt = new Date().toISOString();
    const failed = Array.isArray(result?.results) ? result.results.filter((item) => item.ok === false).length : 0;
    await projectionJobStore.updateProjectionJob(job.id, {
      status: failed > 0 ? 'partial' : 'completed',
      finishedAt: state.lastRunFinishedAt,
      resultSummary: {
        total: Array.isArray(result?.results) ? result.results.length : 0,
        failed,
        trigger,
      },
    });
    return result;
  } catch (err) {
    state.lastRunFinishedAt = new Date().toISOString();
    await projectionJobStore.updateProjectionJob(job.id, {
      status: 'failed',
      finishedAt: state.lastRunFinishedAt,
      errorMessage: err.message || String(err),
      resultSummary: { trigger },
    });
    throw err;
  } finally {
    state.running = false;
    state.currentTrigger = null;
    if (state.enabled) {
      scheduleNextInterval();
    }
  }
}

function startScheduler({
  enabled = config.READ_MODEL_SYNC_ENABLED,
  intervalMs = config.READ_MODEL_SYNC_INTERVAL_MS,
  startupDelayMs = config.READ_MODEL_SYNC_STARTUP_DELAY_MS,
} = {}) {
  clearTimers();

  state.enabled = !!enabled;
  state.intervalMs = Number(intervalMs) || 0;
  state.startupDelayMs = Number(startupDelayMs) || 0;
  state.nextRunAt = null;

  if (!state.enabled) {
    return getStatus();
  }

  const delay = Math.max(0, state.startupDelayMs);
  state.nextRunAt = new Date(Date.now() + delay).toISOString();

  startupTimer = setTimeout(async () => {
    startupTimer = null;
    await runScheduledSync('startup');
  }, delay);

  return getStatus();
}

function stopScheduler() {
  clearTimers();
  state.enabled = false;
  state.nextRunAt = null;
  state.currentTrigger = null;
  return getStatus();
}

module.exports = {
  getStatus,
  startScheduler,
  stopScheduler,
  runScheduledSync,
};
