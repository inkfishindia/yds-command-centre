'use strict';

const opsService = require('../services/ops-service');
const { buildPersistedReadModel, buildReadModelResponse } = require('./base');

function getOverviewDegradedSources(payload) {
  const degraded = [];
  if (!payload?.stockHealth?.available) degraded.push('stockHealth');
  if (!payload?.products?.available) degraded.push('products');
  if (!payload?.pendingPOs?.available) degraded.push('pendingPOs');
  if (!Array.isArray(payload?.vendors)) degraded.push('vendors');
  return degraded;
}

async function build() {
  return buildPersistedReadModel('ops', async () => {
    const payload = await opsService.getOverview();
    const timestamp = payload?.timestamp || new Date().toISOString();
    const degradedSources = getOverviewDegradedSources(payload);

    return buildReadModelResponse({
      data: payload,
      generatedAt: timestamp,
      lastSyncedAt: timestamp,
      partial: degradedSources.length > 0,
      degradedSources,
      sourceFreshness: {
        stockHealth: { status: payload?.stockHealth?.available === false ? 'degraded' : 'ok', checkedAt: timestamp },
        products: { status: payload?.products?.available === false ? 'degraded' : 'ok', checkedAt: timestamp },
        pendingPOs: { status: payload?.pendingPOs?.available === false ? 'degraded' : 'ok', checkedAt: timestamp },
        vendors: { status: Array.isArray(payload?.vendors) ? 'ok' : 'degraded', checkedAt: timestamp },
      },
    });
  });
}

module.exports = {
  build,
};
