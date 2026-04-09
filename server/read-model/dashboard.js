'use strict';

const dashboardService = require('../services/dashboard-service');
const { buildPersistedReadModel, buildReadModelResponse } = require('./base');

function getDegradedSources(payload) {
  const degraded = [];

  if (!Array.isArray(payload?.focusAreas)) degraded.push('focusAreas');
  if (!Array.isArray(payload?.overdue)) degraded.push('overdue');
  if (!Array.isArray(payload?.upcoming)) degraded.push('upcoming');
  if (!Array.isArray(payload?.recentDecisions)) degraded.push('recentDecisions');
  if (!Array.isArray(payload?.people)) degraded.push('people');
  if (!Array.isArray(payload?.projects)) degraded.push('projects');
  if (!Array.isArray(payload?.teamWorkload)) degraded.push('teamWorkload');
  if (!payload?.recentActivity || typeof payload.recentActivity !== 'object') degraded.push('recentActivity');
  if (!payload?.morningBrief || typeof payload.morningBrief !== 'object') degraded.push('morningBrief');

  return degraded;
}

async function build() {
  return buildPersistedReadModel('dashboard', async () => {
    const payload = await dashboardService.getDashboardPayload();
    const timestamp = payload?.timestamp || new Date().toISOString();
    const degradedSources = getDegradedSources(payload);

    return buildReadModelResponse({
      data: payload,
      generatedAt: timestamp,
      lastSyncedAt: timestamp,
      partial: degradedSources.length > 0,
      degradedSources,
      sourceFreshness: {
        focusAreas: { status: degradedSources.includes('focusAreas') ? 'degraded' : 'ok', checkedAt: timestamp },
        overdue: { status: degradedSources.includes('overdue') ? 'degraded' : 'ok', checkedAt: timestamp },
        upcoming: { status: degradedSources.includes('upcoming') ? 'degraded' : 'ok', checkedAt: timestamp },
        recentDecisions: { status: degradedSources.includes('recentDecisions') ? 'degraded' : 'ok', checkedAt: timestamp },
        people: { status: degradedSources.includes('people') ? 'degraded' : 'ok', checkedAt: timestamp },
        projects: { status: degradedSources.includes('projects') ? 'degraded' : 'ok', checkedAt: timestamp },
        teamWorkload: { status: degradedSources.includes('teamWorkload') ? 'degraded' : 'ok', checkedAt: timestamp },
        recentActivity: { status: degradedSources.includes('recentActivity') ? 'degraded' : 'ok', checkedAt: timestamp },
        morningBrief: { status: degradedSources.includes('morningBrief') ? 'degraded' : 'ok', checkedAt: timestamp },
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
