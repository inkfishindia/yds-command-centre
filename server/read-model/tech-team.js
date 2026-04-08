'use strict';

const techTeamService = require('../services/tech-team-service');
const { buildPersistedReadModel, buildReadModelResponse } = require('./base');

function getOverviewDegradedSources(payload, extras) {
  const degraded = [];
  if (!Array.isArray(payload?.sprintItems)) degraded.push('sprintItems');
  if (!Array.isArray(payload?.specs)) degraded.push('specs');
  if (!Array.isArray(payload?.techDecisions)) degraded.push('techDecisions');
  if (!Array.isArray(payload?.sprintArchive)) degraded.push('sprintArchive');
  if (!payload?.stats || typeof payload.stats !== 'object') degraded.push('stats');
  if (!extras.github?.available) degraded.push('github');
  if (!Array.isArray(extras.agents?.agents) || !Array.isArray(extras.agents?.skills)) degraded.push('agents');
  if (extras.strategy?.available === false) degraded.push('strategy');
  return degraded;
}

async function build() {
  return buildPersistedReadModel('tech-team', async () => {
    const [summary, github, agents, strategy] = await Promise.all([
      techTeamService.getSummary(),
      techTeamService.getGithubActivity().catch(() => ({ available: false })),
      techTeamService.getAgentsCatalog().catch(() => ({ agents: [], skills: [] })),
      techTeamService.getStrategy().catch(() => ({ available: false })),
    ]);

    const timestamp = new Date().toISOString();
    const degradedSources = getOverviewDegradedSources(summary, { github, agents, strategy });

    return buildReadModelResponse({
      data: {
        ...summary,
        github,
        agents,
        strategy,
      },
      generatedAt: timestamp,
      lastSyncedAt: timestamp,
      partial: degradedSources.length > 0,
      degradedSources,
      sourceFreshness: {
        sprintItems: { status: degradedSources.includes('sprintItems') ? 'degraded' : 'ok', checkedAt: timestamp },
        specs: { status: degradedSources.includes('specs') ? 'degraded' : 'ok', checkedAt: timestamp },
        techDecisions: { status: degradedSources.includes('techDecisions') ? 'degraded' : 'ok', checkedAt: timestamp },
        sprintArchive: { status: degradedSources.includes('sprintArchive') ? 'degraded' : 'ok', checkedAt: timestamp },
        stats: { status: degradedSources.includes('stats') ? 'degraded' : 'ok', checkedAt: timestamp },
        github: { status: degradedSources.includes('github') ? 'degraded' : 'ok', checkedAt: timestamp },
        agents: { status: degradedSources.includes('agents') ? 'degraded' : 'ok', checkedAt: timestamp },
        strategy: { status: degradedSources.includes('strategy') ? 'degraded' : 'ok', checkedAt: timestamp },
      },
    });
  });
}

module.exports = {
  build,
};
