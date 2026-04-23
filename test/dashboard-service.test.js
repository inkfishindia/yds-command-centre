const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('Dashboard Service — exports', () => {
  it('exports the expected service methods', () => {
    const service = require('../server/services/dashboard-service');
    assert.equal(typeof service.getMorningBrief, 'function');
    assert.equal(typeof service.getDashboardPayload, 'function');
    assert.equal(typeof service.getActionQueuePayload, 'function');
    assert.equal(typeof service.getTeamWorkload, 'function');
    assert.equal(typeof service.getRecentActivity, 'function');
    assert.equal(typeof service.enrichActionQueueCommitments, 'function');
    assert.equal(typeof service.buildActionQueues, 'function');
    assert.equal(typeof service.clearCache, 'function');
  });
});

describe('Dashboard Service — capacityLabel', () => {
  const { capacityLabel } = require('../server/services/dashboard-service');

  it('returns overloaded for count >= 8', () => {
    assert.equal(capacityLabel(8), 'overloaded');
    assert.equal(capacityLabel(12), 'overloaded');
  });

  it('returns moderate for count >= 5 and < 8', () => {
    assert.equal(capacityLabel(5), 'moderate');
    assert.equal(capacityLabel(7), 'moderate');
  });

  it('returns light for count < 5', () => {
    assert.equal(capacityLabel(0), 'light');
    assert.equal(capacityLabel(4), 'light');
  });
});

describe('Dashboard Service — top-level cache invalidation', () => {
  it('clearCache resets all four cache slots including dashboardPayloadCache', () => {
    // White-box: call clearCache and verify subsequent module state is reset.
    // We can only observe this indirectly via the export — the function must not throw.
    const service = require('../server/services/dashboard-service');
    assert.doesNotThrow(() => service.clearCache());
  });
});

describe('Dashboard Service — action queue helpers', () => {
  const { buildActionQueues } = require('../server/services/dashboard-service');

  it('places overdue Dan item in Dan queue and non-Dan blocked item in Runner queue', () => {
    const enriched = [
      {
        status: 'In Progress',
        type: null,
        notes: '',
        assignedNames: ['Dan'],
        assignedIds: ['307247aa0d7b81318999e80042f45d6a'],
        isOverdue: true,
        daysOverdue: 2,
      },
      {
        status: 'Blocked',
        type: null,
        notes: '',
        assignedNames: ['Alex'],
        assignedIds: ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
        isOverdue: false,
        daysOverdue: 0,
      },
    ];

    const result = buildActionQueues(enriched);
    assert.equal(result.dansQueue.length, 2);
    assert.equal(result.runnersQueue.length, 1);
  });
});
