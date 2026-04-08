'use strict';

const crmService = require('../services/crm-service');
const { buildPersistedReadModel, buildReadModelResponse } = require('./base');

function getOverviewDegradedSources(payload) {
  const degraded = [];
  if (payload?.pipeline?.available === false) degraded.push('pipeline');
  if ((payload?.leadStats?.total || 0) === 0 && payload?.pipeline?.available === false) degraded.push('leadStats');
  if ((payload?.flowStats?.total || 0) === 0 && payload?.pipeline?.available === false) degraded.push('flowStats');
  if ((payload?.team?.count || 0) === 0) degraded.push('team');
  return [...new Set(degraded)];
}

async function build() {
  return buildPersistedReadModel('crm', async () => {
    const payload = await crmService.getOverview();
    const timestamp = payload?.timestamp || new Date().toISOString();
    const degradedSources = getOverviewDegradedSources(payload);

    return buildReadModelResponse({
      data: payload,
      generatedAt: timestamp,
      lastSyncedAt: timestamp,
      partial: degradedSources.length > 0,
      degradedSources,
      sourceFreshness: {
        pipeline: { status: payload?.pipeline?.available === false ? 'degraded' : 'ok', checkedAt: timestamp },
        leadStats: { status: degradedSources.includes('leadStats') ? 'degraded' : 'ok', checkedAt: timestamp },
        flowStats: { status: degradedSources.includes('flowStats') ? 'degraded' : 'ok', checkedAt: timestamp },
        team: { status: degradedSources.includes('team') ? 'degraded' : 'ok', checkedAt: timestamp },
      },
    });
  });
}

module.exports = {
  build,
};
