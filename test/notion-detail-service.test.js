const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('Notion Detail Service — exports', () => {
  it('exports the expected service methods', () => {
    const service = require('../server/services/notion-detail-service');
    assert.equal(typeof service.getFocusAreaDetail, 'function');
    assert.equal(typeof service.getPersonDetail, 'function');
    assert.equal(typeof service.enrichFocusAreaCommitment, 'function');
    assert.equal(typeof service.sortFocusAreaCommitments, 'function');
    assert.equal(typeof service.enrichPersonCommitment, 'function');
    assert.equal(typeof service.sortPersonCommitments, 'function');
    assert.equal(typeof service.computePersonMetrics, 'function');
  });
});

describe('Notion Detail Service — computePersonMetrics', () => {
  it('computes capacity and counts from enriched commitments', () => {
    const { computePersonMetrics } = require('../server/services/notion-detail-service');
    const metrics = computePersonMetrics([
      { Status: 'In Progress', isOverdue: true },
      { Status: 'Blocked', isOverdue: false },
      { Status: 'Done', isOverdue: false },
    ]);

    assert.equal(metrics.activeCount, 2);
    assert.equal(metrics.overdueCount, 1);
    assert.equal(metrics.blockedCount, 1);
    assert.equal(metrics.doneCount, 1);
    assert.equal(metrics.capacity, 'light');
  });
});
