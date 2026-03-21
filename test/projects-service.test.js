const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('Projects Service — exports', () => {
  it('exports the expected service methods', () => {
    const service = require('../server/services/projects-service');
    assert.equal(typeof service.getProjectsPayload, 'function');
    assert.equal(typeof service.buildCommitmentsByProject, 'function');
    assert.equal(typeof service.enrichProjects, 'function');
    assert.equal(typeof service.clearCache, 'function');
  });
});

describe('Projects Service — buildCommitmentsByProject', () => {
  it('groups open, done, and overdue commitments by normalized project id', () => {
    const { buildCommitmentsByProject } = require('../server/services/projects-service');
    const grouped = buildCommitmentsByProject([
      { Status: 'In Progress', Project: ['abc-def'], 'Due Date': '2026-03-01' },
      { Status: 'Done', Project: ['abc-def'], 'Due Date': '2026-03-01' },
    ], '2026-03-10');

    assert.equal(grouped.abcdef.open.length, 1);
    assert.equal(grouped.abcdef.done.length, 1);
    assert.equal(grouped.abcdef.overdue.length, 1);
  });
});
