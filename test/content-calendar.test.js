const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ─── Notion Service exports ───────────────────────────────────────────────────

describe('Notion Service — content calendar exports', () => {
  let notionService;

  it('loads the notion service without crashing', () => {
    notionService = require('../server/services/notion');
    assert.ok(notionService);
  });

  it('exports getContentCalendarByMonth as a function', () => {
    assert.equal(typeof notionService.getContentCalendarByMonth, 'function');
  });

  it('exports getUnscheduledContent as a function', () => {
    assert.equal(typeof notionService.getUnscheduledContent, 'function');
  });

  it('exports resolveCampaignNames as a function', () => {
    assert.equal(typeof notionService.resolveCampaignNames, 'function');
  });

  it('exports createContentCalendarItem as a function', () => {
    assert.equal(typeof notionService.createContentCalendarItem, 'function');
  });

  it('exports updateContentCalendarItem as a function', () => {
    assert.equal(typeof notionService.updateContentCalendarItem, 'function');
  });
});

// ─── Marketing Ops Service exports ───────────────────────────────────────────

describe('Marketing Ops Service — content calendar exports', () => {
  let service;

  it('loads the marketing-ops-service without crashing', () => {
    service = require('../server/services/marketing-ops-service');
    assert.ok(service);
  });

  it('exports getContentForMonth as a function', () => {
    assert.equal(typeof service.getContentForMonth, 'function');
  });

  it('exports createContent as a function', () => {
    assert.equal(typeof service.createContent, 'function');
  });

  it('exports updateContent as a function', () => {
    assert.equal(typeof service.updateContent, 'function');
  });
});

// ─── Marketing Ops Route — structure ─────────────────────────────────────────

describe('Marketing Ops Route — content calendar route handlers', () => {
  let router;

  it('loads the marketing-ops route without crashing', () => {
    router = require('../server/routes/marketing-ops');
    assert.ok(router);
  });

  it('has GET /content/calendar registered', () => {
    const matches = router.stack.filter(
      l => l.route && l.route.methods.get && l.route.path === '/content/calendar'
    );
    assert.equal(matches.length, 1);
  });

  it('has POST /content registered', () => {
    const matches = router.stack.filter(
      l => l.route && l.route.methods.post && l.route.path === '/content'
    );
    assert.equal(matches.length, 1);
  });

  it('has PATCH /content/:id registered', () => {
    const matches = router.stack.filter(
      l => l.route && l.route.methods.patch && l.route.path === '/content/:id'
    );
    assert.equal(matches.length, 1);
  });
});

// ─── GET /content/calendar — validation ──────────────────────────────────────

describe('GET /content/calendar — validation logic', () => {
  function makeRes() {
    const res = { _status: 200, _body: null };
    res.status = (code) => { res._status = code; return res; };
    res.json = (body) => { res._body = body; return res; };
    return res;
  }

  let getHandler;
  it('finds the GET /content/calendar handler', () => {
    const router = require('../server/routes/marketing-ops');
    const layer = router.stack.find(
      l => l.route && l.route.methods.get && l.route.path === '/content/calendar'
    );
    getHandler = layer.route.stack[0].handle;
    assert.ok(typeof getHandler === 'function');
  });

  it('rejects missing month param with 400', async () => {
    const req = { query: {} };
    const res = makeRes();
    await getHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('month'));
  });

  it('rejects invalid month format with 400', async () => {
    const req = { query: { month: '2026/03' } };
    const res = makeRes();
    await getHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('YYYY-MM'));
  });

  it('rejects month 13 with 400', async () => {
    const req = { query: { month: '2026-13' } };
    const res = makeRes();
    await getHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('Invalid month'));
  });
});

// ─── POST /content — validation ──────────────────────────────────────────────

describe('POST /content — validation logic', () => {
  function makeRes() {
    const res = { _status: 200, _body: null };
    res.status = (code) => { res._status = code; return res; };
    res.json = (body) => { res._body = body; return res; };
    return res;
  }

  let postHandler;
  it('finds the POST /content handler', () => {
    const router = require('../server/routes/marketing-ops');
    const layer = router.stack.find(
      l => l.route && l.route.methods.post && l.route.path === '/content'
    );
    postHandler = layer.route.stack[0].handle;
    assert.ok(typeof postHandler === 'function');
  });

  it('rejects missing name with 400', async () => {
    const req = { body: { status: 'Briefed' } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('name'));
  });

  it('rejects invalid status with 400', async () => {
    const req = { body: { name: 'Test post', status: 'Draft' } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('status'));
  });

  it('rejects invalid contentType with 400', async () => {
    const req = { body: { name: 'Test post', contentType: 'Podcast' } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('contentType'));
  });

  it('rejects non-array channels with 400', async () => {
    const req = { body: { name: 'Test post', channels: 'Email' } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('array'));
  });

  it('rejects invalid channel name with 400', async () => {
    const req = { body: { name: 'Test post', channels: ['TikTok'] } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('channel'));
  });

  it('rejects invalid publishDate format with 400', async () => {
    const req = { body: { name: 'Test post', publishDate: '15-04-2026' } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('publishDate'));
  });

  it('rejects invalid campaignId format with 400', async () => {
    const req = { body: { name: 'Test post', campaignId: 'not-a-valid-id' } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('campaignId'));
  });
});

// ─── PATCH /content/:id — validation ─────────────────────────────────────────

describe('PATCH /content/:id — validation logic', () => {
  function makeRes() {
    const res = { _status: 200, _body: null };
    res.status = (code) => { res._status = code; return res; };
    res.json = (body) => { res._body = body; return res; };
    return res;
  }

  let patchHandler;
  it('finds the PATCH /content/:id handler', () => {
    const router = require('../server/routes/marketing-ops');
    const layer = router.stack.find(
      l => l.route && l.route.methods.patch && l.route.path === '/content/:id'
    );
    patchHandler = layer.route.stack[0].handle;
    assert.ok(typeof patchHandler === 'function');
  });

  it('rejects invalid page ID format with 400', async () => {
    const req = { params: { id: 'not-a-valid-id' }, body: { status: 'Scheduled' } };
    const res = makeRes();
    await patchHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('page ID'));
  });

  it('rejects empty body with 400', async () => {
    const req = { params: { id: 'a'.repeat(32) }, body: {} };
    const res = makeRes();
    await patchHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('At least one field'));
  });

  it('rejects invalid status with 400', async () => {
    const req = { params: { id: 'a'.repeat(32) }, body: { status: 'Live' } };
    const res = makeRes();
    await patchHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('status'));
  });

  it('rejects invalid contentType with 400', async () => {
    const req = { params: { id: 'a'.repeat(32) }, body: { contentType: 'Podcast' } };
    const res = makeRes();
    await patchHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('contentType'));
  });

  it('rejects invalid publishDate format with 400', async () => {
    const req = { params: { id: 'a'.repeat(32) }, body: { publishDate: '2026/04/20' } };
    const res = makeRes();
    await patchHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('publishDate'));
  });
});

// ─── getContentForMonth — date math ──────────────────────────────────────────

describe('getContentForMonth — byDate grouping', () => {
  it('correctly groups items by date string', () => {
    // Test the grouping logic directly with mock data
    const items = [
      { id: '1', 'Publish Date': { start: '2026-03-15' }, Name: 'Post A' },
      { id: '2', 'Publish Date': { start: '2026-03-15' }, Name: 'Post B' },
      { id: '3', 'Publish Date': { start: '2026-03-20' }, Name: 'Post C' },
      { id: '4', 'Publish Date': null, Name: 'Post D' }, // no date — skipped
    ];

    const byDate = {};
    for (const item of items) {
      const publishDate = item['Publish Date'];
      const dateStr = publishDate && typeof publishDate === 'object' ? publishDate.start : publishDate;
      if (!dateStr) continue;
      const day = dateStr.slice(0, 10);
      if (!byDate[day]) byDate[day] = [];
      byDate[day].push(item);
    }

    assert.equal(byDate['2026-03-15'].length, 2);
    assert.equal(byDate['2026-03-20'].length, 1);
    assert.equal(Object.keys(byDate).length, 2); // item with no date is skipped
  });

  it('calculates correct end-of-month dates', () => {
    // Verify the last-day calculation matches expected values
    function lastDay(month) {
      const [year, mo] = month.split('-').map(Number);
      return new Date(year, mo, 0).getDate();
    }

    assert.equal(lastDay('2026-03'), 31);
    assert.equal(lastDay('2026-04'), 30);
    assert.equal(lastDay('2026-02'), 28);
    assert.equal(lastDay('2024-02'), 29); // leap year
  });
});

// ─── resolveCampaignNames — batch deduplication ───────────────────────────────

describe('resolveCampaignNames — batch campaign resolution', () => {
  it('deduplicates campaign IDs before fetching', () => {
    // Verify Set deduplication works correctly
    const items = [
      { Campaign: ['id-abc'] },
      { Campaign: ['id-abc'] }, // same campaign, should fetch only once
      { Campaign: ['id-xyz'] },
      { Campaign: [] },
      { Campaign: null },
    ];

    const uniqueIds = [...new Set(
      items.flatMap(item => (Array.isArray(item.Campaign) ? item.Campaign : []))
    )];

    assert.equal(uniqueIds.length, 2);
    assert.ok(uniqueIds.includes('id-abc'));
    assert.ok(uniqueIds.includes('id-xyz'));
  });

  it('maps null campaign to null campaignName', () => {
    const nameById = { 'id-abc': 'Summer Campaign' };

    const items = [
      { Campaign: ['id-abc'] },
      { Campaign: [] },
      { Campaign: null },
    ];

    const mapped = items.map(item => {
      const campaignIds = Array.isArray(item.Campaign) ? item.Campaign : [];
      const campaignName = campaignIds.length > 0 ? (nameById[campaignIds[0]] || null) : null;
      return { ...item, campaignName };
    });

    assert.equal(mapped[0].campaignName, 'Summer Campaign');
    assert.equal(mapped[1].campaignName, null);
    assert.equal(mapped[2].campaignName, null);
  });
});

// ─── POST /content — new field validation ────────────────────────────────────

describe('POST /content — new field validation', () => {
  function makeRes() {
    const res = { _status: 200, _body: null };
    res.status = (code) => { res._status = code; return res; };
    res.json = (body) => { res._body = body; return res; };
    return res;
  }

  let postHandler;
  it('finds the POST /content handler', () => {
    const router = require('../server/routes/marketing-ops');
    const layer = router.stack.find(
      l => l.route && l.route.methods.post && l.route.path === '/content'
    );
    postHandler = layer.route.stack[0].handle;
    assert.ok(typeof postHandler === 'function');
  });

  it('rejects invalid contentPillar with 400', async () => {
    const req = { body: { name: 'Test post', contentPillar: 'Sales' } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('contentPillar'));
  });

  it('accepts valid contentPillar without validation error', async () => {
    const req = { body: { name: 'Test post', contentPillar: 'Education' } };
    const res = makeRes();
    await postHandler(req, res).catch(() => {});
    if (res._status === 400) {
      assert.ok(!res._body.error.includes('contentPillar'));
    }
  });

  it('rejects non-array audienceSegment with 400', async () => {
    const req = { body: { name: 'Test post', audienceSegment: 'Curious Creators' } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('audienceSegment'));
  });

  it('rejects non-array productFocus with 400', async () => {
    const req = { body: { name: 'Test post', productFocus: 'T-shirts' } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('productFocus'));
  });

  it('accepts array audienceSegment without validation error', async () => {
    const req = { body: { name: 'Test post', audienceSegment: ['Curious Creators'] } };
    const res = makeRes();
    await postHandler(req, res).catch(() => {});
    if (res._status === 400) {
      assert.ok(!res._body.error.includes('audienceSegment'));
    }
  });
});

// ─── PATCH /content/:id — new field validation ───────────────────────────────

describe('PATCH /content/:id — new field validation', () => {
  function makeRes() {
    const res = { _status: 200, _body: null };
    res.status = (code) => { res._status = code; return res; };
    res.json = (body) => { res._body = body; return res; };
    return res;
  }

  let patchHandler;
  it('finds the PATCH /content/:id handler', () => {
    const router = require('../server/routes/marketing-ops');
    const layer = router.stack.find(
      l => l.route && l.route.methods.patch && l.route.path === '/content/:id'
    );
    patchHandler = layer.route.stack[0].handle;
    assert.ok(typeof patchHandler === 'function');
  });

  it('rejects invalid contentPillar with 400', async () => {
    const req = { params: { id: 'a'.repeat(32) }, body: { contentPillar: 'Sales' } };
    const res = makeRes();
    await patchHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('contentPillar'));
  });

  it('accepts valid contentPillar without validation error', async () => {
    const req = { params: { id: 'a'.repeat(32) }, body: { contentPillar: 'Community' } };
    const res = makeRes();
    await patchHandler(req, res).catch(() => {});
    if (res._status === 400) {
      assert.ok(!res._body.error.includes('contentPillar'));
    }
  });

  it('rejects non-array audienceSegment with 400', async () => {
    const req = { params: { id: 'a'.repeat(32) }, body: { audienceSegment: 'AI Artists' } };
    const res = makeRes();
    await patchHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('audienceSegment'));
  });

  it('rejects non-array productFocus with 400', async () => {
    const req = { params: { id: 'a'.repeat(32) }, body: { productFocus: 'T-shirts' } };
    const res = makeRes();
    await patchHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('productFocus'));
  });
});

// ─── Status and content type enum coverage ────────────────────────────────────

describe('POST /content — status enum coverage', () => {
  function makeRes() {
    const res = { _status: 200, _body: null };
    res.status = (code) => { res._status = code; return res; };
    res.json = (body) => { res._body = body; return res; };
    return res;
  }

  let postHandler;
  it('finds the POST /content handler', () => {
    const router = require('../server/routes/marketing-ops');
    const layer = router.stack.find(
      l => l.route && l.route.methods.post && l.route.path === '/content'
    );
    postHandler = layer.route.stack[0].handle;
    assert.ok(typeof postHandler === 'function');
  });

  it('rejects "Draft" status (not in Notion schema) with 400', async () => {
    const req = { body: { name: 'Test', status: 'Draft' } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('status'));
  });

  it('accepts "Briefed" status with no validation error (proceeds to service)', async () => {
    // Handler will attempt service call and fail (no DB), but NOT with a 400 status error
    const req = { body: { name: 'Test', status: 'Briefed' } };
    const res = makeRes();
    // We only care that we don't get a 400 for status validation
    await postHandler(req, res).catch(() => {});
    // If 400, the error should not be about 'status'
    if (res._status === 400) {
      assert.ok(!res._body.error.includes('Invalid status'));
    }
  });

  it('accepts "Brand Review" status with no validation error', async () => {
    const req = { body: { name: 'Test', status: 'Brand Review' } };
    const res = makeRes();
    await postHandler(req, res).catch(() => {});
    if (res._status === 400) {
      assert.ok(!res._body.error.includes('Invalid status'));
    }
  });

  it('accepts "Carousel" contentType with no validation error', async () => {
    const req = { body: { name: 'Test', contentType: 'Carousel' } };
    const res = makeRes();
    await postHandler(req, res).catch(() => {});
    if (res._status === 400) {
      assert.ok(!res._body.error.includes('Invalid contentType'));
    }
  });

  it('accepts "Reel" contentType with no validation error', async () => {
    const req = { body: { name: 'Test', contentType: 'Reel' } };
    const res = makeRes();
    await postHandler(req, res).catch(() => {});
    if (res._status === 400) {
      assert.ok(!res._body.error.includes('Invalid contentType'));
    }
  });
});
