'use strict';

const overviewService = require('../services/overview-service');
const { buildPersistedReadModel, buildReadModelResponse } = require('./base');

const SOURCE_KEYS = [
  'actionQueue',
  'dashboard',
  'marketingOpsSummary',
  'marketingTasksSummary',
  'techSummary',
  'aiTeam',
  'techBacklog',
  'sessions',
  'people',
  'projects',
  'crmOverview',
  'opsOverview',
];

async function build() {
  return buildPersistedReadModel('overview', async () => {
    const payload = await overviewService.getOverviewPayload();
    const sourceState = payload.sourceState || {};
    const degradedSources = SOURCE_KEYS.filter((key) => sourceState[key] === 'rejected');
    const timestamp = payload.timestamp || new Date().toISOString();

    return buildReadModelResponse({
      data: payload,
      generatedAt: timestamp,
      lastSyncedAt: timestamp,
      partial: degradedSources.length > 0,
      degradedSources,
      sourceFreshness: SOURCE_KEYS.reduce((acc, key) => {
        acc[key] = {
          status: sourceState[key] || 'unknown',
          checkedAt: timestamp,
        };
        return acc;
      }, {}),
    });
  });
}

function invalidate() {
  overviewService.clearCache();
}

module.exports = {
  build,
  invalidate,
};
