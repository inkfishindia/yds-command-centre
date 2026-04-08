'use strict';

const marketingOpsService = require('../services/marketing-ops-service');
const { buildPersistedReadModel, buildReadModelResponse } = require('./base');

function getOverviewDegradedSources(payload) {
  const degraded = [];
  if (!Array.isArray(payload?.campaigns)) degraded.push('campaigns');
  if (!Array.isArray(payload?.content)) degraded.push('content');
  if (!Array.isArray(payload?.sequences)) degraded.push('sequences');
  if (!Array.isArray(payload?.sessions)) degraded.push('sessions');
  if (!payload?.stats || typeof payload.stats !== 'object') degraded.push('stats');
  return degraded;
}

async function build() {
  return buildPersistedReadModel('marketing-ops', async () => {
    const payload = await marketingOpsService.getSummary();
    const timestamp = new Date().toISOString();
    const degradedSources = getOverviewDegradedSources(payload);

    return buildReadModelResponse({
      data: payload,
      generatedAt: timestamp,
      lastSyncedAt: timestamp,
      partial: degradedSources.length > 0,
      degradedSources,
      sourceFreshness: {
        campaigns: { status: degradedSources.includes('campaigns') ? 'degraded' : 'ok', checkedAt: timestamp },
        content: { status: degradedSources.includes('content') ? 'degraded' : 'ok', checkedAt: timestamp },
        sequences: { status: degradedSources.includes('sequences') ? 'degraded' : 'ok', checkedAt: timestamp },
        sessions: { status: degradedSources.includes('sessions') ? 'degraded' : 'ok', checkedAt: timestamp },
        stats: { status: degradedSources.includes('stats') ? 'degraded' : 'ok', checkedAt: timestamp },
      },
    });
  });
}

module.exports = {
  build,
};
