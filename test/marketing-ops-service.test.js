const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('Marketing Ops Service — exports', () => {
  it('exports the expected service methods', () => {
    const service = require('../server/services/marketing-ops-service');
    assert.equal(typeof service.getSummary, 'function');
    assert.equal(typeof service.getCampaigns, 'function');
    assert.equal(typeof service.getContent, 'function');
    assert.equal(typeof service.getSequences, 'function');
    assert.equal(typeof service.getSessions, 'function');
    assert.equal(typeof service.updateCampaignProperty, 'function');
    assert.equal(typeof service.getCampaignCommitments, 'function');
    assert.equal(typeof service.getMetrics, 'function');
  });
});

describe('Marketing Ops Service — metrics file', () => {
  it('loads the metrics payload shape', async () => {
    const service = require('../server/services/marketing-ops-service');
    const metrics = await service.getMetrics();
    assert.ok(metrics.revenue);
    assert.ok(metrics.repeatRate);
    assert.ok(metrics.customizerToCart);
  });
});
