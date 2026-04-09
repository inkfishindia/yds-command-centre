'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('Frontend Read Model Helpers', () => {
  it('builds stable read model URLs', async () => {
    const helpers = await import('../src/js/modules/read-models.js');

    assert.equal(
      helpers.getReadModelUrl('marketing-ops'),
      '/api/read-models/marketing-ops',
    );
  });

  it('unwraps read model responses into data and meta', async () => {
    const helpers = await import('../src/js/modules/read-models.js');
    const payload = helpers.unwrapReadModelResponse({
      data: { ok: true },
      meta: { stale: false },
    });

    assert.deepEqual(payload, {
      data: { ok: true },
      meta: { stale: false },
    });
  });

  it('treats stale payloads as critical even when partial', async () => {
    const helpers = await import('../src/js/modules/read-models.js');

    assert.equal(
      helpers.getReadModelTone({ stale: true, partial: true }),
      'critical',
    );
  });

  it('surfaces fallback reasons in summaries', async () => {
    const helpers = await import('../src/js/modules/read-models.js');

    assert.equal(
      helpers.getReadModelSummary({
        stale: true,
        partial: true,
        fallbackReason: 'overview rebuild failed',
      }),
      'Fallback data in use: overview rebuild failed',
    );
  });
});
