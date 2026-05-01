'use strict';

/**
 * Tests for server/services/dan-colin-service.js
 *
 * All Notion SDK calls are mocked — no live API hits.
 * Pattern mirrors test/system-map.test.js (node:test built-in runner).
 */

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const SERVICE_PATH = path.join(__dirname, '../server/services/dan-colin-service.js');
const NOTION_PATH  = path.join(__dirname, '../server/services/notion.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

function stubModule(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
    parent: null,
    children: [],
    paths: [],
  };
}

function clearModuleCache() {
  delete require.cache[SERVICE_PATH];
  delete require.cache[NOTION_PATH];
}

/**
 * Build a minimal simplified Notion row (as returned by queryDatabase).
 * Pass overrides to customise individual fields.
 */
function makeRow(overrides = {}) {
  const base = {
    id: 'row-id-' + Math.random().toString(36).slice(2, 8),
    'Body': 'Test body',
    'Answer': '',
    'Recommendation': '',
    'Section': '🔥 Now',
    'Owner': 'Colin',
    'Status': 'Open',
    'Focus Area': [],
    created: '2026-04-01T10:00:00.000Z',
    updated: new Date().toISOString(),
  };
  return { ...base, ...overrides };
}

// ── Shared fake notion service ────────────────────────────────────────────────

function buildFakeNotion(rows, pageRetrieveData = null) {
  // Collects pages.update / pages.create calls for assertion
  const calls = { update: [], create: [] };

  const fakeClient = {
    pages: {
      retrieve: async () => ({
        properties: pageRetrieveData || {},
      }),
      update: async (params) => {
        calls.update.push(params);
        return { id: params.page_id };
      },
      create: async (params) => {
        calls.create.push(params);
        return { id: 'new-page-id', url: 'https://notion.so/new-page-id' };
      },
    },
  };

  return {
    getClient: () => fakeClient,
    simplify: (properties) => {
      // Minimal simplify — just return properties as-is (already simplified in makeRow)
      return properties;
    },
    queryDatabase: async () => ({
      results: rows,
      hasMore: false,
      nextCursor: null,
    }),
    getPage: async (id) => ({
      id,
      properties: { Name: 'Focus Area Name' },
    }),
    _calls: calls,
  };
}

// ── describe: getQueue ────────────────────────────────────────────────────────

describe('dan-colin-service: getQueue()', () => {
  afterEach(clearModuleCache);

  it('groups rows by Section correctly', async () => {
    const rows = [
      makeRow({ 'Section': '🔥 Now',            'Status': 'Open' }),
      makeRow({ 'Section': '⚡ Waiting on You', 'Status': 'Open' }),
      makeRow({ 'Section': '📥 Drop',           'Status': 'Open' }),
      makeRow({ 'Section': '👀 Watch',          'Status': 'Open' }),
    ];

    stubModule(NOTION_PATH, buildFakeNotion(rows));
    const { getQueue } = require(SERVICE_PATH);
    const queue = await getQueue();

    assert.equal(queue.now.length,     1, 'now bucket has 1 row');
    assert.equal(queue.waiting.length, 1, 'waiting bucket has 1 row');
    assert.equal(queue.drop.length,    1, 'drop bucket has 1 row');
    assert.equal(queue.watch.length,   1, 'watch bucket has 1 row');
    assert.equal(queue.closed.length,  0, 'closed bucket is empty');
  });

  it('excludes Archived rows — they are filtered at DB level, not in service', async () => {
    // The service passes Status != Archived filter to queryDatabase.
    // Simulate the DB already having excluded them — if a row somehow leaks through
    // with Status=Archived it should still land in a bucket (watch), but the important
    // contract is that the queryDatabase filter is passed correctly. We test that the
    // service passes the right filter by asserting the DB is called with a filter.
    let capturedFilter = null;
    const fakeNotion = buildFakeNotion([]);
    const originalQuery = fakeNotion.queryDatabase;
    fakeNotion.queryDatabase = async (dbId, opts) => {
      capturedFilter = opts.filter;
      return originalQuery(dbId, opts);
    };

    stubModule(NOTION_PATH, fakeNotion);
    const { getQueue } = require(SERVICE_PATH);
    await getQueue();

    assert.ok(capturedFilter, 'queryDatabase was called with a filter');
    assert.equal(
      capturedFilter.property,
      'Status',
      'filter targets the Status property'
    );
    assert.deepEqual(
      capturedFilter.select,
      { does_not_equal: 'Archived' },
      'filter excludes Archived status'
    );
  });

  it('puts Status=Resolved rows in closed bucket', async () => {
    const rows = [
      makeRow({ 'Section': '🔥 Now', 'Status': 'Resolved' }),
    ];

    stubModule(NOTION_PATH, buildFakeNotion(rows));
    const { getQueue } = require(SERVICE_PATH);
    const queue = await getQueue();

    assert.equal(queue.closed.length, 1, 'Resolved row goes to closed');
    assert.equal(queue.now.length,    0, 'Resolved row does not appear in now');
  });

  it('puts Section=✅ Closed rows updated within 7 days in closed bucket', async () => {
    const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago
    const rows = [
      makeRow({ 'Section': '✅ Closed', 'Status': 'Open', updated: recentDate }),
    ];

    stubModule(NOTION_PATH, buildFakeNotion(rows));
    const { getQueue } = require(SERVICE_PATH);
    const queue = await getQueue();

    assert.equal(queue.closed.length, 1, '✅ Closed row within 7 days goes to closed');
  });

  it('does NOT put Section=✅ Closed rows older than 7 days in closed bucket', async () => {
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago
    const rows = [
      makeRow({ 'Section': '✅ Closed', 'Status': 'Open', updated: oldDate }),
    ];

    stubModule(NOTION_PATH, buildFakeNotion(rows));
    const { getQueue } = require(SERVICE_PATH);
    const queue = await getQueue();

    // Older ✅ Closed rows with Status=Open fall through to the watch bucket (default)
    assert.equal(queue.closed.length, 0, 'Old ✅ Closed row is not in closed bucket');
    assert.equal(queue.watch.length,  1, 'Old ✅ Closed row falls to watch bucket');
  });

  it('each row has the documented shape', async () => {
    const rows = [
      makeRow({
        id: 'abc-123',
        'Body': 'Test ask',
        'Answer': 'Test answer',
        'Recommendation': 'Do this',
        'Section': '🔥 Now',
        'Owner': 'Dan',
        'Status': 'Open',
        'Focus Area': ['focus-id-0000000000000000000000000001'],
        created: '2026-01-01T00:00:00.000Z',
        updated: '2026-04-01T00:00:00.000Z',
      }),
    ];

    stubModule(NOTION_PATH, buildFakeNotion(rows));
    const { getQueue } = require(SERVICE_PATH);
    const queue = await getQueue();
    const row = queue.now[0];

    assert.equal(row.id,               'abc-123');
    assert.equal(row.body,             'Test ask');
    assert.equal(row.answer,           'Test answer');
    assert.equal(row.recommendation,   'Do this');
    assert.equal(row.section,          '🔥 Now');
    assert.equal(row.owner,            'Dan');
    assert.equal(row.status,           'Open');
    assert.ok(Array.isArray(row.focusAreaIds),   'focusAreaIds is array');
    assert.ok(Array.isArray(row.focusAreaNames), 'focusAreaNames is array');
    assert.ok(row.createdAt !== undefined,        'createdAt present');
    assert.ok(row.updatedAt !== undefined,        'updatedAt present');
  });

  it('meta.counts reflects bucket sizes', async () => {
    const rows = [
      makeRow({ 'Section': '🔥 Now' }),
      makeRow({ 'Section': '🔥 Now' }),
      makeRow({ 'Section': '⚡ Waiting on You' }),
    ];

    stubModule(NOTION_PATH, buildFakeNotion(rows));
    const { getQueue } = require(SERVICE_PATH);
    const queue = await getQueue();

    assert.equal(queue.meta.counts.now,     2);
    assert.equal(queue.meta.counts.waiting, 1);
    assert.equal(queue.meta.counts.total,   3);
    assert.ok(queue.meta.lastSyncedAt, 'lastSyncedAt is set');
  });
});

// ── describe: submitAnswer ────────────────────────────────────────────────────

describe('dan-colin-service: submitAnswer()', () => {
  afterEach(clearModuleCache);

  it('on a ⚡ Waiting row with non-empty answer, sets Section=✅ Closed and Status=Resolved', async () => {
    // pages.retrieve returns a Waiting on You row
    const waitingProperties = {
      Section: { type: 'select', select: { name: '⚡ Waiting on You' } },
      Status:  { type: 'select', select: { name: 'Open' } },
    };
    const fakeNotion = buildFakeNotion([], waitingProperties);
    // Override simplify to handle raw Notion property shapes
    fakeNotion.simplify = (props) => {
      const result = {};
      for (const [key, val] of Object.entries(props)) {
        if (val.type === 'select') result[key] = val.select ? val.select.name : null;
        else result[key] = val;
      }
      return result;
    };

    stubModule(NOTION_PATH, fakeNotion);
    const { submitAnswer } = require(SERVICE_PATH);
    const result = await submitAnswer('page-id-0001', 'My answer');

    assert.equal(result.autoClose, true, 'autoClose should be true');

    const updateCall = fakeNotion._calls.update[0];
    assert.ok(updateCall, 'pages.update was called');
    assert.equal(updateCall.page_id, 'page-id-0001');
    assert.ok(updateCall.properties.Answer, 'Answer property set');
    assert.equal(
      updateCall.properties.Section.select.name,
      '✅ Closed',
      'Section set to ✅ Closed'
    );
    assert.equal(
      updateCall.properties.Status.select.name,
      'Resolved',
      'Status set to Resolved'
    );
  });

  it('on a ⚡ Waiting row with empty answer, does NOT auto-close', async () => {
    const waitingProperties = {
      Section: { type: 'select', select: { name: '⚡ Waiting on You' } },
      Status:  { type: 'select', select: { name: 'Open' } },
    };
    const fakeNotion = buildFakeNotion([], waitingProperties);
    fakeNotion.simplify = (props) => {
      const result = {};
      for (const [key, val] of Object.entries(props)) {
        if (val.type === 'select') result[key] = val.select ? val.select.name : null;
        else result[key] = val;
      }
      return result;
    };

    stubModule(NOTION_PATH, fakeNotion);
    const { submitAnswer } = require(SERVICE_PATH);
    const result = await submitAnswer('page-id-0002', '');

    assert.equal(result.autoClose, false, 'autoClose should be false for empty answer');

    const updateCall = fakeNotion._calls.update[0];
    assert.ok(updateCall, 'pages.update was still called (to clear/set Answer)');
    assert.ok(!updateCall.properties.Section, 'Section NOT updated');
    assert.ok(!updateCall.properties.Status,  'Status NOT updated');
  });

  it('on a non-Waiting row with non-empty answer, does NOT auto-close', async () => {
    const nowProperties = {
      Section: { type: 'select', select: { name: '🔥 Now' } },
      Status:  { type: 'select', select: { name: 'Open' } },
    };
    const fakeNotion = buildFakeNotion([], nowProperties);
    fakeNotion.simplify = (props) => {
      const result = {};
      for (const [key, val] of Object.entries(props)) {
        if (val.type === 'select') result[key] = val.select ? val.select.name : null;
        else result[key] = val;
      }
      return result;
    };

    stubModule(NOTION_PATH, fakeNotion);
    const { submitAnswer } = require(SERVICE_PATH);
    const result = await submitAnswer('page-id-0003', 'Some answer');

    assert.equal(result.autoClose, false, 'autoClose is false for non-Waiting section');

    const updateCall = fakeNotion._calls.update[0];
    assert.ok(!updateCall.properties.Section, 'Section NOT updated for non-Waiting row');
  });
});

// ── describe: createDrop ──────────────────────────────────────────────────────

describe('dan-colin-service: createDrop()', () => {
  afterEach(clearModuleCache);

  it('creates a page with Section=📥 Drop, Owner=Colin, Status=Open', async () => {
    const fakeNotion = buildFakeNotion([]);
    stubModule(NOTION_PATH, fakeNotion);

    const { createDrop } = require(SERVICE_PATH);
    const result = await createDrop('Test drop item');

    assert.equal(result.id, 'new-page-id', 'returns new page id');
    assert.ok(result.url, 'returns url');

    const createCall = fakeNotion._calls.create[0];
    assert.ok(createCall, 'pages.create was called');

    const props = createCall.properties;
    assert.ok(props.Body?.title?.[0]?.text?.content === 'Test drop item', 'Body set correctly');
    assert.equal(props.Section?.select?.name, '📥 Drop',  'Section = 📥 Drop');
    assert.equal(props.Owner?.select?.name,   'Colin',    'Owner = Colin');
    assert.equal(props.Status?.select?.name,  'Open',     'Status = Open');
  });

  it('uses the correct parent database ID', async () => {
    const fakeNotion = buildFakeNotion([]);
    stubModule(NOTION_PATH, fakeNotion);

    const { createDrop } = require(SERVICE_PATH);
    await createDrop('Another drop');

    const createCall = fakeNotion._calls.create[0];
    assert.equal(
      createCall.parent.database_id,
      '43d71386-85a1-4582-a2dd-6d541bdcc5d3',
      'uses the Dan ↔ Colin Queue DB ID'
    );
  });
});

// ── describe: route shape ─────────────────────────────────────────────────────

describe('dan-colin route: handler wiring', () => {
  const ROUTE_PATH = path.join(__dirname, '../server/routes/dan-colin.js');
  const APPROVAL_PATH = path.join(__dirname, '../server/services/approval.js');

  afterEach(() => {
    delete require.cache[ROUTE_PATH];
    delete require.cache[SERVICE_PATH];
    delete require.cache[NOTION_PATH];
    delete require.cache[APPROVAL_PATH];
  });

  function findRouteHandler(router, method, routePath) {
    const layer = router.stack.find(
      (entry) => entry.route
        && entry.route.path === routePath
        && entry.route.methods[method],
    );
    return layer?.route?.stack?.[0]?.handle;
  }

  it('GET / is registered and returns queue data', async () => {
    const fakeQueue = {
      now: [], waiting: [], drop: [], watch: [], closed: [],
      meta: { lastSyncedAt: new Date().toISOString(), counts: { total: 0 } },
    };

    stubModule(SERVICE_PATH, {
      getQueue:       async () => fakeQueue,
      submitAnswer:   async () => {},
      createDrop:     async () => {},
      invalidateCache: () => {},
    });

    stubModule(APPROVAL_PATH, {
      createApproval: () => ({ id: 'appr-1', promise: Promise.resolve(true) }),
      resolveApproval: () => true,
      getPendingApprovals: () => [],
    });

    const router = require(ROUTE_PATH);
    const handler = findRouteHandler(router, 'get', '/');
    assert.ok(handler, 'GET / handler registered');

    let jsonPayload = null;
    await handler({ query: {} }, {
      json(p) { jsonPayload = p; },
      status(_c) { return { json(p) { jsonPayload = p; } }; },
    });

    assert.deepEqual(jsonPayload, fakeQueue, 'returns queue payload');
  });

  it('POST /:id/answer is registered', async () => {
    stubModule(SERVICE_PATH, {
      getQueue:        async () => ({}),
      submitAnswer:    async () => ({ id: 'p1', autoClose: false }),
      createDrop:      async () => {},
      invalidateCache: () => {},
    });

    stubModule(APPROVAL_PATH, {
      createApproval: () => ({ id: 'appr-2', promise: Promise.resolve(false) }),
      resolveApproval: () => true,
      getPendingApprovals: () => [],
    });

    const router = require(ROUTE_PATH);
    const handler = findRouteHandler(router, 'post', '/:id/answer');
    assert.ok(handler, 'POST /:id/answer handler registered');
  });

  it('POST /drop is registered', async () => {
    stubModule(SERVICE_PATH, {
      getQueue:        async () => ({}),
      submitAnswer:    async () => {},
      createDrop:      async () => ({ id: 'new', url: 'https://notion.so' }),
      invalidateCache: () => {},
    });

    stubModule(APPROVAL_PATH, {
      createApproval: () => ({ id: 'appr-3', promise: Promise.resolve(false) }),
      resolveApproval: () => true,
      getPendingApprovals: () => [],
    });

    const router = require(ROUTE_PATH);
    const handler = findRouteHandler(router, 'post', '/drop');
    assert.ok(handler, 'POST /drop handler registered');
  });

  it('GET / returns 500 when service throws', async () => {
    stubModule(SERVICE_PATH, {
      getQueue: async () => { throw new Error('Notion timeout'); },
      submitAnswer: async () => {},
      createDrop:   async () => {},
      invalidateCache: () => {},
    });

    stubModule(APPROVAL_PATH, {
      createApproval: () => ({ id: 'appr-4', promise: Promise.resolve(true) }),
      resolveApproval: () => true,
      getPendingApprovals: () => [],
    });

    const router = require(ROUTE_PATH);
    const handler = findRouteHandler(router, 'get', '/');

    let statusCode = null;
    let jsonPayload = null;

    await handler({}, {
      json(p) { jsonPayload = p; },
      status(c) {
        statusCode = c;
        return { json(p) { jsonPayload = p; } };
      },
    });

    assert.equal(statusCode, 500, 'returns 500 on error');
    assert.ok(jsonPayload.error, 'returns error message');
  });
});
