'use strict';

const dashboardService = require('../services/dashboard-service');
const { buildPersistedReadModel, buildReadModelResponse } = require('./base');

function getDegradedSources(payload) {
  const degraded = [];

  if (!Array.isArray(payload?.dansQueue)) degraded.push('dansQueue');
  if (!Array.isArray(payload?.runnersQueue)) degraded.push('runnersQueue');
  if (typeof payload?.dansQueueCount !== 'number') degraded.push('dansQueueCount');
  if (typeof payload?.runnersQueueCount !== 'number') degraded.push('runnersQueueCount');

  return degraded;
}

async function build() {
  return buildPersistedReadModel('action-queue', async () => {
    const payload = await dashboardService.getActionQueuePayload();
    const timestamp = payload?.timestamp || new Date().toISOString();
    const degradedSources = getDegradedSources(payload);

    return buildReadModelResponse({
      data: payload,
      generatedAt: timestamp,
      lastSyncedAt: timestamp,
      partial: degradedSources.length > 0,
      degradedSources,
      sourceFreshness: {
        commitments: { status: degradedSources.length > 0 ? 'degraded' : 'ok', checkedAt: timestamp },
        people: { status: degradedSources.length > 0 ? 'degraded' : 'ok', checkedAt: timestamp },
        focusAreas: { status: degradedSources.length > 0 ? 'degraded' : 'ok', checkedAt: timestamp },
      },
    });
  });
}

function invalidate() {
  dashboardService.clearCache();
}

module.exports = {
  build,
  invalidate,
};
