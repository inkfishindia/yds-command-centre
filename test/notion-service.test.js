const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Test the pure utility functions from notion.js that don't need API access
// We import cautiously — getClient() will fail without NOTION_TOKEN, but
// the utility functions are testable without it.

describe('Notion Service — Pure Functions', () => {
  // These tests verify the exported utility functions work correctly
  // without making any actual API calls

  let notionService;

  it('loads the notion service module without crashing', () => {
    notionService = require('../server/services/notion');
    assert.ok(notionService);
  });

  it('exports all expected functions', () => {
    const expected = [
      'getClient', 'simplify', 'getFocusAreas', 'getOverdueCommitments',
      'getUpcomingCommitments', 'getRecentDecisions', 'getPeople',
      'getProjects', 'getAllCommitments', 'getActiveCommitments', 'getDashboardSummary',
      'listDatabases', 'queryDatabase', 'getPage', 'getPageContent',
      'getRelatedPages', 'getKeyPages', 'clearCache',
    ];
    for (const fn of expected) {
      assert.equal(typeof notionService[fn], 'function', `Missing export: ${fn}`);
    }
  });

  it('listDatabases returns 18 databases', () => {
    const dbs = notionService.listDatabases();
    assert.equal(dbs.length, 18);
    const names = dbs.map(d => d.name);
    assert.ok(names.includes('Focus Areas'));
    assert.ok(names.includes('Projects'));
    assert.ok(names.includes('Commitments'));
    assert.ok(names.includes('People'));
    assert.ok(names.includes('Decisions'));
    assert.ok(names.includes('Platforms'));
    assert.ok(names.includes('Audiences'));
  });

  it('every database has id, name, icon, description', () => {
    const dbs = notionService.listDatabases();
    for (const db of dbs) {
      assert.ok(db.id, `${db.name} missing id`);
      assert.ok(db.name, 'DB missing name');
      assert.ok(db.icon, `${db.name} missing icon`);
      assert.ok(db.description, `${db.name} missing description`);
    }
  });

  it('getKeyPages returns pages with id, name, description', () => {
    const pages = notionService.getKeyPages();
    assert.ok(Array.isArray(pages));
    assert.ok(pages.length > 0);
    for (const page of pages) {
      assert.ok(page.id, 'Page missing id');
      assert.ok(page.name, 'Page missing name');
      assert.ok(page.description, 'Page missing description');
    }
  });

  it('clearCache does not throw', () => {
    assert.doesNotThrow(() => notionService.clearCache());
  });
});

describe('Notion Service — stale-while-revalidate cache', () => {
  // We reach into the module's cache Map via clearCache + the internal
  // setCachedWithTime export so we can plant entries at controlled ages.
  const ns = require('../server/services/notion');

  // Helper: plant a cache entry with an explicit timestamp
  function plantEntry(key, data, ageMs) {
    // clearCache wipes everything; we only need one entry at a time in these tests
    ns.clearCache();
    // setCachedWithTime is exported and accepts (key, data, time)
    ns.setCachedWithTime(key, data, Date.now() - ageMs);
  }

  const FRESH_AGE   = 2 * 60 * 1000;   //  2 min — within TTL
  const STALE_AGE   = 7 * 60 * 1000;   //  7 min — past TTL, within hard expiry
  const EXPIRED_AGE = 20 * 60 * 1000;  // 20 min — past hard expiry

  it('returns fresh data without calling fetchFn', async () => {
    plantEntry('swr-key', 'fresh-value', FRESH_AGE);
    let called = false;
    const result = await ns.deduplicatedFetch('swr-key', () => {
      called = true;
      return Promise.resolve('new-value');
    });
    assert.equal(result, 'fresh-value');
    assert.equal(called, false, 'fetchFn should not be called for fresh cache');
  });

  it('returns stale data immediately when entry is past TTL but within hard expiry', async () => {
    plantEntry('swr-stale', 'stale-value', STALE_AGE);
    const result = await ns.deduplicatedFetch('swr-stale', () => Promise.resolve('new-value'));
    assert.equal(result, 'stale-value', 'Should return stale data without waiting for refresh');
  });

  it('triggers a background refresh for stale entries', async () => {
    plantEntry('swr-bg', 'stale-value', STALE_AGE);
    let refreshCalled = false;
    let resolveRefresh;
    const refreshPromise = new Promise(resolve => { resolveRefresh = resolve; });

    await ns.deduplicatedFetch('swr-bg', () => {
      refreshCalled = true;
      return refreshPromise;
    });

    assert.equal(refreshCalled, true, 'Background fetchFn should be invoked for stale entry');
    // Let the background refresh complete so it does not leak into other tests
    resolveRefresh('refreshed-value');
    await new Promise(r => setImmediate(r)); // drain microtasks
  });

  it('does not stampede — only one background refresh in-flight per key', async () => {
    plantEntry('swr-nodup', 'stale-value', STALE_AGE);
    let callCount = 0;
    const fetchFn = () => {
      callCount++;
      return new Promise(resolve => setImmediate(() => resolve('done')));
    };
    await ns.deduplicatedFetch('swr-nodup', fetchFn);
    await ns.deduplicatedFetch('swr-nodup', fetchFn); // second call while bg is in-flight
    assert.equal(callCount, 1, 'fetchFn must only be called once despite multiple stale reads');
    await new Promise(r => setTimeout(r, 20)); // let background settle
  });

  it('does a blocking fetch when entry is hard-expired', async () => {
    plantEntry('swr-exp', 'expired-value', EXPIRED_AGE);
    let called = false;
    const result = await ns.deduplicatedFetch('swr-exp', () => {
      called = true;
      return Promise.resolve('fresh-from-api');
    });
    assert.equal(called, true, 'fetchFn must be called when entry is hard-expired');
    assert.equal(result, 'fresh-from-api');
  });

  it('does a blocking fetch on cold start (no entry)', async () => {
    ns.clearCache();
    const result = await ns.deduplicatedFetch('swr-cold', () => Promise.resolve('cold-result'));
    assert.equal(result, 'cold-result');
  });
});

describe('Notion simplify()', () => {
  let simplify;

  it('loads simplify function', () => {
    simplify = require('../server/services/notion').simplify;
    assert.equal(typeof simplify, 'function');
  });

  it('extracts title property', () => {
    const result = simplify({
      Name: { type: 'title', title: [{ plain_text: 'Test Page' }] },
    });
    assert.equal(result.Name, 'Test Page');
  });

  it('extracts select property', () => {
    const result = simplify({
      Status: { type: 'select', select: { name: 'Active' } },
    });
    assert.equal(result.Status, 'Active');
  });

  it('extracts rich_text property', () => {
    const result = simplify({
      Notes: { type: 'rich_text', rich_text: [{ plain_text: 'Hello world' }] },
    });
    assert.equal(result.Notes, 'Hello world');
  });

  it('extracts number property', () => {
    const result = simplify({
      Score: { type: 'number', number: 42 },
    });
    assert.equal(result.Score, 42);
  });

  it('extracts checkbox property', () => {
    const result = simplify({
      Done: { type: 'checkbox', checkbox: true },
    });
    assert.equal(result.Done, true);
  });

  it('extracts date as {start, end} object', () => {
    const result = simplify({
      'Due Date': { type: 'date', date: { start: '2026-03-04', end: '2026-03-10' } },
    });
    assert.deepEqual(result['Due Date'], { start: '2026-03-04', end: '2026-03-10' });
  });

  it('returns null for empty date', () => {
    const result = simplify({
      'Due Date': { type: 'date', date: null },
    });
    assert.equal(result['Due Date'], null);
  });

  it('extracts URL property', () => {
    const result = simplify({
      Website: { type: 'url', url: 'https://example.com' },
    });
    assert.equal(result.Website, 'https://example.com');
  });

  it('extracts relation as array of IDs', () => {
    const result = simplify({
      Projects: { type: 'relation', relation: [{ id: 'abc123' }, { id: 'def456' }] },
    });
    assert.deepEqual(result.Projects, ['abc123', 'def456']);
  });

  it('extracts multi_select as array of names', () => {
    const result = simplify({
      Tags: { type: 'multi_select', multi_select: [{ name: 'A' }, { name: 'B' }] },
    });
    assert.deepEqual(result.Tags, ['A', 'B']);
  });

  it('handles empty properties object', () => {
    const result = simplify({});
    assert.deepEqual(result, {});
  });
});
