const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const MARKETING_OPS_SERVICE_PATH = path.join(__dirname, '../server/services/marketing-ops-service.js');
const MARKETING_OPS_READ_MODEL_PATH = path.join(__dirname, '../server/read-model/marketing-ops.js');

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

describe('Marketing Ops Read Model', () => {
  afterEach(() => {
    delete require.cache[MARKETING_OPS_SERVICE_PATH];
    delete require.cache[MARKETING_OPS_READ_MODEL_PATH];
  });

  it('wraps summary payload in data/meta contract', async () => {
    const service = require(MARKETING_OPS_SERVICE_PATH);
    const readModel = require(MARKETING_OPS_READ_MODEL_PATH);

    service.getSummary = async () => ({
      campaigns: [],
      content: [],
      sequences: [],
      sessions: [],
      stats: { activeCampaigns: 0, contentInPipeline: 0 },
    });

    const result = await readModel.build();
    assert.ok(result.data);
    assert.ok(result.meta);
    assert.equal(result.meta.partial, false);
    assert.deepEqual(result.meta.degradedSources, []);
    assert.equal(result.meta.sourceFreshness.campaigns.status, 'ok');
  });

  it('flags degraded sources when summary payload is incomplete', async () => {
    const service = require(MARKETING_OPS_SERVICE_PATH);
    const readModel = require(MARKETING_OPS_READ_MODEL_PATH);

    service.getSummary = async () => ({
      campaigns: null,
      content: [],
      sequences: null,
      sessions: null,
      stats: null,
    });

    const result = await readModel.build();
    assert.equal(result.meta.partial, true);
    assert.ok(result.meta.degradedSources.includes('campaigns'));
    assert.ok(result.meta.degradedSources.includes('sequences'));
    assert.ok(result.meta.degradedSources.includes('sessions'));
    assert.ok(result.meta.degradedSources.includes('stats'));
  });
});
