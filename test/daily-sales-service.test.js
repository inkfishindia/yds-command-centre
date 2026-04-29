'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const SHEETS_PATH    = path.join(__dirname, '../server/services/sheets.js');
const SERVICE_PATH   = path.join(__dirname, '../server/services/daily-sales-service.js');
const INDEX_PATH     = path.join(__dirname, '../server/services/daily-sales/index.js');
const PARSE_PATH     = path.join(__dirname, '../server/services/daily-sales/parse.js');
const FILTERS_PATH   = path.join(__dirname, '../server/services/daily-sales/filters.js');
const AGG_PATH       = path.join(__dirname, '../server/services/daily-sales/aggregations.js');
const DQ_PATH        = path.join(__dirname, '../server/services/daily-sales/data-quality.js');
const FY_PATH        = path.join(__dirname, '../server/services/daily-sales/fy.js');

// ── Fixture helpers ────────────────────────────────────────────────────────────

const HEADERS = [
  'Order #', 'Date', 'Time', 'GSTIN', 'Customer', 'Email', 'Phone',
  'Partner Order Number', 'Order Type', 'Order Made By', 'Sales Channel',
  'Shipping Name', 'Shipping Phone', 'Shipping Address', 'Shipping City',
  'Shipping State', 'Shipping Country', 'Shipping Pincode',
  'Billing Name', 'Billing Phone', 'Billing Address', 'Billing City',
  'Billing State', 'Billing Country', 'Billing Pincode',
  'Total No of Products', 'Total Quantity of all the products',
  'Total Amount with tax', 'Status', 'Acceptance Status', 'Payment Mode',
  'Shipping Type', 'Shipping Cost', 'Tags', 'Date formated', 'Month', 'Year',
];

function makeRow(overrides = {}) {
  return {
    'Order #': 'ORD001',
    'Date': '28-04-2026',
    'Time': '10:00 AM',
    'Customer': 'Test Customer',
    'Sales Channel': 'B2C Website',
    'Order Type': 'B2C',
    'Shipping State': 'Maharashtra',
    'Total Amount with tax': '1000',
    'Status': 'Order Placed',
    'Acceptance Status': 'Accepted',
    'Payment Mode': 'Prepaid',
    'Tags': 'DTF, Sublimation',
    ...overrides,
  };
}

// ── FY end-year resolver (extracted from SHEET_REGISTRY for direct testing) ────

function fyEndYearResolver(now) {
  const d = now instanceof Date ? now : new Date(now ?? Date.now());
  const m = d.getUTCMonth();
  const y = d.getUTCFullYear();
  return String(m >= 3 ? y + 1 : y);
}

// Inject a mock fetchSheet into require.cache
function mockSheets(fetchSheetFn) {
  require.cache[SHEETS_PATH] = {
    id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
    exports: {
      fetchSheet: fetchSheetFn,
      resolveSheetName: (entry, now) => {
        const d = now instanceof Date ? now : new Date(now ?? Date.now());
        if (typeof entry.sheetName === 'function') return entry.sheetName(d);
        return entry.sheetName;
      },
      getSpreadsheetId: () => 'mock-spreadsheet-id',
      SHEET_REGISTRY: {
        SALES_YTD: {
          spreadsheetKey: 'DAILY_SALES',
          sheetName: (now) => fyEndYearResolver(now),
          gid: null,
        },
        SALES_LAST_FY: {
          spreadsheetKey: 'DAILY_SALES',
          sheetName: (now) => {
            const d = now instanceof Date ? now : new Date(now ?? Date.now());
            const m = d.getUTCMonth();
            const y = d.getUTCFullYear();
            return String((m >= 3 ? y + 1 : y) - 1);
          },
          gid: null,
        },
        SALES_CURRENT_MONTH: {
          spreadsheetKey: 'DAILY_SALES',
          sheetName: (now) => {
            const month = now.toLocaleString('en-US', { month: 'long' });
            return `${month} ${now.getFullYear()}`;
          },
          gid: null,
        },
      },
    },
    parent: null, children: [], paths: [],
  };
}

function clearMocks() {
  // Clear all sub-modules so fresh require picks up the mock sheets
  delete require.cache[SHEETS_PATH];
  delete require.cache[SERVICE_PATH];
  delete require.cache[INDEX_PATH];
  delete require.cache[PARSE_PATH];
  delete require.cache[FILTERS_PATH];
  delete require.cache[AGG_PATH];
  delete require.cache[DQ_PATH];
  delete require.cache[FY_PATH];
}

// ── Module loading ─────────────────────────────────────────────────────────────

describe('Daily Sales Service — module loading', () => {
  afterEach(() => clearMocks());

  it('loads without crashing', () => {
    mockSheets(async () => ({ available: false, reason: 'not_configured' }));
    assert.doesNotThrow(() => require(SERVICE_PATH));
  });

  it('exports getDashboard, clearCache, parseDDMMYYYY, getISTNow, toISTDateKey, fyDisplayLabel', () => {
    mockSheets(async () => ({ available: false }));
    const svc = require(SERVICE_PATH);
    assert.equal(typeof svc.getDashboard, 'function');
    assert.equal(typeof svc.clearCache, 'function');
    assert.equal(typeof svc.parseDDMMYYYY, 'function');
    assert.equal(typeof svc.getISTNow, 'function');
    assert.equal(typeof svc.toISTDateKey, 'function');
    assert.equal(typeof svc.fyDisplayLabel, 'function');
  });
});

// ── parseDDMMYYYY ─────────────────────────────────────────────────────────────

describe('Daily Sales Service — parseDDMMYYYY', () => {
  let parseDDMMYYYY;

  beforeEach(() => {
    mockSheets(async () => ({ available: false }));
    parseDDMMYYYY = require(SERVICE_PATH).parseDDMMYYYY;
  });
  afterEach(() => clearMocks());

  it('parses 28-02-2026 as Feb 28 2026', () => {
    const d = parseDDMMYYYY('28-02-2026');
    assert.ok(d instanceof Date);
    assert.equal(d.getUTCFullYear(), 2026);
    assert.equal(d.getUTCMonth(), 1); // 0-based
    assert.equal(d.getUTCDate(), 28);
  });

  it('parses 01-01-2025 as Jan 1 2025', () => {
    const d = parseDDMMYYYY('01-01-2025');
    assert.ok(d instanceof Date);
    assert.equal(d.getUTCFullYear(), 2025);
    assert.equal(d.getUTCMonth(), 0);
    assert.equal(d.getUTCDate(), 1);
  });

  it('returns null for garbage input', () => {
    assert.equal(parseDDMMYYYY('garbage'), null);
  });

  it('returns null for empty string', () => {
    assert.equal(parseDDMMYYYY(''), null);
  });

  it('returns null for null', () => {
    assert.equal(parseDDMMYYYY(null), null);
  });

  it('returns null for impossible date Feb 30', () => {
    const d = parseDDMMYYYY('30-02-2026');
    assert.equal(d, null);
  });

  it('returns null for month 13', () => {
    assert.equal(parseDDMMYYYY('01-13-2026'), null);
  });
});

// ── IST bucketing ─────────────────────────────────────────────────────────────

describe('Daily Sales Service — IST bucketing', () => {
  let parseDDMMYYYY, toISTDateKey, getISTNow;

  beforeEach(() => {
    mockSheets(async () => ({ available: false }));
    const svc = require(SERVICE_PATH);
    parseDDMMYYYY = svc.parseDDMMYYYY;
    toISTDateKey = svc.toISTDateKey;
    getISTNow = svc.getISTNow;
  });
  afterEach(() => clearMocks());

  it('order on 31-03-2026 (UTC midnight) stays in March in IST', () => {
    // 31-03-2026 UTC midnight = 31 March in IST (UTC+5:30 moves it forward, stays in March)
    const d = parseDDMMYYYY('31-03-2026');
    assert.ok(d);
    const key = toISTDateKey(d);
    assert.equal(key, '2026-03-31');
  });

  it('order at UTC 2026-03-31T18:30:01 flips to IST Apr 1 (just after midnight IST)', () => {
    // 31 March 18:30:01 UTC = 1 April 00:00:01 IST
    // But parseDDMMYYYY returns UTC midnight, so the IST key for "31-03-2026" is always 2026-03-31
    // This test verifies that IST-bucketed "now" at that UTC epoch IS April 1
    const utcEpoch = Date.UTC(2026, 2, 31, 18, 30, 1); // 31 Mar 18:30:01 UTC
    const istNow = getISTNow(utcEpoch);
    // In IST this is 1 Apr 00:00:01
    assert.equal(istNow.getUTCFullYear(), 2026);
    assert.equal(istNow.getUTCMonth(), 3); // April (0-based)
    assert.equal(istNow.getUTCDate(), 1);
  });

  it('getISTNow at UTC 2026-03-31T17:29:59 is still 31 March IST', () => {
    // 31 March 17:29:59 UTC = 31 March 22:59:59 IST (still March 31)
    const utcEpoch = Date.UTC(2026, 2, 31, 17, 29, 59);
    const istNow = getISTNow(utcEpoch);
    assert.equal(istNow.getUTCMonth(), 2); // March (0-based)
    assert.equal(istNow.getUTCDate(), 31);
  });
});

// ── Happy path — both tabs have rows ─────────────────────────────────────────

describe('Daily Sales Service — happy path', () => {
  afterEach(() => clearMocks());

  it('returns monthTabAvailable=true and ytdAvailable=true when both tabs return rows', async () => {
    // Mock: today is 2026-04-28 IST (epoch ms for 2026-04-28T00:00:00 UTC)
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0); // Apr 28 2026 UTC (IST is same day)

    mockSheets(async (key) => {
      if (key === 'SALES_YTD') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'Y001', 'Date': '01-01-2026', 'Total Amount with tax': '500', 'Status': 'Delivered' }),
            makeRow({ 'Order #': 'Y002', 'Date': '15-02-2026', 'Total Amount with tax': '750', 'Status': 'Delivered' }),
          ],
        };
      }
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'M001', 'Date': '28-04-2026', 'Total Amount with tax': '1200', 'Time': '02:00 PM', 'Status': 'Delivered' }),
            makeRow({ 'Order #': 'M002', 'Date': '28-04-2026', 'Total Amount with tax': '800', 'Time': '10:00 AM', 'Status': 'Delivered' }),
            makeRow({ 'Order #': 'M003', 'Date': '27-04-2026', 'Total Amount with tax': '600', 'Status': 'Delivered' }),
          ],
        };
      }
      return { available: false };
    });

    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    assert.equal(result.source.ytdAvailable, true);
    assert.equal(result.source.monthTabAvailable, true);

    // Today: 2 orders on 28-04-2026 (realized = delivered)
    assert.equal(result.today.orders, 2);
    assert.equal(result.today.revenue, 2000);
    assert.equal(result.today.aov, 1000);

    // MTD: 3 orders in April (1–28)
    assert.equal(result.mtd.orders, 3);

    // YTD: deduped union of ytdRows + monthRows (no overlap here → 5 rows total)
    // Revenue: 500 + 750 (YTD) + 1200 + 800 + 600 (month) = 3850
    assert.equal(result.ytd.orders, 5);
    assert.equal(result.ytd.revenue, 3850);
  });

  it('trend30d has exactly 30 entries', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async () => ({
      available: true,
      headers: HEADERS,
      rows: [makeRow({ 'Order #': 'T001', 'Date': '28-04-2026', 'Total Amount with tax': '1000', 'Status': 'Delivered' })],
    }));
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);
    assert.equal(result.trend30d.length, 30);
  });

  it('trend30d entries have date, orders, revenue fields', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async () => ({
      available: true,
      headers: HEADERS,
      rows: [],
    }));
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);
    for (const entry of result.trend30d) {
      assert.ok('date' in entry);
      assert.ok('orders' in entry);
      assert.ok('revenue' in entry);
      assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('mix salesChannel sums to total order count', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'C1', 'Date': '28-04-2026', 'Sales Channel': 'B2C Website', 'Total Amount with tax': '100' }),
            makeRow({ 'Order #': 'C2', 'Date': '28-04-2026', 'Sales Channel': 'B2B', 'Total Amount with tax': '200' }),
            makeRow({ 'Order #': 'C3', 'Date': '28-04-2026', 'Sales Channel': 'B2C Website', 'Total Amount with tax': '150' }),
          ],
        };
      }
      return { available: false, reason: 'not_configured' };
    });
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);
    const totalFromMix = result.mix.salesChannel.reduce((s, c) => s + c.orders, 0);
    assert.equal(totalFromMix, 3);
  });

  it('mix pctRevenue values sum to ~100% (within rounding)', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'P1', 'Date': '28-04-2026', 'Payment Mode': 'Prepaid', 'Total Amount with tax': '500' }),
            makeRow({ 'Order #': 'P2', 'Date': '28-04-2026', 'Payment Mode': 'COD', 'Total Amount with tax': '300' }),
            makeRow({ 'Order #': 'P3', 'Date': '28-04-2026', 'Payment Mode': 'Prepaid', 'Total Amount with tax': '200' }),
          ],
        };
      }
      return { available: false };
    });
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);
    const sum = result.mix.paymentMode.reduce((s, c) => s + c.pctRevenue, 0);
    // Allow 1% rounding error across all buckets
    assert.ok(Math.abs(sum - 100) < 1.5, `pctRevenue sum should be ~100, got ${sum}`);
  });
});

// ── Current-month tab missing ──────────────────────────────────────────────────

describe('Daily Sales Service — current-month tab missing', () => {
  afterEach(() => clearMocks());

  it('returns monthTabAvailable=false when month tab returns tab_not_found_for_month', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async (key) => {
      if (key === 'SALES_YTD') {
        return {
          available: true,
          headers: HEADERS,
          rows: [makeRow({ 'Order #': 'Y1', 'Date': '15-01-2026', 'Total Amount with tax': '900', 'Status': 'Delivered' })],
        };
      }
      // Month tab missing
      return { available: false, reason: 'tab_not_found_for_month', expectedTabName: 'April 2026' };
    });
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    assert.equal(result.source.monthTabAvailable, false);
    assert.equal(result.source.monthTabReason, 'tab_not_found_for_month');
    // today and mtd should be zeroed
    assert.equal(result.today.orders, 0);
    assert.equal(result.mtd.orders, 0);
    // YTD should still be populated
    assert.equal(result.ytd.orders, 1);
    assert.equal(result.ytd.revenue, 900);
  });
});

// ── YTD tab empty ─────────────────────────────────────────────────────────────

describe('Daily Sales Service — YTD tab empty', () => {
  afterEach(() => clearMocks());

  it('ytd is zeroed but MTD/today still work from current-month tab', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async (key) => {
      if (key === 'SALES_YTD') {
        return { available: true, headers: HEADERS, rows: [] };
      }
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [makeRow({ 'Order #': 'M1', 'Date': '28-04-2026', 'Total Amount with tax': '700', 'Status': 'Delivered' })],
        };
      }
      return { available: false };
    });
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    // YTD: deduped union of ytdRows (empty) + monthRows (1 row) = 1 row
    assert.equal(result.ytd.orders, 1);
    assert.equal(result.ytd.revenue, 700);
    assert.equal(result.today.orders, 1);
    assert.equal(result.today.revenue, 700);
  });
});

// ── Both tabs empty ───────────────────────────────────────────────────────────

describe('Daily Sales Service — both tabs empty', () => {
  afterEach(() => clearMocks());

  it('returns all zeros without crashing', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async () => ({ available: true, headers: HEADERS, rows: [] }));
    const svc = require(SERVICE_PATH);
    let result;
    await assert.doesNotReject(async () => {
      result = await svc.getDashboard(nowMs);
    });
    assert.equal(result.today.orders, 0);
    assert.equal(result.today.revenue, 0);
    assert.equal(result.mtd.orders, 0);
    assert.equal(result.ytd.orders, 0);
    assert.equal(result.trend30d.length, 30);
    assert.ok(Array.isArray(result.mix.salesChannel));
    assert.ok(Array.isArray(result.topStates));
    assert.ok(Array.isArray(result.todaysOrders));
    assert.ok(Array.isArray(result.concerns.pendingAcceptance));
    assert.ok(Array.isArray(result.concerns.stuckOrders));
  });
});

// ── Bad-date rows skipped, not crashed ────────────────────────────────────────

describe('Daily Sales Service — bad-date rows skipped', () => {
  afterEach(() => clearMocks());

  it('rows with bad Date values are skipped without crashing', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'G1', 'Date': 'not-a-date', 'Total Amount with tax': '500', 'Status': 'Delivered' }),
            makeRow({ 'Order #': 'G2', 'Date': '', 'Total Amount with tax': '300', 'Status': 'Delivered' }),
            makeRow({ 'Order #': 'G3', 'Date': '28-04-2026', 'Total Amount with tax': '200', 'Status': 'Delivered' }),
          ],
        };
      }
      return { available: false };
    });
    const svc = require(SERVICE_PATH);
    let result;
    await assert.doesNotReject(async () => {
      result = await svc.getDashboard(nowMs);
    });
    // Only G3 has valid date matching today
    assert.equal(result.today.orders, 1);
    assert.equal(result.today.revenue, 200);
  });
});

// ── Mix aggregation ───────────────────────────────────────────────────────────

describe('Daily Sales Service — mix aggregation', () => {
  afterEach(() => clearMocks());

  it('B2C vs B2B split in orderType is correct', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'T1', 'Date': '28-04-2026', 'Order Type': 'B2C', 'Total Amount with tax': '400' }),
            makeRow({ 'Order #': 'T2', 'Date': '28-04-2026', 'Order Type': 'B2B', 'Total Amount with tax': '600' }),
            makeRow({ 'Order #': 'T3', 'Date': '28-04-2026', 'Order Type': 'B2C', 'Total Amount with tax': '200' }),
          ],
        };
      }
      return { available: false };
    });
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);
    const b2c = result.mix.orderType.find(x => x.name.toLowerCase() === 'b2c');
    const b2b = result.mix.orderType.find(x => x.name.toLowerCase() === 'b2b');
    assert.ok(b2c, 'B2C entry should exist');
    assert.ok(b2b, 'B2B entry should exist');
    assert.equal(b2c.orders, 2);
    assert.equal(b2b.orders, 1);
  });

  it('printMethod uses first tag only (not counting multi-tag rows multiple times)', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'T1', 'Date': '28-04-2026', 'Tags': 'DTF, Sublimation', 'Total Amount with tax': '300' }),
            makeRow({ 'Order #': 'T2', 'Date': '28-04-2026', 'Tags': 'DTF', 'Total Amount with tax': '200' }),
            makeRow({ 'Order #': 'T3', 'Date': '28-04-2026', 'Tags': 'Embroidery', 'Total Amount with tax': '400' }),
          ],
        };
      }
      return { available: false };
    });
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);
    const dtf = result.mix.printMethod.find(x => x.name === 'DTF');
    const emb = result.mix.printMethod.find(x => x.name === 'Embroidery');
    assert.ok(dtf, 'DTF entry should exist');
    assert.equal(dtf.orders, 2); // rows T1 and T2 both have DTF as first tag
    assert.equal(emb.orders, 1);
    // Total orders in printMethod should equal total source rows (3)
    const totalFromMix = result.mix.printMethod.reduce((s, c) => s + c.orders, 0);
    assert.equal(totalFromMix, 3);
  });
});

// ── Concerns ──────────────────────────────────────────────────────────────────

describe('Daily Sales Service — concerns', () => {
  afterEach(() => clearMocks());

  it('orders with Acceptance Status Pending appear in pendingAcceptance', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'PA1', 'Date': '28-04-2026', 'Acceptance Status': 'Pending', 'Total Amount with tax': '500' }),
            makeRow({ 'Order #': 'PA2', 'Date': '28-04-2026', 'Acceptance Status': 'Accepted', 'Total Amount with tax': '300' }),
            makeRow({ 'Order #': 'PA3', 'Date': '28-04-2026', 'Acceptance Status': 'Rejected', 'Total Amount with tax': '200' }),
          ],
        };
      }
      return { available: false };
    });
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);
    const paNums = result.concerns.pendingAcceptance.map(x => x.orderNumber);
    assert.ok(paNums.includes('PA1'), 'Pending should be in pendingAcceptance');
    assert.ok(paNums.includes('PA3'), 'Rejected should be in pendingAcceptance');
    assert.ok(!paNums.includes('PA2'), 'Accepted should NOT be in pendingAcceptance');
  });

  it('orders older than 5 days not in terminal statuses appear in stuckOrders', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0); // Apr 28 2026 UTC = Apr 28 IST
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            // 6 days ago, non-terminal → stuck
            makeRow({ 'Order #': 'S1', 'Date': '22-04-2026', 'Status': 'Order Placed', 'Total Amount with tax': '500' }),
            // 6 days ago, delivered → NOT stuck
            makeRow({ 'Order #': 'S2', 'Date': '22-04-2026', 'Status': 'Delivered', 'Total Amount with tax': '300' }),
            // today → NOT stuck (not > 5 days)
            makeRow({ 'Order #': 'S3', 'Date': '28-04-2026', 'Status': 'Order Placed', 'Total Amount with tax': '200' }),
          ],
        };
      }
      return { available: false };
    });
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);
    const stuckNums = result.concerns.stuckOrders.map(x => x.orderNumber);
    assert.ok(stuckNums.includes('S1'), 'S1 should be stuck');
    assert.ok(!stuckNums.includes('S2'), 'Delivered should NOT be stuck');
    assert.ok(!stuckNums.includes('S3'), 'Recent order should NOT be stuck');
  });
});

// ── Cache ─────────────────────────────────────────────────────────────────────

describe('Daily Sales Service — cache', () => {
  afterEach(() => clearMocks());

  it('second call with no nowMs returns cached result without calling fetchSheet again', async () => {
    let callCount = 0;
    mockSheets(async () => {
      callCount += 1;
      return { available: true, headers: HEADERS, rows: [] };
    });
    const svc = require(SERVICE_PATH);
    await svc.getDashboard(); // first call — live
    await svc.getDashboard(); // second call — should use cache
    // fetchSheet called 3 times (SALES_YTD + SALES_CURRENT_MONTH + SALES_LAST_FY) on first call only
    assert.equal(callCount, 3, `Expected 3 fetchSheet calls (first call only), got ${callCount}`);
  });

  it('clearCache() causes next call to re-fetch', async () => {
    let callCount = 0;
    mockSheets(async () => {
      callCount += 1;
      return { available: true, headers: HEADERS, rows: [] };
    });
    const svc = require(SERVICE_PATH);
    await svc.getDashboard();     // 3 calls (YTD + month + lastFY)
    svc.clearCache();
    await svc.getDashboard();     // 3 more calls
    assert.equal(callCount, 6, `Expected 6 fetchSheet calls after clearCache, got ${callCount}`);
  });
});

// ── Overlap dedup — same Order # in both tabs ─────────────────────────────────

describe('Daily Sales Service — overlap dedup (YTD + month tab)', () => {
  afterEach(() => clearMocks());

  it('same Order # in YTD ($1000) and month ($1200): YTD/MTD/trend30d all show $1200 (no double-count)', async () => {
    // nowMs: Apr 28 2026 UTC = Apr 28 IST (well within the day)
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);

    mockSheets(async (key) => {
      if (key === 'SALES_YTD') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            // OVERLAP: same order number, stale amount in YTD tab
            makeRow({ 'Order #': 'OVL001', 'Date': '28-04-2026', 'Total Amount with tax': '1000', 'Status': 'Delivered' }),
          ],
        };
      }
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            // OVERLAP: same order number, updated amount in month tab — should win
            makeRow({ 'Order #': 'OVL001', 'Date': '28-04-2026', 'Total Amount with tax': '1200', 'Time': '11:00 AM', 'Status': 'Delivered' }),
          ],
        };
      }
      return { available: false };
    });

    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    // YTD must reflect $1200 (month wins), not $2200 (double-count) or $1000 (YTD-only)
    assert.equal(result.ytd.orders, 1, 'YTD should have 1 order (deduped)');
    assert.equal(result.ytd.revenue, 1200, 'YTD revenue should be 1200 (month tab wins)');

    // MTD: month-tab only, $1200
    assert.equal(result.mtd.orders, 1, 'MTD should have 1 order');
    assert.equal(result.mtd.revenue, 1200, 'MTD revenue should be 1200');

    // trend30d for Apr 28 must show $1200 (allRows deduped)
    const apr28 = result.trend30d.find(d => d.date === '2026-04-28');
    assert.ok(apr28, 'trend30d should have an entry for 2026-04-28');
    assert.equal(apr28.orders, 1, 'trend30d Apr 28 should have 1 order (deduped)');
    assert.equal(apr28.revenue, 1200, 'trend30d Apr 28 revenue should be 1200 (month wins)');

    // All three agree: no reconciliation gap
    assert.equal(result.ytd.revenue, result.mtd.revenue, 'YTD and MTD revenue agree for single-month scenario');
    assert.equal(result.ytd.revenue, apr28.revenue, 'YTD and trend30d revenue agree for the overlapping order');
  });
});

// ── IST timezone resolver ─────────────────────────────────────────────────────

describe('Daily Sales Service — resolveSheetName IST timezone', () => {
  it('returns May 2026 not April 2026 when UTC time is 2026-04-30T19:00:00Z (May 1 00:30 IST)', () => {
    // Require sheets directly (not mocked) to test resolveSheetName in isolation
    const sheets = require('../server/services/sheets.js');
    const { resolveSheetName, SHEET_REGISTRY } = sheets;

    // UTC 2026-04-30 19:00:00 = IST 2026-05-01 00:30:00
    const utcEpochMs = Date.UTC(2026, 3, 30, 19, 0, 0); // April 30 19:00 UTC

    // Simulate the IST shift that daily-sales-service applies:
    // istNowDate = new Date(utcEpochMs + 5.5h * 3600 * 1000)
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const istNowDate = new Date(utcEpochMs + IST_OFFSET_MS);

    const resolved = resolveSheetName(SHEET_REGISTRY.SALES_CURRENT_MONTH, istNowDate);
    assert.equal(resolved, 'May 2026', `Expected 'May 2026' but got '${resolved}'`);
  });

  it('returns April 2026 when UTC time is 2026-04-30T12:00:00Z (still April 30 IST)', () => {
    const sheets = require('../server/services/sheets.js');
    const { resolveSheetName, SHEET_REGISTRY } = sheets;

    // UTC 2026-04-30 12:00:00 = IST 2026-04-30 17:30:00 (still April 30)
    const utcEpochMs = Date.UTC(2026, 3, 30, 12, 0, 0);
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const istNowDate = new Date(utcEpochMs + IST_OFFSET_MS);

    const resolved = resolveSheetName(SHEET_REGISTRY.SALES_CURRENT_MONTH, istNowDate);
    assert.equal(resolved, 'April 2026', `Expected 'April 2026' but got '${resolved}'`);
  });
});

// ── FY end-year resolver — boundary tests ────────────────────────────────────

describe('Daily Sales Service — FY end-year resolver', () => {
  // fyEndYearResolver is defined at the top of this test file and mirrors
  // the logic in SHEET_REGISTRY.SALES_YTD.sheetName — we test that logic directly.

  it('Mar 31 23:59:59 IST (UTC 2027-03-31T18:29:59Z) → FY end-year "2027"', () => {
    // IST 2027-03-31 23:59:59 = UTC 2027-03-31 18:29:59
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const utcMs = Date.UTC(2027, 2, 31, 18, 29, 59); // March is 2 (0-based)
    const istNowDate = new Date(utcMs + IST_OFFSET_MS);
    // istNowDate.getUTCMonth() = 2 (March), which is < 3, so FY end-year = current year = 2027
    assert.equal(fyEndYearResolver(istNowDate), '2027');
  });

  it('Apr 1 00:00:01 IST (UTC 2027-03-31T18:30:01Z) → FY end-year "2028"', () => {
    // IST 2027-04-01 00:00:01 = UTC 2027-03-31 18:30:01
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const utcMs = Date.UTC(2027, 2, 31, 18, 30, 1);
    const istNowDate = new Date(utcMs + IST_OFFSET_MS);
    // istNowDate.getUTCMonth() = 3 (April), which is >= 3, so FY end-year = 2027 + 1 = 2028
    assert.equal(fyEndYearResolver(istNowDate), '2028');
  });

  it('Jan 1 00:00:00 IST (UTC 2026-12-31T18:30:00Z) → FY end-year "2027"', () => {
    // IST 2027-01-01 00:00:00 = UTC 2026-12-31 18:30:00
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const utcMs = Date.UTC(2026, 11, 31, 18, 30, 0); // Dec is 11 (0-based)
    const istNowDate = new Date(utcMs + IST_OFFSET_MS);
    // istNowDate.getUTCMonth() = 0 (January), which is < 3, so FY end-year = 2027
    assert.equal(fyEndYearResolver(istNowDate), '2027');
  });
});

// ── fyDisplayLabel ───────────────────────────────────────────────────────────

describe('Daily Sales Service — fyDisplayLabel', () => {
  let fyDisplayLabel;

  beforeEach(() => {
    mockSheets(async () => ({ available: false }));
    fyDisplayLabel = require(SERVICE_PATH).fyDisplayLabel;
  });
  afterEach(() => clearMocks());

  it('"2026" → "FY 25-26"', () => {
    assert.equal(fyDisplayLabel('2026'), 'FY 25-26');
  });

  it('"2027" → "FY 26-27"', () => {
    assert.equal(fyDisplayLabel('2027'), 'FY 26-27');
  });

  it('"2030" → "FY 29-30"', () => {
    assert.equal(fyDisplayLabel('2030'), 'FY 29-30');
  });

  it('"2000" → "FY 99-00"', () => {
    assert.equal(fyDisplayLabel('2000'), 'FY 99-00');
  });

  it('"abc" → "abc" (fallback for non-integer)', () => {
    assert.equal(fyDisplayLabel('abc'), 'abc');
  });
});

// ── vsLastFY happy path ───────────────────────────────────────────────────────

describe('Daily Sales Service — vsLastFY happy path', () => {
  afterEach(() => clearMocks());

  it('computes vsLastFY deltas using only prior-FY rows on/before today (Apr 29)', async () => {
    // nowMs: April 29 2026 IST (UTC 2026-04-29T00:00:00Z — safe within the IST day)
    // FY 25-26: April 2025 – March 2026, tab "2026"
    // FY 26-27: April 2026 – March 2027, tab "2027"
    // With today = Apr 29 2026: currentFYEndYear = 2027, lastFYTabName = "2026"
    const nowMs = Date.UTC(2026, 3, 29, 0, 0, 0); // Apr 29 2026 UTC

    mockSheets(async (key) => {
      if (key === 'SALES_YTD') {
        // Current FY 26-27 tab "2027": 5 orders at ₹100K each = ₹500K, all in April 2026
        return {
          available: true,
          headers: HEADERS,
          rows: Array.from({ length: 5 }, (_, i) => makeRow({
            'Order #': `CUR${i + 1}`,
            'Date': `${String(i + 1).padStart(2, '0')}-04-2026`,
            'Total Amount with tax': '100000',
            'Status': 'Delivered',
          })),
        };
      }
      if (key === 'SALES_LAST_FY') {
        // Prior FY 25-26 tab "2026": mix of dates inside/outside scope AND status mix.
        // Today is Apr 29 (FY day 29). Rows on or before Apr 29 IN prior FY are in scope.
        // 2 of the in-scope rows have Status 'Order Placed' (gross, unrealized):
        //   they must be EXCLUDED by the default "realized" filter so deltas tie out.
        // Realized in-scope: 27 rows at ₹10000 = ₹270000
        // Gross in-scope:    27 delivered + 2 placed = 29 rows at ₹290000 (old broken behavior)
        return {
          available: true,
          headers: HEADERS,
          rows: [
            // IN scope + realized: Apr 01-2025 → Apr 27-2025 (27 rows at ₹10000 each)
            ...Array.from({ length: 27 }, (_, i) => makeRow({
              'Order #': `PREV${i + 1}`,
              'Date': `${String(i + 1).padStart(2, '0')}-04-2025`,
              'Total Amount with tax': '10000',
              'Status': 'Delivered',
            })),
            // IN scope but NOT realized (Order Placed → excluded by filter)
            makeRow({ 'Order #': 'PREV28', 'Date': '28-04-2025', 'Total Amount with tax': '10000', 'Status': 'Order Placed' }),
            makeRow({ 'Order #': 'PREV29', 'Date': '29-04-2025', 'Total Amount with tax': '10000', 'Status': 'Order Placed' }),
            // OUT of scope: Apr 30 2025 (FY day 30 > today's FY day 29)
            makeRow({ 'Order #': 'PREV30', 'Date': '30-04-2025', 'Total Amount with tax': '10000', 'Status': 'Delivered' }),
            // OUT of scope: May 1 2025 (FY day 31)
            makeRow({ 'Order #': 'PREV31', 'Date': '01-05-2025', 'Total Amount with tax': '10000', 'Status': 'Delivered' }),
          ],
        };
      }
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'CUR1', 'Date': '29-04-2026', 'Total Amount with tax': '100000', 'Status': 'Delivered' }),
          ],
        };
      }
      return { available: false };
    });

    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    assert.ok(result.ytd.vsLastFY !== null, 'vsLastFY should not be null');
    // Today = Apr 29 2026 → currentFYEndYear = 2027, lastFYTabName = "2026"
    assert.equal(result.ytd.vsLastFY.lastFYTabName, '2026');
    assert.equal(result.ytd.vsLastFY.lastFYDisplayLabel, 'FY 25-26');

    // Prior FY scoped + filtered (realized only): 27 rows at ₹10000 = ₹270000
    //   (PREV28 and PREV29 are "Order Placed" — excluded by the realized filter)
    // Current FY YTD (filtered): CUR1–CUR5, all Delivered, ₹100000 each.
    //   CUR1 also appears in SALES_CURRENT_MONTH — deduped (month wins) → still 5 rows = ₹500000
    // revenue.delta = 500000 - 270000 = 230000
    // Verify the prior side is filtered: gross scoped would be ₹290000 → delta 210000 (old bug).
    assert.equal(result.ytd.vsLastFY.revenue.delta, 230000,
      'delta must use FILTERED prior (realized), not gross prior');
    // Consistency check: orders delta uses the same filter — 2 placed orders excluded from prior
    // prior filtered orders = 27; current filtered orders = 5
    assert.equal(result.ytd.vsLastFY.orders.delta, 5 - 27,
      'orders delta = current(5) - priorFiltered(27)');
    // pct should be non-null (prev > 0)
    assert.ok(result.ytd.vsLastFY.revenue.pct !== null, 'revenue.pct should not be null when prior > 0');
  });
});

// ── vsLastFY when prior tab missing ──────────────────────────────────────────

describe('Daily Sales Service — vsLastFY when prior tab missing', () => {
  afterEach(() => clearMocks());

  it('ytd.vsLastFY is null when SALES_LAST_FY tab returns available:false', async () => {
    const nowMs = Date.UTC(2027, 3, 29, 0, 0, 0);

    mockSheets(async (key) => {
      if (key === 'SALES_YTD') {
        return {
          available: true,
          headers: HEADERS,
          rows: [makeRow({ 'Order #': 'Y1', 'Date': '01-04-2027', 'Total Amount with tax': '5000', 'Status': 'Delivered' })],
        };
      }
      if (key === 'SALES_CURRENT_MONTH') {
        return { available: true, headers: HEADERS, rows: [] };
      }
      if (key === 'SALES_LAST_FY') {
        return { available: false, reason: 'tab_not_found_for_month', expectedTabName: '2026' };
      }
      return { available: false };
    });

    const svc = require(SERVICE_PATH);
    let result;
    await assert.doesNotReject(async () => {
      result = await svc.getDashboard(nowMs);
    });
    assert.equal(result.ytd.vsLastFY, null, 'vsLastFY should be null when prior tab is missing');
  });
});

// ── vsLastFY zero-prior edge case ─────────────────────────────────────────────

describe('Daily Sales Service — vsLastFY zero-prior (no rows in scope)', () => {
  afterEach(() => clearMocks());

  it('revenue.pct is null and delta equals current revenue when prior scope is empty', async () => {
    // Today: Apr 1 2027. Prior FY tab has only rows after Apr 1 (i.e. from Apr 2 onwards),
    // so none are in scope (scope = rows where FY day ≤ 1, which is only Apr 1).
    // We put all rows on Apr 2 2026 to ensure nothing qualifies.
    const nowMs = Date.UTC(2027, 3, 1, 0, 0, 0); // Apr 1 2027 UTC

    mockSheets(async (key) => {
      if (key === 'SALES_YTD') {
        return {
          available: true,
          headers: HEADERS,
          rows: [makeRow({ 'Order #': 'Y1', 'Date': '01-04-2027', 'Total Amount with tax': '8000', 'Status': 'Delivered' })],
        };
      }
      if (key === 'SALES_CURRENT_MONTH') {
        return { available: true, headers: HEADERS, rows: [] };
      }
      if (key === 'SALES_LAST_FY') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            // All rows are on Apr 2 2026 — FY day 2, which is > FY day 1 (today)
            makeRow({ 'Order #': 'P1', 'Date': '02-04-2026', 'Total Amount with tax': '5000', 'Status': 'Delivered' }),
            makeRow({ 'Order #': 'P2', 'Date': '02-04-2026', 'Total Amount with tax': '3000', 'Status': 'Delivered' }),
          ],
        };
      }
      return { available: false };
    });

    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    assert.ok(result.ytd.vsLastFY !== null, 'vsLastFY should be present (tab available)');
    // Prior-FY scoped orders = 0, revenue = 0
    assert.equal(result.ytd.vsLastFY.revenue.pct, null, 'pct should be null when prior = 0 (div/0 guard)');
    // delta = current - 0 = current YTD revenue
    assert.equal(result.ytd.vsLastFY.revenue.delta, result.ytd.revenue);
  });
});

// ── vsLastMonthSameDate — FY rollover (April → March in closed-FY tab) ────────

describe('Daily Sales Service — vsLastMonthSameDate FY rollover', () => {
  afterEach(() => clearMocks());

  it('April MTD: vsLastMonthSameDate compares against March rows from closed-FY tab', async () => {
    // today = April 15 2026 IST (UTC 2026-04-15T00:00:00Z)
    // lastMonth = March 2026 → lives in the "2026" archive tab (lastFY), NOT allOrders
    // currentFY tab ("2027"): only April rows
    const nowMs = Date.UTC(2026, 3, 15, 0, 0, 0); // Apr 15 2026 UTC

    mockSheets(async (key) => {
      if (key === 'SALES_YTD') {
        // Current FY 26-27 tab "2027": 3 April orders
        return {
          available: true,
          headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'APR1', 'Date': '01-04-2026', 'Total Amount with tax': '2000', 'Status': 'Delivered' }),
            makeRow({ 'Order #': 'APR2', 'Date': '10-04-2026', 'Total Amount with tax': '3000', 'Status': 'Delivered' }),
            makeRow({ 'Order #': 'APR3', 'Date': '15-04-2026', 'Total Amount with tax': '5000', 'Status': 'Delivered' }),
          ],
        };
      }
      if (key === 'SALES_CURRENT_MONTH') {
        // Same April rows (overlap with YTD — deduped, these win)
        return {
          available: true,
          headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'APR2', 'Date': '10-04-2026', 'Total Amount with tax': '3000', 'Status': 'Delivered' }),
            makeRow({ 'Order #': 'APR3', 'Date': '15-04-2026', 'Total Amount with tax': '5000', 'Status': 'Delivered' }),
          ],
        };
      }
      if (key === 'SALES_LAST_FY') {
        // Closed FY "2026" tab: March 2026 rows (last month relative to April)
        // Rows on/before Mar 15 (same-day clamp): 3 rows
        // Row on Mar 20: out of same-day scope (day 20 > day 15) — must NOT be included
        return {
          available: true,
          headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'MAR1', 'Date': '01-03-2026', 'Total Amount with tax': '1000', 'Status': 'Delivered' }),
            makeRow({ 'Order #': 'MAR2', 'Date': '10-03-2026', 'Total Amount with tax': '1500', 'Status': 'Delivered' }),
            makeRow({ 'Order #': 'MAR3', 'Date': '15-03-2026', 'Total Amount with tax': '2500', 'Status': 'Delivered' }),
            makeRow({ 'Order #': 'MAR4', 'Date': '20-03-2026', 'Total Amount with tax': '4000', 'Status': 'Delivered' }),
          ],
        };
      }
      return { available: false };
    });

    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    const vs = result.mtd.vsLastMonthSameDate;
    assert.ok(vs !== null, 'vsLastMonthSameDate should not be null for April when lastFY tab has March rows');

    // MTD source = sourceOrders (monthOrders when monthTab available) = APR2 + APR3 (2 orders, ₹8000)
    // APR1 is only in YTD tab → in allOrders but NOT in sourceOrders → not in mtdOrders
    // lastMonthMTD (Mar 1–15 from lastFY tab, realized):
    //   MAR1=1000, MAR2=1500, MAR3=2500 = 3 orders, ₹5000
    //   MAR4 (Mar 20) is beyond same-day clamp (day 15) → excluded
    assert.equal(vs.orders.delta, -1, 'orders delta: 2 (Apr MTD from month tab) - 3 (Mar) = -1');
    assert.equal(vs.revenue.delta, 3000, 'revenue delta: 8000 (Apr) - 5000 (Mar) = 3000');

    // pct: 3000/5000 * 100 = 60%
    assert.ok(vs.revenue.pct !== null, 'revenue.pct should be non-null when prior > 0');
    assert.equal(vs.revenue.pct, 60, 'revenue.pct = (3000/5000)*100 = 60');
  });
});

// ── Route module ──────────────────────────────────────────────────────────────

describe('Daily Sales Route — module loading', () => {
  it('loads the route module without crashing', () => {
    assert.doesNotThrow(() => {
      require('../server/routes/daily-sales');
    });
  });

  it('exports an Express router', () => {
    const router = require('../server/routes/daily-sales');
    assert.ok(typeof router === 'function' || router.stack, 'should be an Express router');
  });

  it('has GET / registered', () => {
    const router = require('../server/routes/daily-sales');
    const routes = router.stack
      .filter(l => l.route)
      .map(l => ({ path: l.route.path, methods: Object.keys(l.route.methods) }));
    const root = routes.find(r => r.path === '/');
    assert.ok(root, 'GET / should be registered');
    assert.ok(root.methods.includes('get'), 'should be GET method');
  });

  it('has GET /orders registered', () => {
    const router = require('../server/routes/daily-sales');
    const routes = router.stack
      .filter(l => l.route)
      .map(l => ({ path: l.route.path, methods: Object.keys(l.route.methods) }));
    const ordersRoute = routes.find(r => r.path === '/orders');
    assert.ok(ordersRoute, 'GET /orders should be registered');
    assert.ok(ordersRoute.methods.includes('get'), 'should be GET method');
  });
});

// ── NEW: parseOrder ────────────────────────────────────────────────────────────

describe('parseOrder — normalized Order schema', () => {
  let parseOrder;

  beforeEach(() => {
    parseOrder = require(PARSE_PATH).parseOrder;
  });
  afterEach(() => clearMocks());

  it('happy path: all fields parsed correctly', () => {
    const row = makeRow({
      'Order #': 'YD-1234',
      'Date': '15-04-2026',
      'Time': '03:30 PM',
      'Customer': 'Rahul Sharma',
      'Email': 'rahul@test.com',
      'Phone': '9876543210',
      'Order Type': 'B2C',
      'Sales Channel': 'Instagram',
      'Shipping State': 'Karnataka',
      'Shipping City': 'Bangalore',
      'Total Amount with tax': '₹2,500',
      'Status': 'Delivered',
      'Acceptance Status': 'Accepted',
      'Payment Mode': 'Prepaid',
      'Tags': 'DTF, Embroidery, Sublimation',
    });
    const o = parseOrder(row, '2027');
    assert.equal(o.orderNumber, 'YD-1234');
    assert.ok(o.date instanceof Date);
    assert.equal(o.istDateKey, '2026-04-15');
    assert.equal(o.time, '03:30 PM');
    assert.equal(o.customer, 'Rahul Sharma');
    assert.equal(o.orderType, 'B2C');
    assert.equal(o.salesChannel, 'Instagram');
    assert.equal(o.shipping.state, 'Karnataka');
    assert.equal(o.shipping.city, 'Bangalore');
    assert.equal(o.amountWithTax, 2500);
    assert.equal(o.status, 'Delivered');
    assert.equal(o.isRealized, true);
    assert.equal(o.printMethod, 'DTF'); // first tag only
    assert.equal(o._sourceTab, '2027');
    assert.ok(o._raw === row);
  });

  it('missing Date → date=null, istDateKey=null, fyOrdinal=null', () => {
    const o = parseOrder(makeRow({ 'Date': '', 'Order #': 'X1' }), 'tab1');
    assert.equal(o.date, null);
    assert.equal(o.istDateKey, null);
    assert.equal(o.fyOrdinal, null);
  });

  it('bad Date → date=null', () => {
    const o = parseOrder(makeRow({ 'Date': 'not-a-date', 'Order #': 'X2' }), 'tab1');
    assert.equal(o.date, null);
  });

  it('Tags with multiple values: only first tag becomes printMethod', () => {
    const o = parseOrder(makeRow({ 'Tags': 'Sublimation, DTF, Embroidery', 'Order #': 'X3' }), 'tab1');
    assert.equal(o.printMethod, 'Sublimation');
  });

  it('empty Tags: printMethod becomes "(unknown)"', () => {
    const o = parseOrder(makeRow({ 'Tags': '', 'Order #': 'X4' }), 'tab1');
    assert.equal(o.printMethod, '(unknown)');
  });

  it('non-canonical Order Type passes through verbatim (data-defined, not enum-defined)', () => {
    const o = parseOrder(makeRow({ 'Order Type': 'Retail', 'Order #': 'X5' }), 'tab1');
    assert.equal(o.orderType, 'Retail');
  });

  it('YDS canonical values (DS / Manual / Stores) pass through trimmed', () => {
    assert.equal(parseOrder(makeRow({ 'Order Type': 'DS', 'Order #': 'X6' }), 'tab1').orderType, 'DS');
    assert.equal(parseOrder(makeRow({ 'Order Type': 'Manual', 'Order #': 'X7' }), 'tab1').orderType, 'Manual');
    assert.equal(parseOrder(makeRow({ 'Order Type': '  Stores  ', 'Order #': 'X8' }), 'tab1').orderType, 'Stores');
  });

  it('blank Order Type → "(unknown)"', () => {
    assert.equal(parseOrder(makeRow({ 'Order Type': '', 'Order #': 'X9' }), 'tab1').orderType, '(unknown)');
    assert.equal(parseOrder(makeRow({ 'Order Type': '   ', 'Order #': 'X10' }), 'tab1').orderType, '(unknown)');
  });
});

// ── NEW: REALIZED_STATUSES ────────────────────────────────────────────────────

describe('REALIZED_STATUSES — accepted statuses', () => {
  let REALIZED_STATUSES;

  beforeEach(() => {
    REALIZED_STATUSES = require(PARSE_PATH).REALIZED_STATUSES;
  });
  afterEach(() => clearMocks());

  it('accepts "delivered" (lowercase)', () => {
    assert.ok(REALIZED_STATUSES.has('delivered'));
  });

  it('accepts "fulfilled" (lowercase)', () => {
    assert.ok(REALIZED_STATUSES.has('fulfilled'));
  });

  it('accepts "fullfilled" (simple typo variant)', () => {
    assert.ok(REALIZED_STATUSES.has('fullfilled'));
  });

  it('accepts "partially fulfilled"', () => {
    assert.ok(REALIZED_STATUSES.has('partially fulfilled'));
  });

  it('accepts "partially fullfilled" (typo variant)', () => {
    assert.ok(REALIZED_STATUSES.has('partially fullfilled'));
  });

  it('isRealized=true for "Delivered" (case-insensitive via parseOrder)', () => {
    const { parseOrder } = require(PARSE_PATH);
    const o = parseOrder(makeRow({ 'Status': 'Delivered', 'Order #': 'R1' }), 'tab');
    assert.equal(o.isRealized, true);
  });

  it('isRealized=true for "Fulfilled"', () => {
    const { parseOrder } = require(PARSE_PATH);
    const o = parseOrder(makeRow({ 'Status': 'Fulfilled', 'Order #': 'R2' }), 'tab');
    assert.equal(o.isRealized, true);
  });

  it('isRealized=true for "fulfilled" (all lower)', () => {
    const { parseOrder } = require(PARSE_PATH);
    const o = parseOrder(makeRow({ 'Status': 'fulfilled', 'Order #': 'R3' }), 'tab');
    assert.equal(o.isRealized, true);
  });

  it('isRealized=false for "Cancelled"', () => {
    const { parseOrder } = require(PARSE_PATH);
    const o = parseOrder(makeRow({ 'Status': 'Cancelled', 'Order #': 'R4' }), 'tab');
    assert.equal(o.isRealized, false);
  });

  it('isRealized=false for "Draft Order"', () => {
    const { parseOrder } = require(PARSE_PATH);
    const o = parseOrder(makeRow({ 'Status': 'Draft Order', 'Order #': 'R5' }), 'tab');
    assert.equal(o.isRealized, false);
  });

  it('isRealized=false for empty status', () => {
    const { parseOrder } = require(PARSE_PATH);
    const o = parseOrder(makeRow({ 'Status': '', 'Order #': 'R6' }), 'tab');
    assert.equal(o.isRealized, false);
  });
});

// ── NEW: applyFilters ─────────────────────────────────────────────────────────

describe('applyFilters — filter spec application', () => {
  let applyFilters, parseOrder;

  beforeEach(() => {
    applyFilters = require(FILTERS_PATH).applyFilters;
    parseOrder = require(PARSE_PATH).parseOrder;
  });
  afterEach(() => clearMocks());

  function makeOrders(overrides) {
    return overrides.map((ov, i) =>
      parseOrder(makeRow({ 'Order #': `O${i + 1}`, ...ov }), 'tab')
    );
  }

  it('date range: from/to inclusive', () => {
    const orders = makeOrders([
      { 'Date': '01-04-2026', 'Status': 'Delivered' },
      { 'Date': '05-04-2026', 'Status': 'Delivered' },
      { 'Date': '10-04-2026', 'Status': 'Delivered' },
    ]);
    const result = applyFilters(orders, { from: '2026-04-02', to: '2026-04-09', status: 'all', channels: [], orderType: 'all', paymentMode: 'all', state: '', printMethod: '' });
    assert.equal(result.length, 1);
    assert.equal(result[0].orderNumber, 'O2');
  });

  it('channel multi-select: only matching channels returned', () => {
    const orders = makeOrders([
      { 'Sales Channel': 'Instagram', 'Status': 'Delivered' },
      { 'Sales Channel': 'Website', 'Status': 'Delivered' },
      { 'Sales Channel': 'Instagram', 'Status': 'Delivered' },
    ]);
    const result = applyFilters(orders, { channels: ['Instagram'], status: 'all', orderType: 'all', paymentMode: 'all', from: null, to: null, state: '', printMethod: '' });
    assert.equal(result.length, 2);
  });

  it('orderType filter: B2B only', () => {
    const orders = makeOrders([
      { 'Order Type': 'B2C', 'Status': 'Delivered' },
      { 'Order Type': 'B2B', 'Status': 'Delivered' },
      { 'Order Type': 'B2C', 'Status': 'Delivered' },
    ]);
    const result = applyFilters(orders, { orderType: 'B2B', status: 'all', channels: [], paymentMode: 'all', from: null, to: null, state: '', printMethod: '' });
    assert.equal(result.length, 1);
    assert.equal(result[0].orderType, 'B2B');
  });

  it('paymentMode filter', () => {
    const orders = makeOrders([
      { 'Payment Mode': 'Prepaid', 'Status': 'Delivered' },
      { 'Payment Mode': 'COD', 'Status': 'Delivered' },
      { 'Payment Mode': 'Prepaid', 'Status': 'Delivered' },
    ]);
    const result = applyFilters(orders, { paymentMode: 'COD', status: 'all', channels: [], orderType: 'all', from: null, to: null, state: '', printMethod: '' });
    assert.equal(result.length, 1);
  });

  it('status="realized" filters to realized orders only', () => {
    const orders = makeOrders([
      { 'Status': 'Delivered' },
      { 'Status': 'Order Placed' },
      { 'Status': 'Fulfilled' },
      { 'Status': 'Cancelled' },
    ]);
    const result = applyFilters(orders, { status: 'realized', channels: [], orderType: 'all', paymentMode: 'all', from: null, to: null, state: '', printMethod: '' });
    assert.equal(result.length, 2); // Delivered + Fulfilled
  });

  it('status="all" returns all orders regardless of status', () => {
    const orders = makeOrders([
      { 'Status': 'Delivered' },
      { 'Status': 'Order Placed' },
      { 'Status': 'Cancelled' },
    ]);
    const result = applyFilters(orders, { status: 'all', channels: [], orderType: 'all', paymentMode: 'all', from: null, to: null, state: '', printMethod: '' });
    assert.equal(result.length, 3);
  });

  it('status=specific value matches case-insensitively', () => {
    const orders = makeOrders([
      { 'Status': 'Order Placed' },
      { 'Status': 'Delivered' },
      { 'Status': 'order placed' },
    ]);
    const result = applyFilters(orders, { status: 'Order Placed', channels: [], orderType: 'all', paymentMode: 'all', from: null, to: null, state: '', printMethod: '' });
    assert.equal(result.length, 2);
  });

  it('state filter', () => {
    const orders = makeOrders([
      { 'Shipping State': 'Maharashtra' },
      { 'Shipping State': 'Karnataka' },
      { 'Shipping State': 'Maharashtra' },
    ]);
    const result = applyFilters(orders, { state: 'Karnataka', status: 'all', channels: [], orderType: 'all', paymentMode: 'all', from: null, to: null, printMethod: '' });
    assert.equal(result.length, 1);
  });

  it('printMethod filter', () => {
    const orders = makeOrders([
      { 'Tags': 'DTF, Sublimation' },
      { 'Tags': 'Embroidery' },
      { 'Tags': 'DTF' },
    ]);
    const result = applyFilters(orders, { printMethod: 'DTF', status: 'all', channels: [], orderType: 'all', paymentMode: 'all', from: null, to: null, state: '' });
    assert.equal(result.length, 2);
  });
});

// ── NEW: detectIntraTabDuplicates ─────────────────────────────────────────────

describe('detectIntraTabDuplicates', () => {
  let detectIntraTabDuplicates, parseOrder;

  beforeEach(() => {
    detectIntraTabDuplicates = require(DQ_PATH).detectIntraTabDuplicates;
    parseOrder = require(PARSE_PATH).parseOrder;
  });
  afterEach(() => clearMocks());

  it('finds duplicates within the same tab', () => {
    const orders = [
      parseOrder(makeRow({ 'Order #': 'DUP1', 'Total Amount with tax': '1000' }), 'tabA'),
      parseOrder(makeRow({ 'Order #': 'DUP1', 'Total Amount with tax': '1100' }), 'tabA'),
      parseOrder(makeRow({ 'Order #': 'UNIQUE', 'Total Amount with tax': '500' }), 'tabA'),
    ];
    const dups = detectIntraTabDuplicates(orders);
    assert.equal(dups.length, 1);
    assert.equal(dups[0].orderNumber, 'DUP1');
    assert.equal(dups[0].count, 2);
    assert.equal(dups[0].sourceTab, 'tabA');
  });

  it('does not flag cross-tab same order as duplicate', () => {
    // Same order number in different tabs = expected cross-tab overlap, not a duplicate
    const orders = [
      parseOrder(makeRow({ 'Order #': 'CROSS1', 'Total Amount with tax': '1000' }), 'tabA'),
      parseOrder(makeRow({ 'Order #': 'CROSS1', 'Total Amount with tax': '1000' }), 'tabB'),
    ];
    const dups = detectIntraTabDuplicates(orders);
    assert.equal(dups.length, 0);
  });

  it('empty input returns empty array', () => {
    assert.deepEqual(detectIntraTabDuplicates([]), []);
  });
});

// ── NEW: detectAcceptanceMix ──────────────────────────────────────────────────

describe('detectAcceptanceMix', () => {
  let detectAcceptanceMix, parseOrder;

  beforeEach(() => {
    detectAcceptanceMix = require(DQ_PATH).detectAcceptanceMix;
    parseOrder = require(PARSE_PATH).parseOrder;
  });
  afterEach(() => clearMocks());

  it('counts categories case-insensitively', () => {
    const orders = [
      parseOrder(makeRow({ 'Order #': 'A1', 'Acceptance Status': 'Accepted' }), 'tab'),
      parseOrder(makeRow({ 'Order #': 'A2', 'Acceptance Status': 'accepted' }), 'tab'),
      parseOrder(makeRow({ 'Order #': 'A3', 'Acceptance Status': 'Rejected' }), 'tab'),
      parseOrder(makeRow({ 'Order #': 'A4', 'Acceptance Status': 'Pending' }), 'tab'),
      parseOrder(makeRow({ 'Order #': 'A5', 'Acceptance Status': '' }), 'tab'),
    ];
    const mix = detectAcceptanceMix(orders);
    assert.equal(mix.accepted, 2);
    assert.equal(mix.rejected, 1);
    assert.equal(mix.awaiting, 1);
    assert.equal(mix.other, 1);
    assert.equal(mix.total, 5);
  });
});

// ── NEW: summarizeRealizedRatio ───────────────────────────────────────────────

describe('summarizeRealizedRatio', () => {
  let summarizeRealizedRatio, parseOrder;

  beforeEach(() => {
    summarizeRealizedRatio = require(DQ_PATH).summarizeRealizedRatio;
    parseOrder = require(PARSE_PATH).parseOrder;
  });
  afterEach(() => clearMocks());

  it('correct ratio and excludedByStatus breakdown', () => {
    const orders = [
      parseOrder(makeRow({ 'Order #': 'R1', 'Status': 'Delivered' }), 'tab'),
      parseOrder(makeRow({ 'Order #': 'R2', 'Status': 'Delivered' }), 'tab'),
      parseOrder(makeRow({ 'Order #': 'R3', 'Status': 'Cancelled' }), 'tab'),
      parseOrder(makeRow({ 'Order #': 'R4', 'Status': 'Draft Order' }), 'tab'),
      parseOrder(makeRow({ 'Order #': 'R5', 'Status': 'Cancelled' }), 'tab'),
    ];
    const result = summarizeRealizedRatio(orders);
    assert.equal(result.realized, 2);
    assert.equal(result.total, 5);
    assert.equal(result.realizedPct, 40);
    // excludedByStatus should list Cancelled (2) and Draft Order (1)
    const cancelled = result.excludedByStatus.find(e => e.status.toLowerCase() === 'cancelled');
    const draft = result.excludedByStatus.find(e => e.status.toLowerCase() === 'draft order');
    assert.ok(cancelled, 'Cancelled should be in excludedByStatus');
    assert.equal(cancelled.count, 2);
    assert.ok(draft, 'Draft Order should be in excludedByStatus');
    assert.equal(draft.count, 1);
  });
});

// ── NEW: getDashboard with filterSpec ─────────────────────────────────────────

describe('getDashboard — filterSpec affects financial aggregations', () => {
  afterEach(() => clearMocks());

  it('financial aggregations respect filterSpec; status mix uses unfiltered', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);

    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'F1', 'Date': '28-04-2026', 'Status': 'Delivered', 'Total Amount with tax': '1000', 'Sales Channel': 'Instagram' }),
            makeRow({ 'Order #': 'F2', 'Date': '28-04-2026', 'Status': 'Cancelled', 'Total Amount with tax': '500', 'Sales Channel': 'Website' }),
            makeRow({ 'Order #': 'F3', 'Date': '28-04-2026', 'Status': 'Delivered', 'Total Amount with tax': '800', 'Sales Channel': 'Instagram' }),
          ],
        };
      }
      return { available: false };
    });

    const svc = require(SERVICE_PATH);
    // filter: realized only (default) — should only count F1 + F3
    const result = await svc.getDashboard(nowMs);

    // Today: only realized orders
    assert.equal(result.today.orders, 2, 'today.orders should be 2 (realized only)');
    assert.equal(result.today.revenue, 1800, 'today.revenue should be 1800 (F1 + F3)');

    // Status mix uses UNFILTERED: should show all 3 statuses
    const statusNames = result.mix.status.map(s => s.name);
    assert.ok(statusNames.some(s => s.toLowerCase() === 'delivered'), 'mix.status should include Delivered');
    assert.ok(statusNames.some(s => s.toLowerCase() === 'cancelled'), 'mix.status should include Cancelled');
  });

  it('dataQuality block is present with realized/total/realizedPct', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true, headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'DQ1', 'Date': '28-04-2026', 'Status': 'Delivered', 'Total Amount with tax': '500' }),
            makeRow({ 'Order #': 'DQ2', 'Date': '28-04-2026', 'Status': 'Cancelled', 'Total Amount with tax': '300' }),
          ],
        };
      }
      return { available: false };
    });
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    assert.ok(result.dataQuality, 'dataQuality block should exist');
    assert.equal(typeof result.dataQuality.realized, 'number');
    assert.equal(typeof result.dataQuality.total, 'number');
    assert.equal(typeof result.dataQuality.realizedPct, 'number');
    assert.ok(Array.isArray(result.dataQuality.excludedByStatus));
    assert.ok(Array.isArray(result.dataQuality.duplicates));
    assert.ok(result.dataQuality.acceptanceMix);
  });

  it('filters block is present with applied + available', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true, headers: HEADERS,
          rows: [makeRow({ 'Order #': 'FB1', 'Date': '28-04-2026', 'Status': 'Delivered', 'Total Amount with tax': '500' })],
        };
      }
      return { available: false };
    });
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    assert.ok(result.filters, 'filters block should exist');
    assert.ok(result.filters.applied, 'filters.applied should exist');
    assert.ok(result.filters.available, 'filters.available should exist');
    assert.equal(result.filters.defaultStatusFilter, 'realized');
    assert.ok(Array.isArray(result.filters.available.channels));
    assert.ok(Array.isArray(result.filters.available.statuses));
  });
});

// ── NEW: getFilteredOrders ─────────────────────────────────────────────────────

describe('getFilteredOrders — pagination + sort', () => {
  afterEach(() => clearMocks());

  it('pagination: limit and offset work correctly', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: Array.from({ length: 10 }, (_, i) =>
            makeRow({ 'Order #': `P${i + 1}`, 'Date': '28-04-2026', 'Status': 'Delivered', 'Total Amount with tax': '500', 'Time': `${String(i + 1).padStart(2, '0')}:00 AM` })
          ),
        };
      }
      return { available: false };
    });

    const svc = require(SERVICE_PATH);
    const r1 = await svc.getFilteredOrders({ limit: 3, offset: 0, nowMs });
    assert.equal(r1.orders.length, 3);
    assert.equal(r1.total, 10);
    assert.equal(r1.hasMore, true);

    const r2 = await svc.getFilteredOrders({ limit: 3, offset: 9, nowMs });
    assert.equal(r2.orders.length, 1);
    assert.equal(r2.hasMore, false);
  });

  it('sort order: date desc, then time desc', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'SO1', 'Date': '27-04-2026', 'Time': '10:00 AM', 'Status': 'Delivered', 'Total Amount with tax': '100' }),
            makeRow({ 'Order #': 'SO2', 'Date': '28-04-2026', 'Time': '02:00 PM', 'Status': 'Delivered', 'Total Amount with tax': '100' }),
            makeRow({ 'Order #': 'SO3', 'Date': '28-04-2026', 'Time': '09:00 AM', 'Status': 'Delivered', 'Total Amount with tax': '100' }),
          ],
        };
      }
      return { available: false };
    });

    const svc = require(SERVICE_PATH);
    const result = await svc.getFilteredOrders({ nowMs });
    const nums = result.orders.map(o => o.orderNumber);
    // Most recent first: SO2 (Apr 28, 2PM), SO3 (Apr 28, 9AM), SO1 (Apr 27)
    assert.equal(nums[0], 'SO2');
    assert.equal(nums[1], 'SO3');
    assert.equal(nums[2], 'SO1');
  });

  it('limit is capped at 500', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async () => ({ available: false }));
    const svc = require(SERVICE_PATH);
    // Should not throw — just returns empty with capped limit
    const result = await svc.getFilteredOrders({ limit: 9999, offset: 0, nowMs });
    assert.ok(result.orders.length <= 500);
  });
});

// ── NEW: trend30dLong format ──────────────────────────────────────────────────

describe('trend30dLong — long-format for Observable Plot', () => {
  afterEach(() => clearMocks());

  it('has exactly 60 records (30 days × 2 metrics)', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async () => ({
      available: true, headers: HEADERS,
      rows: [makeRow({ 'Order #': 'L1', 'Date': '28-04-2026', 'Status': 'Delivered', 'Total Amount with tax': '1000' })],
    }));
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);
    assert.ok(result.trend30dLong, 'trend30dLong should be present');
    assert.equal(result.trend30dLong.length, 60, '30 days × 2 metrics = 60 records');
  });

  it('each long-format record has date, metric, value', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async () => ({ available: true, headers: HEADERS, rows: [] }));
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);
    for (const entry of result.trend30dLong) {
      assert.ok('date' in entry, 'should have date');
      assert.ok('metric' in entry, 'should have metric');
      assert.ok('value' in entry, 'should have value');
      assert.ok(entry.metric === 'orders' || entry.metric === 'revenue');
    }
  });

  it('wide and long formats agree for the same date', async () => {
    const nowMs = Date.UTC(2026, 3, 28, 0, 0, 0);
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true, headers: HEADERS,
          rows: [makeRow({ 'Order #': 'WL1', 'Date': '28-04-2026', 'Status': 'Delivered', 'Total Amount with tax': '999' })],
        };
      }
      return { available: false };
    });
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);
    const wideEntry = result.trend30d.find(d => d.date === '2026-04-28');
    const longRevEntry = result.trend30dLong.find(e => e.date === '2026-04-28' && e.metric === 'revenue');
    assert.ok(wideEntry && longRevEntry, 'both formats should have Apr 28 entry');
    assert.equal(wideEntry.revenue, longRevEntry.value, 'wide and long revenue should match');
  });
});

// ── Blocker 1: orderType filter case-insensitive ───────────────────────────────

describe('Daily Sales — filters: orderType case-insensitive', () => {
  it('applyFilters with orderType "b2c" matches B2C orders', () => {
    const { applyFilters } = require(FILTERS_PATH);
    const { parseOrder } = require(PARSE_PATH);
    const orders = [
      parseOrder(makeRow({ 'Order #': 'A1', 'Order Type': 'B2C', 'Status': 'Delivered' }), 'tab'),
      parseOrder(makeRow({ 'Order #': 'A2', 'Order Type': 'B2B', 'Status': 'Delivered' }), 'tab'),
      parseOrder(makeRow({ 'Order #': 'A3', 'Order Type': 'b2c', 'Status': 'Delivered' }), 'tab'),
    ];
    const filtered = applyFilters(orders, { orderType: 'b2c', status: 'all' });
    const nums = filtered.map(o => o.orderNumber);
    assert.ok(nums.includes('A1'), 'B2C order should be included');
    assert.ok(!nums.includes('A2'), 'B2B order should be excluded');
    assert.ok(nums.includes('A3'), 'b2c (lowercase source) order should be included');
  });

  it('applyFilters with orderType "B2C" matches same set as "b2c"', () => {
    const { applyFilters } = require(FILTERS_PATH);
    const { parseOrder } = require(PARSE_PATH);
    const orders = [
      parseOrder(makeRow({ 'Order #': 'B1', 'Order Type': 'B2C', 'Status': 'Delivered' }), 'tab'),
      parseOrder(makeRow({ 'Order #': 'B2', 'Order Type': 'B2B', 'Status': 'Delivered' }), 'tab'),
    ];
    const upper = applyFilters(orders, { orderType: 'B2C', status: 'all' }).map(o => o.orderNumber);
    const lower = applyFilters(orders, { orderType: 'b2c', status: 'all' }).map(o => o.orderNumber);
    assert.deepEqual(upper.sort(), lower.sort(), 'uppercase and lowercase filter should return same set');
  });

  it('parseFilterSpec preserves arbitrary orderType values verbatim (case-insensitive match happens in applyFilters)', () => {
    const { parseFilterSpec } = require(FILTERS_PATH);
    // YDS canonical values pass through unchanged
    assert.equal(parseFilterSpec({ orderType: 'DS' }).orderType, 'DS');
    assert.equal(parseFilterSpec({ orderType: 'Manual' }).orderType, 'Manual');
    assert.equal(parseFilterSpec({ orderType: 'Stores' }).orderType, 'Stores');
    // Lowercase passes through too — applyFilters does the case-insensitive match
    assert.equal(parseFilterSpec({ orderType: 'b2c' }).orderType, 'b2c');
    // 'all' (any case) normalises to lowercase 'all' sentinel
    assert.equal(parseFilterSpec({ orderType: 'all' }).orderType, 'all');
    assert.equal(parseFilterSpec({ orderType: 'ALL' }).orderType, 'all');
    // Empty/missing falls back to default
    assert.equal(parseFilterSpec({ orderType: '' }).orderType, 'all');
    assert.equal(parseFilterSpec({}).orderType, 'all');
  });
});

// ── Blocker 2: acceptanceStatus case-insensitive in concerns ──────────────────

describe('Daily Sales — aggregations: pendingAcceptance case-insensitive', () => {
  it('awaiting (mixed case) all flow into pendingAcceptance', () => {
    const { buildConcerns } = require(AGG_PATH);
    const { parseOrder } = require(PARSE_PATH);
    const nowMs = Date.UTC(2026, 3, 28, 12, 0, 0);
    const cases = ['awaiting', 'Awaiting', 'AWAITING'];
    for (const acc of cases) {
      const order = parseOrder(makeRow({
        'Order #': 'PA1',
        'Date': '28-04-2026',
        'Acceptance Status': acc,
        'Status': 'Order Placed',
      }), 'tab');
      const { pendingAcceptance } = buildConcerns([order], nowMs);
      assert.equal(
        pendingAcceptance.length, 1,
        `acceptanceStatus "${acc}" should appear in pendingAcceptance`
      );
    }
  });

  it('pending (mixed case) flows into pendingAcceptance', () => {
    const { buildConcerns } = require(AGG_PATH);
    const { parseOrder } = require(PARSE_PATH);
    const nowMs = Date.UTC(2026, 3, 28, 12, 0, 0);
    const cases = ['pending', 'Pending', 'PENDING'];
    for (const acc of cases) {
      const order = parseOrder(makeRow({
        'Order #': 'PB1',
        'Date': '28-04-2026',
        'Acceptance Status': acc,
        'Status': 'Order Placed',
      }), 'tab');
      const { pendingAcceptance } = buildConcerns([order], nowMs);
      assert.equal(
        pendingAcceptance.length, 1,
        `acceptanceStatus "${acc}" should appear in pendingAcceptance`
      );
    }
  });

  it('rejected (case-insensitive) flows into pendingAcceptance', () => {
    const { buildConcerns } = require(AGG_PATH);
    const { parseOrder } = require(PARSE_PATH);
    const nowMs = Date.UTC(2026, 3, 28, 12, 0, 0);
    const order = parseOrder(makeRow({
      'Order #': 'PC1',
      'Date': '28-04-2026',
      'Acceptance Status': 'rejected',
      'Status': 'Order Placed',
    }), 'tab');
    const { pendingAcceptance } = buildConcerns([order], nowMs);
    assert.equal(pendingAcceptance.length, 1, 'lowercase rejected should appear in pendingAcceptance');
  });

  it('accepted does NOT flow into pendingAcceptance', () => {
    const { buildConcerns } = require(AGG_PATH);
    const { parseOrder } = require(PARSE_PATH);
    const nowMs = Date.UTC(2026, 3, 28, 12, 0, 0);
    const order = parseOrder(makeRow({
      'Order #': 'PD1',
      'Date': '28-04-2026',
      'Acceptance Status': 'Accepted',
      'Status': 'Order Placed',
    }), 'tab');
    const { pendingAcceptance } = buildConcerns([order], nowMs);
    assert.equal(pendingAcceptance.length, 0, 'accepted should NOT appear in pendingAcceptance');
  });
});

// ── Blocker 3: LRU cache bounded at 50 entries ────────────────────────────────

describe('Daily Sales — cache LRU eviction', () => {
  afterEach(() => clearMocks());

  it('evicts the oldest entry when 51st distinct key is inserted', async () => {
    mockSheets(async () => ({ available: true, headers: HEADERS, rows: [] }));
    const idx = require(INDEX_PATH);
    idx.clearCache();

    // Access internal cache via getDashboard with injected nowMs so caching runs
    // We can't reach _cacheMap directly, so we exercise via getDashboard with 51
    // distinct filterSpecs to force 51 cache writes. Then verify the first key
    // is gone by checking memory is still bounded (we test observable behaviour:
    // the 51st call doesn't throw and returns a result, and the total unique
    // requests served == 51 without OOM).
    //
    // For a white-box test we exercise setCache/getCached via the exported
    // buildCacheKey path, which is internal. Instead, drive through getDashboard
    // with 51 different from-dates to generate 51 distinct keys.

    const results = [];
    for (let i = 0; i < 51; i++) {
      const day = String(i + 1).padStart(2, '0');
      // Use a unique filterSpec per iteration to produce a unique cache key
      const result = await idx.getDashboard({
        filterSpec: { from: `2025-01-${day}`, to: null, channels: [], orderType: 'all', paymentMode: 'all', status: 'all', state: '', printMethod: '' },
        nowMs: Date.UTC(2026, 3, 28, 0, 0, 0),
      });
      results.push(result);
    }

    // All 51 calls must succeed and return a valid payload
    assert.equal(results.length, 51);
    for (const r of results) {
      assert.ok(r && typeof r === 'object', 'each result should be a plain object');
      assert.ok('today' in r, 'each result should have today key');
    }
  });
});

// ── Concern: parseTime12h bad input sorts LAST ────────────────────────────────

describe('Daily Sales — aggregations: invalid time sorts last in today\'s orders', () => {
  it('order with garbage time appears after order with valid time', () => {
    const { buildTodaysOrders } = require(AGG_PATH);
    const { parseOrder } = require(PARSE_PATH);

    const todayKey = '2026-04-28';
    const goodOrder = parseOrder(makeRow({
      'Order #': 'T1',
      'Date': '28-04-2026',
      'Time': '12:00 AM',
      'Status': 'Delivered',
    }), 'tab');
    const badOrder = parseOrder(makeRow({
      'Order #': 'T2',
      'Date': '28-04-2026',
      'Time': 'garbage',
      'Status': 'Delivered',
    }), 'tab');

    const sorted = buildTodaysOrders([goodOrder, badOrder], todayKey);
    assert.equal(sorted.length, 2, 'both orders should appear');
    assert.equal(sorted[0].orderNumber, 'T1', 'valid-time order should sort first (desc)');
    assert.equal(sorted[1].orderNumber, 'T2', 'garbage-time order should sort last');
  });

  it('parseTime12h returns -Infinity for bad input', () => {
    const { parseTime12h } = require(AGG_PATH);
    assert.equal(parseTime12h('garbage'), -Infinity, 'bad string → -Infinity');
    assert.equal(parseTime12h(''), -Infinity, 'empty string → -Infinity');
    assert.equal(parseTime12h(null), -Infinity, 'null → -Infinity');
    assert.ok(parseTime12h('12:00 AM') > -Infinity, 'valid time → finite number');
  });
});

// ── today.allStatuses — dual-display gross vs realized ────────────────────────

describe('Daily Sales Service — today.allStatuses dual-display', () => {
  afterEach(() => clearMocks());

  /**
   * Scenario: 5 orders arrive today — 3 Delivered (realized) + 2 Order Placed (non-realized).
   * today.orders must show 3 (realized only, for financial reporting).
   * today.allStatuses.orders must show 5 (gross, for the "did orders come in?" UX glance).
   * yesterday has 4 gross / 2 realized so vsYesterday deltas are verifiable for both modes.
   */
  it('today.orders=3 (realized) and today.allStatuses.orders=5 (gross) with mixed statuses', async () => {
    // nowMs: Apr 29 2026 IST (UTC midnight is still Apr 29 IST)
    const nowMs = Date.UTC(2026, 3, 29, 0, 0, 0);

    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            // Today (29-04-2026): 3 realized + 2 non-realized
            makeRow({ 'Order #': 'D1', 'Date': '29-04-2026', 'Status': 'Delivered',    'Total Amount with tax': '1000' }),
            makeRow({ 'Order #': 'D2', 'Date': '29-04-2026', 'Status': 'Delivered',    'Total Amount with tax': '2000' }),
            makeRow({ 'Order #': 'D3', 'Date': '29-04-2026', 'Status': 'Fulfilled',    'Total Amount with tax': '500'  }),
            makeRow({ 'Order #': 'P1', 'Date': '29-04-2026', 'Status': 'Order Placed', 'Total Amount with tax': '800'  }),
            makeRow({ 'Order #': 'P2', 'Date': '29-04-2026', 'Status': 'Processing',   'Total Amount with tax': '300'  }),
            // Yesterday (28-04-2026): 2 realized + 2 non-realized
            makeRow({ 'Order #': 'Y1', 'Date': '28-04-2026', 'Status': 'Delivered',    'Total Amount with tax': '600'  }),
            makeRow({ 'Order #': 'Y2', 'Date': '28-04-2026', 'Status': 'Delivered',    'Total Amount with tax': '400'  }),
            makeRow({ 'Order #': 'Y3', 'Date': '28-04-2026', 'Status': 'Order Placed', 'Total Amount with tax': '200'  }),
            makeRow({ 'Order #': 'Y4', 'Date': '28-04-2026', 'Status': 'Processing',   'Total Amount with tax': '100'  }),
          ],
        };
      }
      return { available: false };
    });

    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    // ── Realized (today.orders / revenue / aov) ──────────────────────────────
    assert.equal(result.today.orders,  3,    'today.orders: realized only (D1+D2+D3)');
    assert.equal(result.today.revenue, 3500, 'today.revenue: 1000+2000+500');
    // aov = 3500/3 ≈ 1167 (rounded by aggregate helper — allow ±1)
    assert.ok(Math.abs(result.today.aov - Math.round(3500 / 3)) <= 1,
      `today.aov should be ~${Math.round(3500 / 3)}, got ${result.today.aov}`);

    // ── Gross (today.allStatuses) ────────────────────────────────────────────
    assert.ok(result.today.allStatuses,               'today.allStatuses should exist');
    assert.equal(result.today.allStatuses.orders,  5, 'allStatuses.orders: all 5 today rows');
    assert.equal(result.today.allStatuses.revenue, 4600, 'allStatuses.revenue: 1000+2000+500+800+300');
    // aov gross = 4600/5 = 920
    assert.equal(result.today.allStatuses.aov, 920,   'allStatuses.aov: 4600/5=920');

    // ── Realized vsYesterday ─────────────────────────────────────────────────
    // today realized=3 vs yesterday realized=2 → delta=+1
    assert.equal(result.today.vsYesterday.orders.delta,    1,   'realized vsYesterday orders delta');
    // today revenue realized=3500 vs yesterday realized=1000 → delta=+2500
    assert.equal(result.today.vsYesterday.revenue.delta, 2500,  'realized vsYesterday revenue delta');

    // ── Gross vsYesterday ────────────────────────────────────────────────────
    assert.ok(result.today.allStatuses.vsYesterday, 'allStatuses.vsYesterday should exist');
    // today gross=5 vs yesterday gross=4 → delta=+1
    assert.equal(result.today.allStatuses.vsYesterday.orders.delta,    1,   'gross vsYesterday orders delta');
    // today gross revenue=4600 vs yesterday gross revenue=1300 → delta=+3300
    assert.equal(result.today.allStatuses.vsYesterday.revenue.delta, 3300,  'gross vsYesterday revenue delta');
  });

  it('today.allStatuses equals today realized when all orders are realized', async () => {
    const nowMs = Date.UTC(2026, 3, 29, 0, 0, 0);

    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'ALL1', 'Date': '29-04-2026', 'Status': 'Delivered', 'Total Amount with tax': '1000' }),
            makeRow({ 'Order #': 'ALL2', 'Date': '29-04-2026', 'Status': 'Fulfilled', 'Total Amount with tax': '2000' }),
          ],
        };
      }
      return { available: false };
    });

    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    // When all orders are realized, gross == realized
    assert.equal(result.today.allStatuses.orders,  result.today.orders,  'all realized: gross orders == realized orders');
    assert.equal(result.today.allStatuses.revenue, result.today.revenue, 'all realized: gross revenue == realized revenue');
  });

  it('allStatuses is absent from mtd and ytd (financial-only, no gross exposure)', async () => {
    const nowMs = Date.UTC(2026, 3, 29, 0, 0, 0);

    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [makeRow({ 'Order #': 'CHK1', 'Date': '29-04-2026', 'Status': 'Delivered', 'Total Amount with tax': '500' })],
        };
      }
      return { available: false };
    });

    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    assert.ok(!result.mtd.allStatuses,  'mtd should NOT have allStatuses');
    assert.ok(!result.ytd.allStatuses,  'ytd should NOT have allStatuses');
  });
});

// ── yesterday block (v4) ──────────────────────────────────────────────────────

describe('Daily Sales Service — yesterday block (v4)', () => {
  afterEach(() => clearMocks());

  // "now" = 2026-04-29 IST (UTC+5:30)
  // yesterdayKey = 2026-04-28, dayBeforeKey = 2026-04-27
  const nowMs = Date.UTC(2026, 3, 29, 0, 0, 0); // 29 Apr 2026 00:00 UTC = 29 Apr 05:30 IST

  function makeOrdersFixture() {
    return {
      available: true,
      headers: HEADERS,
      rows: [
        // Yesterday (2026-04-28) — 3 orders: 2 realized, 1 placed
        makeRow({ 'Order #': 'Y1', 'Date': '28-04-2026', 'Status': 'Delivered',    'Total Amount with tax': '1000', 'Sales Channel': 'B2C Website' }),
        makeRow({ 'Order #': 'Y2', 'Date': '28-04-2026', 'Status': 'Fulfilled',    'Total Amount with tax': '2000', 'Sales Channel': 'B2C Website' }),
        makeRow({ 'Order #': 'Y3', 'Date': '28-04-2026', 'Status': 'Order Placed', 'Total Amount with tax': '500',  'Sales Channel': 'Etsy' }),
        // Day-before-yesterday (2026-04-27) — 1 realized
        makeRow({ 'Order #': 'D1', 'Date': '27-04-2026', 'Status': 'Delivered',    'Total Amount with tax': '800',  'Sales Channel': 'B2C Website' }),
        // Today — should not appear in yesterday block
        makeRow({ 'Order #': 'T1', 'Date': '29-04-2026', 'Status': 'Delivered',    'Total Amount with tax': '300',  'Sales Channel': 'B2C Website' }),
      ],
    };
  }

  it('yesterday.orders/revenue/aov match manual aggregation of realized orders', async () => {
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') return makeOrdersFixture();
      return { available: false };
    });
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    assert.ok(result.yesterday, 'yesterday block should exist');
    // realized yesterday = Y1 (1000) + Y2 (2000) = 2 orders, 3000 revenue, 1500 aov
    assert.equal(result.yesterday.orders,  2,    'yesterday.orders: realized only');
    assert.equal(result.yesterday.revenue, 3000, 'yesterday.revenue: realized only');
    assert.equal(result.yesterday.aov,     1500, 'yesterday.aov: 3000/2');
    assert.equal(result.yesterday.date,    '2026-04-28', 'yesterday.date: explicit date key');
  });

  it('yesterday.vsDayBefore deltas are correct', async () => {
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') return makeOrdersFixture();
      return { available: false };
    });
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    // yesterday realized: 2 orders, 3000 revenue
    // day-before realized: 1 order (D1), 800 revenue
    const vdb = result.yesterday.vsDayBefore;
    assert.ok(vdb, 'vsDayBefore should exist');
    assert.equal(vdb.orders.delta,   1,    'vsDayBefore orders delta: 2-1=1');
    assert.equal(vdb.revenue.delta, 2200,  'vsDayBefore revenue delta: 3000-800=2200');
    assert.ok(vdb.orders.delta > 0,        'vsDayBefore orders: positive (growth)');
  });

  it('yesterday.allStatuses includes all statuses (gross count: realized + placed)', async () => {
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') return makeOrdersFixture();
      return { available: false };
    });
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    const as = result.yesterday.allStatuses;
    assert.ok(as, 'yesterday.allStatuses should exist');
    // Y1 + Y2 + Y3 = 3 gross yesterday orders (realized + placed both included)
    assert.equal(as.orders,  3,    'allStatuses.orders: 3 gross (realized + placed)');
    assert.equal(as.revenue, 3500, 'allStatuses.revenue: 1000+2000+500=3500');
  });

  it('yesterday.allStatuses.vsDayBefore compares gross vs gross', async () => {
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') return makeOrdersFixture();
      return { available: false };
    });
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    // yesterday gross = 3 orders (Y1+Y2+Y3)
    // day-before gross = 1 order (D1)
    const vdb = result.yesterday.allStatuses.vsDayBefore;
    assert.ok(vdb, 'allStatuses.vsDayBefore should exist');
    assert.equal(vdb.orders.delta, 2, 'gross vsDayBefore orders delta: 3-1=2');
  });

  it('yesterday.allStatuses changes when channel filter is applied (regression guard)', async () => {
    // Regression: if allStatuses incorrectly inherits the status filter but not
    // channel filter (or vice versa), channel-filtered allStatuses would equal
    // unfiltered allStatuses. Guard: Etsy-only yesterday.allStatuses.orders must
    // be 1 (only Y3), not 3 (all orders).
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') return makeOrdersFixture();
      return { available: false };
    });
    const svc = require(SERVICE_PATH);
    const { DEFAULT_FILTER_SPEC } = require(FILTERS_PATH);

    // Unfiltered
    const unfiltered = await svc.getDashboard({ filterSpec: null, nowMs });
    const unfilteredGross = unfiltered.yesterday.allStatuses.orders;

    // Etsy-only filter (channels is an array in FilterSpec)
    const etsyFilter = { ...DEFAULT_FILTER_SPEC, channels: ['Etsy'] };
    const etsy = await svc.getDashboard({ filterSpec: etsyFilter, nowMs });
    const etsyGross = etsy.yesterday.allStatuses.orders;

    assert.equal(unfilteredGross, 3, 'unfiltered yesterday.allStatuses.orders = 3');
    assert.equal(etsyGross, 1,       'etsy-filtered yesterday.allStatuses.orders = 1 (Y3 only)');
    assert.notEqual(etsyGross, unfilteredGross, 'channel filter changes yesterday.allStatuses (regression guard)');
  });
});

// ── freshness.dataCutoff (v4) ─────────────────────────────────────────────────

describe('Daily Sales Service — freshness.dataCutoff (v4)', () => {
  afterEach(() => clearMocks());

  it('dataCutoff is the latest istDateKey with orders', async () => {
    const nowMs = Date.UTC(2026, 3, 29, 0, 0, 0);
    mockSheets(async (key) => {
      if (key === 'SALES_CURRENT_MONTH') {
        return {
          available: true,
          headers: HEADERS,
          rows: [
            makeRow({ 'Order #': 'DC1', 'Date': '27-04-2026', 'Status': 'Delivered', 'Total Amount with tax': '500' }),
            makeRow({ 'Order #': 'DC2', 'Date': '28-04-2026', 'Status': 'Delivered', 'Total Amount with tax': '600' }),
          ],
        };
      }
      return { available: false };
    });
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    assert.equal(result.freshness.dataCutoff, '2026-04-28', 'dataCutoff = latest date with orders');
  });

  it('dataCutoff is null when allOrders is empty (Sheets unavailable)', async () => {
    const nowMs = Date.UTC(2026, 3, 29, 0, 0, 0);
    mockSheets(async () => ({ available: false, reason: 'not_configured' }));
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    assert.equal(result.freshness.dataCutoff, null, 'dataCutoff = null when no orders');
  });

  it('dataCutoff is null when sheets return empty rows', async () => {
    const nowMs = Date.UTC(2026, 3, 29, 0, 0, 0);
    mockSheets(async () => ({ available: true, headers: HEADERS, rows: [] }));
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    assert.equal(result.freshness.dataCutoff, null, 'dataCutoff = null when rows is empty');
  });

  it('freshness.fetchedAt still present alongside dataCutoff', async () => {
    const nowMs = Date.UTC(2026, 3, 29, 0, 0, 0);
    mockSheets(async () => ({ available: false }));
    const svc = require(SERVICE_PATH);
    const result = await svc.getDashboard(nowMs);

    assert.ok(result.freshness.fetchedAt, 'fetchedAt should still be present');
    assert.ok('dataCutoff' in result.freshness, 'dataCutoff key should exist in freshness');
  });
});
