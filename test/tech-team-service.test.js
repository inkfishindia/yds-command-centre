const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

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
