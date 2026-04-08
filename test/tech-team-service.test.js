const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const TECH_TEAM_SERVICE_PATH = path.join(__dirname, '../server/services/tech-team-service.js');
const TECH_TEAM_READ_MODEL_PATH = path.join(__dirname, '../server/read-model/tech-team.js');

describe('Tech Team Service — exports', () => {
  it('exports the expected service methods', () => {
    const service = require('../server/services/tech-team-service');
    assert.equal(typeof service.getSummary, 'function');
    assert.equal(typeof service.getSprintItems, 'function');
    assert.equal(typeof service.getBugs, 'function');
    assert.equal(typeof service.getSpecs, 'function');
    assert.equal(typeof service.getDecisions, 'function');
    assert.equal(typeof service.getVelocity, 'function');
    assert.equal(typeof service.getAgentsCatalog, 'function');
    assert.equal(typeof service.getStrategy, 'function');
    assert.equal(typeof service.getGithubActivity, 'function');
    assert.equal(typeof service.updateSprintItemProperty, 'function');
  });
});

describe('Tech Team Service — getAgentsCatalog', () => {
  it('returns agents and skills arrays', async () => {
    const service = require('../server/services/tech-team-service');
    const result = await service.getAgentsCatalog();
    assert.ok(Array.isArray(result.agents));
    assert.ok(Array.isArray(result.skills));
  });
});

describe('Tech Team Read Model', () => {
  afterEach(() => {
    delete require.cache[TECH_TEAM_SERVICE_PATH];
    delete require.cache[TECH_TEAM_READ_MODEL_PATH];
  });

  it('wraps tech summary in data/meta contract', async () => {
    const service = require(TECH_TEAM_SERVICE_PATH);
    const readModel = require(TECH_TEAM_READ_MODEL_PATH);

    service.getSummary = async () => ({
      sprintItems: [],
      specs: [],
      techDecisions: [],
      sprintArchive: [],
      stats: { totalItems: 0, blocked: 0, openBugs: 0, specsInReview: 0, recentDecisions: [] },
    });
    service.getGithubActivity = async () => ({ available: true, stats: { openPRCount: 0 } });
    service.getAgentsCatalog = async () => ({ agents: [], skills: [] });
    service.getStrategy = async () => ({ available: true, levels: [] });

    const result = await readModel.build();
    assert.ok(result.data);
    assert.ok(result.meta);
    assert.equal(result.meta.partial, false);
    assert.deepEqual(result.meta.degradedSources, []);
    assert.equal(result.meta.sourceFreshness.github.status, 'ok');
  });

  it('flags degraded tech sources when summary is partial', async () => {
    const service = require(TECH_TEAM_SERVICE_PATH);
    const readModel = require(TECH_TEAM_READ_MODEL_PATH);

    service.getSummary = async () => ({
      sprintItems: null,
      specs: null,
      techDecisions: null,
      sprintArchive: null,
      stats: null,
    });
    service.getGithubActivity = async () => ({ available: false });
    service.getAgentsCatalog = async () => ({ agents: null, skills: null });
    service.getStrategy = async () => ({ available: false });

    const result = await readModel.build();
    assert.equal(result.meta.partial, true);
    assert.ok(result.meta.degradedSources.includes('sprintItems'));
    assert.ok(result.meta.degradedSources.includes('github'));
    assert.ok(result.meta.degradedSources.includes('agents'));
    assert.ok(result.meta.degradedSources.includes('strategy'));
  });
});
