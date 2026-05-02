'use strict';

/**
 * Tests for server/services/activity-feed-service.js
 *
 * All external service calls are mocked — no live API hits.
 * Pattern mirrors test/dan-colin-service.test.js (node:test built-in runner).
 */

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const SERVICE_PATH      = path.join(__dirname, '../server/services/activity-feed-service.js');
const NOTION_PATH       = path.join(__dirname, '../server/services/notion.js');
const DAN_COLIN_PATH    = path.join(__dirname, '../server/services/dan-colin-service.js');

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
  delete require.cache[DAN_COLIN_PATH];
}

// ISO date string N days ago from today
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ISO datetime string N days ago
function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ── Fake builders ─────────────────────────────────────────────────────────────

/**
 * Build a fake notion service.
 * decisionsRows        — rows returned when Decisions DB is queried
 * commitmentsRows      — rows returned when Commitments DB is queried
 * contentCalendarRows  — rows returned when Content Calendar DB is queried
 */
function buildFakeNotion({ decisionsRows = [], commitmentsRows = [], contentCalendarRows = [] } = {}) {
  const DECISIONS_DB        = '3c8a9b22ba924f20bfdcab4cc7a46478';
  const COMMITMENTS_DB      = '0b50073e544942aab1099fc559b390fb';
  const CONTENT_CALENDAR_DB = '227f3365feab476e88791f2a4d0a72b9';

  return {
    queryDatabase: async (dbId) => {
      if (dbId === DECISIONS_DB) {
        return { results: decisionsRows, hasMore: false, nextCursor: null };
      }
      if (dbId === COMMITMENTS_DB) {
        return { results: commitmentsRows, hasMore: false, nextCursor: null };
      }
      if (dbId === CONTENT_CALENDAR_DB) {
        return { results: contentCalendarRows, hasMore: false, nextCursor: null };
      }
      return { results: [], hasMore: false, nextCursor: null };
    },
  };
}

function buildFakeDanColin(closedItems = []) {
  return {
    getQueue: async () => ({
      now: [], waiting: [], drop: [], watch: [],
      closed: closedItems,
      meta: { lastSyncedAt: new Date().toISOString(), counts: { total: closedItems.length } },
    }),
  };
}

// Minimal decision row (already simplified, as queryDatabase returns)
function makeDecisionRow(overrides = {}) {
  return {
    id: 'dec-' + Math.random().toString(36).slice(2, 8),
    'Name': 'Test Decision',
    'Date': { start: daysAgo(2), end: null },
    'Owner': 'Dan',
    'Decision': 'We decided X',
    'Context': 'Because of Y',
    'Focus Area': [],
    created: daysAgoISO(2),
    updated: daysAgoISO(2),
    ...overrides,
  };
}

// Minimal commitment row
function makeCommitmentRow(overrides = {}) {
  return {
    id: 'com-' + Math.random().toString(36).slice(2, 8),
    'Name': 'Test Commitment',
    'Status': 'In Progress',
    'Due Date': { start: daysAgo(1), end: null },
    'Focus Area': [],
    created: daysAgoISO(3),
    updated: daysAgoISO(1),     // last_edited_time lands here via queryDatabase wrapper
    ...overrides,
  };
}

// Minimal closed queue item (as returned by dan-colin-service transformRow)
function makeQueueItem(overrides = {}) {
  return {
    id: 'que-' + Math.random().toString(36).slice(2, 8),
    body: 'Test queue item',
    answer: 'Answered',
    section: '✅ Closed',
    owner: 'Colin',
    status: 'Resolved',
    focusAreaIds: [],
    focusAreaNames: [],
    createdAt: daysAgoISO(5),
    updatedAt: daysAgoISO(1),
    ...overrides,
  };
}

// Minimal Content Calendar row (simplified by notion service)
function makeContentCalendarRow(overrides = {}) {
  return {
    id: 'cc-' + Math.random().toString(36).slice(2, 8),
    url: 'https://www.notion.so/Untitled-content',
    'Title': 'Test Content',
    'Status': 'Drafted',
    'Owner': 'Dan',
    'Pillar (IG)': 'Permission',
    'Hook Pattern': [],
    'Format': 'Reel',
    'Brand Review Status': null,
    created: daysAgoISO(2),
    updated: daysAgoISO(1),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('activity-feed-service: getActivityFeed()', () => {
  afterEach(clearModuleCache);

  it('merges all three sources and returns correct types', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({
      decisionsRows:   [makeDecisionRow()],
      commitmentsRows: [makeCommitmentRow()],
    }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([makeQueueItem()]));

    const { getActivityFeed } = require(SERVICE_PATH);
    const feed = await getActivityFeed({ days: 14 });

    assert.equal(feed.items.length, 3, 'three items total');
    const types = feed.items.map(i => i.type).sort();
    assert.deepEqual(types, ['commitment', 'decision', 'queue'], 'all three types present');
  });

  it('sorts items by date descending', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({
      decisionsRows: [
        makeDecisionRow({ 'Date': { start: daysAgo(5), end: null }, updated: daysAgoISO(5) }),
        makeDecisionRow({ 'Date': { start: daysAgo(1), end: null }, updated: daysAgoISO(1) }),
      ],
      commitmentsRows: [
        makeCommitmentRow({ updated: daysAgoISO(3) }),
      ],
    }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed } = require(SERVICE_PATH);
    const feed = await getActivityFeed({ days: 14 });

    const dates = feed.items.map(i => i.date);
    const sorted = [...dates].sort((a, b) => b.localeCompare(a));
    assert.deepEqual(dates, sorted, 'items are sorted by date descending');
  });

  it('filters out decisions older than days window', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({
      decisionsRows: [
        makeDecisionRow({ 'Date': { start: daysAgo(30), end: null } }), // outside 14-day window
        makeDecisionRow({ 'Date': { start: daysAgo(5), end: null } }),  // inside window
      ],
      commitmentsRows: [],
    }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed } = require(SERVICE_PATH);
    const feed = await getActivityFeed({ days: 14 });

    const decisions = feed.items.filter(i => i.type === 'decision');
    assert.equal(decisions.length, 1, 'only the recent decision is included');
  });

  it('filters out commitments older than days window', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({
      decisionsRows: [],
      commitmentsRows: [
        makeCommitmentRow({ updated: daysAgoISO(30) }), // outside 14-day window
        makeCommitmentRow({ updated: daysAgoISO(7) }),  // inside window
      ],
    }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed } = require(SERVICE_PATH);
    const feed = await getActivityFeed({ days: 14 });

    const commitments = feed.items.filter(i => i.type === 'commitment');
    assert.equal(commitments.length, 1, 'only the recent commitment is included');
  });

  it('filters out queue items older than days window', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({ decisionsRows: [], commitmentsRows: [] }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([
      makeQueueItem({ updatedAt: daysAgoISO(30) }), // outside window
      makeQueueItem({ updatedAt: daysAgoISO(3) }),  // inside window
    ]));

    const { getActivityFeed } = require(SERVICE_PATH);
    const feed = await getActivityFeed({ days: 14 });

    const queueItems = feed.items.filter(i => i.type === 'queue');
    assert.equal(queueItems.length, 1, 'only the recent queue item is included');
  });

  it('clamps days below 1 to 1', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({ decisionsRows: [], commitmentsRows: [] }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed } = require(SERVICE_PATH);
    const feed = await getActivityFeed({ days: 0 });

    assert.equal(feed.meta.days, 1, 'days clamped to minimum 1');
  });

  it('clamps days above 90 to 90', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({ decisionsRows: [], commitmentsRows: [] }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed } = require(SERVICE_PATH);
    const feed = await getActivityFeed({ days: 999 });

    assert.equal(feed.meta.days, 90, 'days clamped to maximum 90');
  });

  it('defaults days to 14 when not provided', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({ decisionsRows: [], commitmentsRows: [] }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed } = require(SERVICE_PATH);
    const feed = await getActivityFeed();

    assert.equal(feed.meta.days, 14, 'defaults to 14 days');
  });

  it('graceful degradation: decisions source throws, other sources still returned', async () => {
    const fakeNotion = {
      queryDatabase: async (dbId) => {
        const DECISIONS_DB = '3c8a9b22ba924f20bfdcab4cc7a46478';
        if (dbId === DECISIONS_DB) throw new Error('Notion timeout');
        return {
          results: [makeCommitmentRow()],
          hasMore: false,
          nextCursor: null,
        };
      },
    };
    stubModule(NOTION_PATH, fakeNotion);
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([makeQueueItem()]));

    const { getActivityFeed } = require(SERVICE_PATH);
    const feed = await getActivityFeed({ days: 14 });

    assert.equal(feed.meta.sources.decisions, false, 'decisions source marked as failed');
    assert.equal(feed.meta.sources.commitments, true, 'commitments source still ok');
    assert.equal(feed.meta.sources.queue, true, 'queue source still ok');

    const types = feed.items.map(i => i.type);
    assert.ok(!types.includes('decision'), 'no decision items in degraded feed');
    assert.ok(types.includes('commitment'), 'commitment items present');
    assert.ok(types.includes('queue'), 'queue items present');
  });

  it('graceful degradation: queue source throws, decision and commitment items returned', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({
      decisionsRows:   [makeDecisionRow()],
      commitmentsRows: [makeCommitmentRow()],
    }));
    stubModule(DAN_COLIN_PATH, {
      getQueue: async () => { throw new Error('Queue unavailable'); },
    });

    const { getActivityFeed } = require(SERVICE_PATH);
    const feed = await getActivityFeed({ days: 14 });

    assert.equal(feed.meta.sources.queue, false, 'queue source marked as failed');
    assert.equal(feed.meta.sources.decisions, true, 'decisions still ok');
    assert.equal(feed.meta.sources.commitments, true, 'commitments still ok');
    assert.equal(feed.items.filter(i => i.type === 'decision').length, 1);
    assert.equal(feed.items.filter(i => i.type === 'commitment').length, 1);
  });

  it('cache hit: two consecutive calls with same days return same object reference', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({
      decisionsRows:   [makeDecisionRow()],
      commitmentsRows: [],
    }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed, _clearCache } = require(SERVICE_PATH);
    _clearCache(); // ensure cold start

    const first  = await getActivityFeed({ days: 7 });
    const second = await getActivityFeed({ days: 7 });

    assert.strictEqual(first, second, 'second call returns the same cached object');
  });

  it('cache miss: different days param uses a different cache key', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({
      decisionsRows:   [makeDecisionRow()],
      commitmentsRows: [],
    }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed, _clearCache } = require(SERVICE_PATH);
    _clearCache();

    const feed7  = await getActivityFeed({ days: 7 });
    const feed30 = await getActivityFeed({ days: 30 });

    assert.notStrictEqual(feed7, feed30, 'different days produce different cache entries');
    assert.equal(feed7.meta.days, 7);
    assert.equal(feed30.meta.days, 30);
  });

  it('response shape has all required top-level fields', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({ decisionsRows: [], commitmentsRows: [] }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed, _clearCache } = require(SERVICE_PATH);
    _clearCache();
    const feed = await getActivityFeed({ days: 14 });

    assert.ok(Array.isArray(feed.items), 'items is array');
    assert.ok(feed.meta, 'meta present');
    assert.ok(feed.meta.counts, 'meta.counts present');
    assert.ok('decision' in feed.meta.counts, 'counts.decision present');
    assert.ok('commitment' in feed.meta.counts, 'counts.commitment present');
    assert.ok('queue' in feed.meta.counts, 'counts.queue present');
    assert.ok(feed.meta.sources, 'meta.sources present');
    assert.ok(feed.timestamp, 'timestamp present');
  });

  it('each item has the documented shape fields', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({
      decisionsRows: [makeDecisionRow({
        id: 'dec-shape-test',
        'Name': 'Shape Decision',
        'Decision': 'We went with X',
        'Owner': 'Dan',
        'Focus Area': ['focus-0000000000000000000000000001'],
      })],
      commitmentsRows: [],
    }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed, _clearCache } = require(SERVICE_PATH);
    _clearCache();
    const feed = await getActivityFeed({ days: 14 });

    const item = feed.items.find(i => i.type === 'decision');
    assert.ok(item, 'decision item found');
    assert.ok('id' in item, 'id field present');
    assert.ok('type' in item, 'type field present');
    assert.ok('date' in item, 'date field present');
    assert.ok('title' in item, 'title field present');
    assert.ok('summary' in item, 'summary field present');
    assert.ok('owner' in item, 'owner field present');
    assert.ok('pageId' in item, 'pageId field present');
    assert.ok('focusArea' in item, 'focusArea field present');
    assert.ok('status' in item, 'status field present');

    assert.equal(item.title, 'Shape Decision');
    assert.equal(item.owner, 'Dan');
    assert.equal(item.type, 'decision');
  });

  // ── Content Calendar (4th source) ────────────────────────────────────────────

  it('content calendar row in window appears in merged feed', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({
      contentCalendarRows: [makeContentCalendarRow()],
    }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed, _clearCache } = require(SERVICE_PATH);
    _clearCache();
    const feed = await getActivityFeed({ days: 14 });

    const ccItems = feed.items.filter(i => i.type.startsWith('mcc:'));
    assert.equal(ccItems.length, 1, 'one content calendar item in feed');
  });

  it('mccTypeFromStatus: Drafted maps to mcc:draft', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({
      contentCalendarRows: [makeContentCalendarRow({ 'Status': 'Drafted', updated: daysAgoISO(1) })],
    }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed, _clearCache } = require(SERVICE_PATH);
    _clearCache();
    const feed = await getActivityFeed({ days: 14 });

    const item = feed.items.find(i => i.type.startsWith('mcc:'));
    assert.equal(item.type, 'mcc:draft', 'Drafted → mcc:draft');
  });

  it('mccTypeFromStatus: In Design maps to mcc:draft', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({
      contentCalendarRows: [makeContentCalendarRow({ 'Status': 'In Design', updated: daysAgoISO(1) })],
    }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed, _clearCache } = require(SERVICE_PATH);
    _clearCache();
    const feed = await getActivityFeed({ days: 14 });

    const item = feed.items.find(i => i.type.startsWith('mcc:'));
    assert.equal(item.type, 'mcc:draft', 'In Design → mcc:draft');
  });

  it('mccTypeFromStatus: Brand Review maps to mcc:approval-pending', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({
      contentCalendarRows: [makeContentCalendarRow({ 'Status': 'Brand Review', updated: daysAgoISO(1) })],
    }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed, _clearCache } = require(SERVICE_PATH);
    _clearCache();
    const feed = await getActivityFeed({ days: 14 });

    const item = feed.items.find(i => i.type.startsWith('mcc:'));
    assert.equal(item.type, 'mcc:approval-pending', 'Brand Review → mcc:approval-pending');
  });

  it('mccTypeFromStatus: Approved maps to mcc:scheduled', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({
      contentCalendarRows: [makeContentCalendarRow({ 'Status': 'Approved', updated: daysAgoISO(1) })],
    }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed, _clearCache } = require(SERVICE_PATH);
    _clearCache();
    const feed = await getActivityFeed({ days: 14 });

    const item = feed.items.find(i => i.type.startsWith('mcc:'));
    assert.equal(item.type, 'mcc:scheduled', 'Approved → mcc:scheduled');
  });

  it('mccTypeFromStatus: Published maps to mcc:published', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({
      contentCalendarRows: [makeContentCalendarRow({ 'Status': 'Published', updated: daysAgoISO(1) })],
    }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed, _clearCache } = require(SERVICE_PATH);
    _clearCache();
    const feed = await getActivityFeed({ days: 14 });

    const item = feed.items.find(i => i.type.startsWith('mcc:'));
    assert.equal(item.type, 'mcc:published', 'Published → mcc:published');
  });

  it('mccTypeFromStatus: unknown status maps to mcc:edit (fallback)', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({
      contentCalendarRows: [makeContentCalendarRow({ 'Status': 'Idea', updated: daysAgoISO(1) })],
    }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed, _clearCache } = require(SERVICE_PATH);
    _clearCache();
    const feed = await getActivityFeed({ days: 14 });

    const item = feed.items.find(i => i.type.startsWith('mcc:'));
    assert.equal(item.type, 'mcc:edit', 'Idea (unknown) → mcc:edit fallback');
  });

  it('content calendar item has correct shape: title, who, link, meta, when', async () => {
    const row = makeContentCalendarRow({
      id: 'cc-shape-test',
      url: 'https://www.notion.so/Test-Post',
      'Title': 'Product Launch Reel',
      'Status': 'Scheduled',
      'Owner': 'Dan',
      'Pillar (IG)': 'Craft',
      'Hook Pattern': ['hook-id-1'],
      'Format': 'Reel',
      'Brand Review Status': 'Approved',
      updated: daysAgoISO(2),
    });
    stubModule(NOTION_PATH, buildFakeNotion({ contentCalendarRows: [row] }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed, _clearCache } = require(SERVICE_PATH);
    _clearCache();
    const feed = await getActivityFeed({ days: 14 });

    const item = feed.items.find(i => i.id === 'cc-shape-test');
    assert.ok(item, 'item found by id');
    assert.equal(item.type, 'mcc:scheduled',                      'type correct');
    assert.equal(item.title, 'Product Launch Reel',               'title from Title field');
    assert.equal(item.who, 'Dan',                                 'who from Owner field');
    assert.equal(item.link, 'https://www.notion.so/Test-Post',    'link from url field');
    assert.ok(item.meta,                                          'meta present');
    assert.equal(item.meta.pillar, 'Craft',                       'meta.pillar');
    assert.deepEqual(item.meta.hookPattern, ['hook-id-1'],        'meta.hookPattern');
    assert.equal(item.meta.format, 'Reel',                        'meta.format');
    assert.equal(item.meta.brandReviewStatus, 'Approved',         'meta.brandReviewStatus');
    assert.ok(item.when,                                          'when (ISO timestamp) present');
  });

  it('content calendar item outside window is excluded', async () => {
    stubModule(NOTION_PATH, buildFakeNotion({
      contentCalendarRows: [
        makeContentCalendarRow({ updated: daysAgoISO(30) }), // outside 14-day window
        makeContentCalendarRow({ updated: daysAgoISO(5) }),  // inside window
      ],
    }));
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed, _clearCache } = require(SERVICE_PATH);
    _clearCache();
    const feed = await getActivityFeed({ days: 14 });

    const ccItems = feed.items.filter(i => i.type.startsWith('mcc:'));
    assert.equal(ccItems.length, 1, 'only the recent content calendar item included');
  });

  it('graceful degradation: content source throws, other sources still returned', async () => {
    const CONTENT_CALENDAR_DB = '227f3365feab476e88791f2a4d0a72b9';
    const fakeNotion = {
      queryDatabase: async (dbId) => {
        if (dbId === CONTENT_CALENDAR_DB) throw new Error('Content Calendar timeout');
        const DECISIONS_DB = '3c8a9b22ba924f20bfdcab4cc7a46478';
        if (dbId === DECISIONS_DB) return { results: [makeDecisionRow()], hasMore: false, nextCursor: null };
        return { results: [], hasMore: false, nextCursor: null };
      },
    };
    stubModule(NOTION_PATH, fakeNotion);
    stubModule(DAN_COLIN_PATH, buildFakeDanColin([]));

    const { getActivityFeed, _clearCache } = require(SERVICE_PATH);
    _clearCache();
    const feed = await getActivityFeed({ days: 14 });

    assert.equal(feed.meta.sources.content, false,    'content source marked failed');
    assert.equal(feed.meta.sources.decisions, true,   'decisions source still ok');
    assert.equal(feed.meta.sources.commitments, true, 'commitments source still ok');
    assert.ok(feed.items.some(i => i.type === 'decision'), 'decision items still present');
  });
});
