'use strict';

const readModelStore = require('./read-model-store');
const actionQueueReadModel = require('../read-model/action-queue');
const dashboardReadModel = require('../read-model/dashboard');
const overviewReadModel = require('../read-model/overview');
const opsReadModel = require('../read-model/ops');
const crmReadModel = require('../read-model/crm');
const marketingOpsReadModel = require('../read-model/marketing-ops');
const techTeamReadModel = require('../read-model/tech-team');

const REGISTRY = {
  'action-queue': actionQueueReadModel,
  dashboard: dashboardReadModel,
  overview: overviewReadModel,
  ops: opsReadModel,
  crm: crmReadModel,
  'marketing-ops': marketingOpsReadModel,
  'tech-team': techTeamReadModel,
};

function getRegisteredReadModels() {
  return { ...REGISTRY };
}

async function syncReadModel(name) {
  const target = REGISTRY[name];
  if (!target || typeof target.build !== 'function') {
    throw new Error(`Unknown read model: ${name}`);
  }

  const startedAt = new Date().toISOString();
  try {
    const payload = await target.build();
    const result = {
      name,
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      partial: !!payload?.meta?.partial,
      stale: !!payload?.meta?.stale,
      degradedSources: payload?.meta?.degradedSources || [],
      lastSyncedAt: payload?.meta?.lastSyncedAt || null,
    };
    await readModelStore.appendSyncRun(result);
    return result;
  } catch (err) {
    const result = {
      name,
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: err.message || String(err),
    };
    await readModelStore.appendSyncRun(result);
    return result;
  }
}

async function syncAllReadModels(names = Object.keys(REGISTRY)) {
  const results = [];
  for (const name of names) {
    results.push(await syncReadModel(name));
  }
  return {
    startedAt: results[0]?.startedAt || new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    results,
  };
}

module.exports = {
  getRegisteredReadModels,
  syncReadModel,
  syncAllReadModels,
};
