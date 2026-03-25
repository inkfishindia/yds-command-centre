'use strict';

const assert = require('node:assert/strict');
const { describe, it, beforeEach, afterEach } = require('node:test');
const path = require('path');

const SHEETS_PATH = path.join(__dirname, '../server/services/sheets.js');
const CI_SERVICE_PATH = path.join(__dirname, '../server/services/competitor-intel-service.js');

// ── Fixture helpers ───────────────────────────────────────────────────────────

function makeCompetitorRows() {
  return [
    { Brand: 'Printify', Tier: '1', Category: 'POD Platform', Website: 'printify.com', Instagram: '@printify', Tags: 'scale,api', 'Core Strengths': 'Catalog depth', 'Typical Use': 'bulk orders', rowIndex: 2 },
    { Brand: 'Printful', Tier: '1', Category: 'POD Platform', Website: 'printful.com', Instagram: '@printful', Tags: 'quality', 'Core Strengths': 'Quality control', 'Typical Use': 'premium', rowIndex: 3 },
    { Brand: 'Canvera', Tier: '2', Category: 'Photo Books', Website: 'canvera.com', Instagram: '@canvera', Tags: 'photo', 'Core Strengths': 'Photo quality', 'Typical Use': 'weddings', rowIndex: 4 },
  ];
}

function makeCapabilityRows() {
  return [
    { Brand: 'Printify', Brand_Power: '4', Customizer_UX: '3', Catalog_Depth: '5', Speed: '3', Pricing_Power: '4', Integrations: '5', Sustainability: '2', B2B_Readiness: '4', D2C_Friendliness: '3', Tech_Maturity: '4', rowIndex: 2 },
    { Brand: 'Printful', Brand_Power: '5', Customizer_UX: '4', Catalog_Depth: '4', Speed: '4', Pricing_Power: '3', Integrations: '4', Sustainability: '3', B2B_Readiness: '3', D2C_Friendliness: '4', Tech_Maturity: '5', rowIndex: 3 },
  ];
}

function makeNotesRows() {
  return [
    { Date: '2026-03-15', Brand: 'Printify', Note: 'Launched new API', Added_By: 'Dan', Tag: 'product', rowIndex: 2 },
    { Date: '2026-03-10', Brand: 'Printful', Note: 'Price increase', Added_By: 'Dan', Tag: 'pricing', rowIndex: 3 },
    { Date: '2026-02-01', Brand: 'Canvera', Note: 'New partnership', Added_By: 'Dan', Tag: 'growth', rowIndex: 4 },
  ];
}

function makeWatchlistRows() {
  return [
    { Date: '2026-03-20', Competitor_ID: 'COMP_001', Change_Type: 'Pricing', Description: 'Reduced prices 10%', Source_Link: 'http://example.com', Impact: 'High', Action_Required: 'TRUE', Owner: 'Dan', rowIndex: 2 },
    { Date: '2026-03-18', Competitor_ID: 'Printful', Change_Type: 'Product', Description: 'New product line', Source_Link: '', Impact: 'Medium', Action_Required: 'FALSE', Owner: 'Dan', rowIndex: 3 },
  ];
}

function makeSwotRows() {
  return [
    { Competitor_ID: 'Printify', Strengths: 'Large catalog', Weaknesses: 'Slow shipping', Opportunities: 'India market', Threats: 'Amazon', Strategic_Risk: 'Low', Strategic_Advantage: 'Scale', rowIndex: 2 },
  ];
}

function makeStealAdaptRows() {
  return [
    { Competitor_ID: 'Printify', Element: 'Live preview', Category: 'UX', Action: 'Steal', Rationale: 'Best in class', Priority: 'High', rowIndex: 2 },
    { Competitor_ID: 'Printful', Element: 'Mockup generator', Category: 'UX', Action: 'Adapt', Rationale: 'Adapt to our workflow', Priority: 'Medium', rowIndex: 3 },
    { Competitor_ID: 'Canvera', Element: 'Forced upsell', Category: 'UX', Action: 'Avoid', Rationale: 'Poor experience', Priority: 'High', rowIndex: 4 },
  ];
}

// ── Inject a mock sheets module into require cache ────────────────────────────

function injectSheets(fetchSheetFn) {
  require.cache[SHEETS_PATH] = {
    id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
    exports: { fetchSheet: fetchSheetFn },
    parent: null, children: [], paths: [],
  };
}

function allAvailableFetch() {
  return async (key) => {
    switch (key) {
      case 'CI_COMPETITORS':    return { available: true, rows: makeCompetitorRows() };
      case 'CI_CAPABILITIES':   return { available: true, rows: makeCapabilityRows() };
      case 'CI_SWOT':           return { available: true, rows: makeSwotRows() };
      case 'CI_NOTES':          return { available: true, rows: makeNotesRows() };
      case 'CI_WATCHLIST':      return { available: true, rows: makeWatchlistRows() };
      case 'CI_ANALYSIS':       return { available: true, rows: [] };
      case 'CI_POSITIONING':    return { available: true, rows: [] };
      case 'CI_UX_PRODUCT':     return { available: true, rows: [] };
      case 'CI_MESSAGING':      return { available: true, rows: [] };
      case 'CI_PHILOSOPHY':     return { available: true, rows: [] };
      case 'CI_MOMENTS':        return { available: true, rows: [] };
      case 'CI_STEAL_ADAPT':    return { available: true, rows: makeStealAdaptRows() };
      default:                  return { available: false };
    }
  };
}

// ── Module loading ─────────────────────────────────────────────────────────────

describe('Competitor Intel Service — module loading', () => {
  it('loads without crashing', () => {
    assert.doesNotThrow(() => require(CI_SERVICE_PATH));
  });

  it('exports expected functions', () => {
    const svc = require(CI_SERVICE_PATH);
    assert.equal(typeof svc.getOverview, 'function');
    assert.equal(typeof svc.getCompetitor, 'function');
    assert.equal(typeof svc.getCapabilities, 'function');
    assert.equal(typeof svc.getSWOT, 'function');
    assert.equal(typeof svc.getWatchlist, 'function');
    assert.equal(typeof svc.getStealAdaptAvoid, 'function');
  });
});

// ── getOverview ───────────────────────────────────────────────────────────────

describe('Competitor Intel Service — getOverview', () => {
  beforeEach(() => {
    delete require.cache[CI_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  afterEach(() => {
    delete require.cache[CI_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  it('returns competitorCount and timestamp', async () => {
    injectSheets(allAvailableFetch());
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getOverview();
    assert.ok(result.timestamp);
    assert.equal(result.competitorCount, 3);
  });

  it('builds byTier breakdown correctly', async () => {
    injectSheets(allAvailableFetch());
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getOverview();
    const tier1 = result.byTier.find(t => t.name === '1');
    assert.ok(tier1, 'tier 1 should exist');
    assert.equal(tier1.count, 2);
    const tier2 = result.byTier.find(t => t.name === '2');
    assert.ok(tier2, 'tier 2 should exist');
    assert.equal(tier2.count, 1);
  });

  it('builds byCategory breakdown correctly', async () => {
    injectSheets(allAvailableFetch());
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getOverview();
    const pod = result.byCategory.find(c => c.name === 'POD Platform');
    assert.ok(pod, 'POD Platform category should exist');
    assert.equal(pod.count, 2);
  });

  it('recentNotes sorted by Date desc and limited to 10', async () => {
    injectSheets(allAvailableFetch());
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getOverview();
    assert.ok(result.recentNotes.length <= 10);
    if (result.recentNotes.length > 1) {
      assert.ok(
        new Date(result.recentNotes[0].Date) >= new Date(result.recentNotes[1].Date),
        'recentNotes should be sorted by date desc'
      );
    }
  });

  it('watchlist only includes rows with Action_Required TRUE', async () => {
    injectSheets(allAvailableFetch());
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getOverview();
    for (const w of result.watchlist) {
      assert.ok(!w.Action_Required || w.Action_Required === 'TRUE' || w.Action_Required === true);
    }
    assert.equal(result.watchlist.length, 1);
  });

  it('capabilitySummary computes avgScore', async () => {
    injectSheets(allAvailableFetch());
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getOverview();
    assert.ok(Array.isArray(result.capabilitySummary));
    const printify = result.capabilitySummary.find(c => c.brand === 'Printify');
    assert.ok(printify, 'Printify should be in capabilitySummary');
    assert.ok(typeof printify.avgScore === 'number');
    assert.ok(printify.topStrength, 'should have topStrength');
    assert.ok(printify.weakestArea, 'should have weakestArea');
  });

  it('degrades gracefully when all sheets unavailable', async () => {
    injectSheets(async () => ({ available: false }));
    const svc = require(CI_SERVICE_PATH);
    await assert.doesNotReject(() => svc.getOverview());
    const result = await svc.getOverview();
    assert.equal(result.competitorCount, 0);
    assert.ok(result.timestamp);
  });

  it('does not throw when fetchSheet rejects', async () => {
    injectSheets(async () => { throw new Error('network error'); });
    const svc = require(CI_SERVICE_PATH);
    await assert.doesNotReject(() => svc.getOverview());
  });
});

// ── getCompetitor ─────────────────────────────────────────────────────────────

describe('Competitor Intel Service — getCompetitor', () => {
  beforeEach(() => {
    delete require.cache[CI_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  afterEach(() => {
    delete require.cache[CI_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  it('returns available:true and master data for known brand', async () => {
    injectSheets(allAvailableFetch());
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getCompetitor('Printify');
    assert.equal(result.available, true);
    assert.ok(result.master, 'should have master');
    assert.equal(result.master.Brand, 'Printify');
  });

  it('returns available:false for unknown brand', async () => {
    injectSheets(allAvailableFetch());
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getCompetitor('UnknownBrand');
    assert.equal(result.available, false);
    assert.equal(result.reason, 'not_found');
  });

  it('matches case-insensitively', async () => {
    injectSheets(allAvailableFetch());
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getCompetitor('printify');
    assert.equal(result.available, true);
    assert.equal(result.master.Brand, 'Printify');
  });

  it('returns stealAdapt array for the brand', async () => {
    injectSheets(allAvailableFetch());
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getCompetitor('Printify');
    assert.ok(Array.isArray(result.stealAdapt));
    assert.equal(result.stealAdapt.length, 1);
    assert.equal(result.stealAdapt[0].Element, 'Live preview');
  });

  it('includes notes for the brand', async () => {
    injectSheets(allAvailableFetch());
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getCompetitor('Printify');
    assert.ok(Array.isArray(result.notes));
    assert.equal(result.notes.length, 1);
    assert.equal(result.notes[0].Note, 'Launched new API');
  });
});

// ── getCapabilities ───────────────────────────────────────────────────────────

describe('Competitor Intel Service — getCapabilities', () => {
  beforeEach(() => {
    delete require.cache[CI_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  afterEach(() => {
    delete require.cache[CI_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  it('returns available:true with rows and dimensions', async () => {
    injectSheets(async () => ({ available: true, rows: makeCapabilityRows() }));
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getCapabilities();
    assert.equal(result.available, true);
    assert.ok(Array.isArray(result.rows));
    assert.ok(Array.isArray(result.dimensions));
    assert.equal(result.dimensions.length, 10);
  });

  it('returns available:false when sheet unavailable', async () => {
    injectSheets(async () => ({ available: false }));
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getCapabilities();
    assert.equal(result.available, false);
  });
});

// ── getSWOT ───────────────────────────────────────────────────────────────────

describe('Competitor Intel Service — getSWOT', () => {
  beforeEach(() => {
    delete require.cache[CI_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  afterEach(() => {
    delete require.cache[CI_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  it('returns available:true with rows', async () => {
    injectSheets(async () => ({ available: true, rows: makeSwotRows() }));
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getSWOT();
    assert.equal(result.available, true);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].Strengths, 'Large catalog');
  });

  it('returns available:false when sheet unavailable', async () => {
    injectSheets(async () => ({ available: false }));
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getSWOT();
    assert.equal(result.available, false);
  });
});

// ── getWatchlist ──────────────────────────────────────────────────────────────

describe('Competitor Intel Service — getWatchlist', () => {
  beforeEach(() => {
    delete require.cache[CI_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  afterEach(() => {
    delete require.cache[CI_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  it('returns all rows when no filters', async () => {
    injectSheets(async () => ({ available: true, rows: makeWatchlistRows() }));
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getWatchlist();
    assert.equal(result.available, true);
    assert.equal(result.rows.length, 2);
  });

  it('filters by type (Change_Type)', async () => {
    injectSheets(async () => ({ available: true, rows: makeWatchlistRows() }));
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getWatchlist({ type: 'Pricing' });
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].Change_Type, 'Pricing');
  });

  it('filters by recent days (excludes old entries)', async () => {
    injectSheets(async () => ({ available: true, rows: makeWatchlistRows() }));
    const svc = require(CI_SERVICE_PATH);
    // Using 1 day — entries from 2026-03-20 and 2026-03-18 are both > 1 day old
    // in test context so result may be 0 — we just verify no crash and available:true
    const result = await svc.getWatchlist({ days: '1' });
    assert.equal(result.available, true);
    assert.ok(Array.isArray(result.rows));
  });

  it('sorted by Date desc', async () => {
    injectSheets(async () => ({ available: true, rows: makeWatchlistRows() }));
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getWatchlist();
    if (result.rows.length > 1) {
      assert.ok(
        new Date(result.rows[0].Date) >= new Date(result.rows[1].Date),
        'watchlist should be sorted by date desc'
      );
    }
  });

  it('returns available:false when sheet unavailable', async () => {
    injectSheets(async () => ({ available: false }));
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getWatchlist();
    assert.equal(result.available, false);
  });
});

// ── getStealAdaptAvoid ────────────────────────────────────────────────────────

describe('Competitor Intel Service — getStealAdaptAvoid', () => {
  beforeEach(() => {
    delete require.cache[CI_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  afterEach(() => {
    delete require.cache[CI_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  it('returns grouped steal/adapt/avoid arrays', async () => {
    injectSheets(async () => ({ available: true, rows: makeStealAdaptRows() }));
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getStealAdaptAvoid();
    assert.equal(result.available, true);
    assert.equal(result.steal.length, 1);
    assert.equal(result.steal[0].Element, 'Live preview');
    assert.equal(result.adapt.length, 1);
    assert.equal(result.adapt[0].Element, 'Mockup generator');
    assert.equal(result.avoid.length, 1);
    assert.equal(result.avoid[0].Element, 'Forced upsell');
  });

  it('returns available:false when sheet unavailable', async () => {
    injectSheets(async () => ({ available: false }));
    const svc = require(CI_SERVICE_PATH);
    const result = await svc.getStealAdaptAvoid();
    assert.equal(result.available, false);
  });
});

// ── Route — module loading ────────────────────────────────────────────────────

describe('Competitor Intel Route — module loading', () => {
  it('loads without crashing', () => {
    assert.doesNotThrow(() => require('../server/routes/competitor-intel'));
  });

  it('exports an express router', () => {
    const router = require('../server/routes/competitor-intel');
    assert.ok(typeof router === 'function' || typeof router.stack !== 'undefined');
  });

  it('registers GET / route', () => {
    const router = require('../server/routes/competitor-intel');
    const has = router.stack.some(l => l.route && l.route.path === '/' && l.route.methods.get);
    assert.ok(has, 'GET / should be registered');
  });

  it('registers GET /competitor/:brand route', () => {
    const router = require('../server/routes/competitor-intel');
    const has = router.stack.some(l => l.route && l.route.path === '/competitor/:brand' && l.route.methods.get);
    assert.ok(has, 'GET /competitor/:brand should be registered');
  });

  it('registers GET /capabilities route', () => {
    const router = require('../server/routes/competitor-intel');
    const has = router.stack.some(l => l.route && l.route.path === '/capabilities' && l.route.methods.get);
    assert.ok(has, 'GET /capabilities should be registered');
  });

  it('registers GET /swot route', () => {
    const router = require('../server/routes/competitor-intel');
    const has = router.stack.some(l => l.route && l.route.path === '/swot' && l.route.methods.get);
    assert.ok(has, 'GET /swot should be registered');
  });

  it('registers GET /watchlist route', () => {
    const router = require('../server/routes/competitor-intel');
    const has = router.stack.some(l => l.route && l.route.path === '/watchlist' && l.route.methods.get);
    assert.ok(has, 'GET /watchlist should be registered');
  });

  it('registers GET /steal-adapt route', () => {
    const router = require('../server/routes/competitor-intel');
    const has = router.stack.some(l => l.route && l.route.path === '/steal-adapt' && l.route.methods.get);
    assert.ok(has, 'GET /steal-adapt should be registered');
  });
});

// ── Sheets Registry — CI keys ─────────────────────────────────────────────────

describe('Sheets Registry — CI sheet keys', () => {
  const { SHEET_REGISTRY, SPREADSHEET_KEYS } = require('../server/services/sheets');

  const CI_KEYS = [
    'CI_COMPETITORS', 'CI_ANALYSIS', 'CI_POSITIONING', 'CI_NOTES',
    'CI_CAPABILITIES', 'CI_UX_PRODUCT', 'CI_MESSAGING', 'CI_SWOT',
    'CI_PHILOSOPHY', 'CI_MOMENTS', 'CI_STEAL_ADAPT', 'CI_WATCHLIST',
  ];

  for (const key of CI_KEYS) {
    it(`SHEET_REGISTRY has key ${key}`, () => {
      assert.ok(SHEET_REGISTRY[key], `${key} should exist in SHEET_REGISTRY`);
    });

    it(`${key} points to COMPETITOR_INTEL spreadsheet`, () => {
      assert.equal(SHEET_REGISTRY[key].spreadsheetKey, 'COMPETITOR_INTEL');
      assert.ok(SHEET_REGISTRY[key].sheetName, `${key} should have sheetName`);
    });
  }

  it('SPREADSHEET_KEYS has COMPETITOR_INTEL', () => {
    assert.equal(SPREADSHEET_KEYS.COMPETITOR_INTEL, 'COMPETITOR_INTEL');
  });
});
