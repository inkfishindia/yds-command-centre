'use strict';

const assert = require('node:assert/strict');
const { describe, it, beforeEach, afterEach } = require('node:test');
const path = require('path');

const SHEETS_PATH = path.join(__dirname, '../server/services/sheets.js');
const OPS_SERVICE_PATH = path.join(__dirname, '../server/services/ops-service.js');
const OPS_READ_MODEL_PATH = path.join(__dirname, '../server/read-model/ops.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInventoryRows(overrides = []) {
  const defaults = [
    { 'Product': 'Mug A', 'Option 1 Value': 'Red', 'Option 2 Value': '11oz', 'Total Stock': '5', 'Daily Sales Rate': '2', 'Days Until Stockout': '2', 'Stock Status': 'LOW', 'Vendor': 'VendorX', 'Product_Tier': 'A' },
    { 'Product': 'Mug B', 'Option 1 Value': 'Blue', 'Option 2 Value': '15oz', 'Total Stock': '0', 'Daily Sales Rate': '1', 'Days Until Stockout': '0', 'Stock Status': 'OUT', 'Vendor': 'VendorY', 'Product_Tier': 'B' },
    { 'Product': 'Tshirt C', 'Option 1 Value': 'Black', 'Option 2 Value': 'M', 'Total Stock': '100', 'Daily Sales Rate': '3', 'Days Until Stockout': '33', 'Stock Status': 'OK', 'Vendor': 'VendorX', 'Product_Tier': 'A' },
    { 'Product': 'Tshirt D', 'Option 1 Value': 'White', 'Option 2 Value': 'L', 'Total Stock': '10', 'Daily Sales Rate': '4', 'Days Until Stockout': '3', 'Stock Status': 'REORDER', 'Vendor': 'VendorZ', 'Product_Tier': 'C' },
  ];
  return [...defaults, ...overrides];
}

function makeSalesRows() {
  return [
    { 'Order Number': 'ORD001', 'Date': '01-01-2025', 'Customer Name': 'Alice', 'Product': 'Mug A', 'quantity': '2', 'Total Amount with tax': '1,200', 'Sales Channel': 'B2C', 'Status': 'Delivered', 'City': 'Mumbai' },
    { 'Order Number': 'ORD002', 'Date': '01-01-2025', 'Customer Name': 'Bob', 'Product': 'Tshirt C', 'quantity': '1.00', 'Total Amount with tax': '500', 'Sales Channel': 'B2B', 'Status': 'Delivered', 'City': 'Delhi' },
    { 'Order Number': 'ORD003', 'Date': '02-01-2025', 'Customer Name': 'Carol', 'Product': 'Mug A', 'quantity': '3', 'Total Amount with tax': '1,800', 'Sales Channel': 'B2C', 'Status': 'Order Placed', 'City': 'Mumbai' },
  ];
}

function makeProductTypeRows() {
  return [
    { 'Product_Name': 'Mug', 'Product_Code': 'MUG', 'Status': 'Active', 'Vendor': 'VendorX', 'Template Product Tier Classification': 'A' },
    { 'Product_Name': 'Tshirt', 'Product_Code': 'TSH', 'Status': 'Inactive', 'Vendor': 'VendorY', 'Template Product Tier Classification': 'B' },
    { 'Product_Name': 'Cap', 'Product_Code': 'CAP', 'Status': 'Active', 'Vendor': 'VendorX', 'Template Product Tier Classification': 'A' },
  ];
}

function makePoRows() {
  return [
    { 'PO Number': 'PO001', 'Expected Delivery': '01-01-2020', 'Status': 'Pending' },
    { 'PO Number': 'PO002', 'Expected Delivery': '31-12-2099', 'Status': 'Pending' },
  ];
}

// ── Module loading ─────────────────────────────────────────────────────────────

describe('Ops Service — module loading', () => {
  it('loads without crashing', () => {
    assert.doesNotThrow(() => require(OPS_SERVICE_PATH));
  });

  it('exports expected functions', () => {
    const svc = require(OPS_SERVICE_PATH);
    assert.equal(typeof svc.getOverview, 'function');
    assert.equal(typeof svc.getStockHealth, 'function');
    assert.equal(typeof svc.getSalesOverview, 'function');
    assert.equal(typeof svc.getProducts, 'function');
    assert.equal(typeof svc.getPurchaseOrders, 'function');
  });
});

// ── getOverview ───────────────────────────────────────────────────────────────

describe('Ops Service — getOverview', () => {
  beforeEach(() => {
    // Clear module caches so we get fresh requires with mocked sheets
    delete require.cache[OPS_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  afterEach(() => {
    delete require.cache[OPS_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  it('returns timestamp', async () => {
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: {
        fetchSheet: async () => ({ available: false }),
      },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getOverview();
    assert.ok(result.timestamp, 'should have timestamp');
  });

  it('computes stock health counts correctly', async () => {
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: {
        fetchSheet: async (key) => {
          if (key === 'OPS_PRODUCTS_INVENTORY') {
            return { available: true, rows: makeInventoryRows() };
          }
          return { available: false };
        },
      },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getOverview();

    assert.equal(result.stockHealth.available, true);
    assert.equal(result.stockHealth.totalVariants, 4);
    assert.equal(result.stockHealth.lowStock, 1);
    assert.equal(result.stockHealth.outOfStock, 1);
    assert.equal(result.stockHealth.healthy, 1);
    assert.equal(result.stockHealth.reorderNeeded, 1);
  });

  it('alerts contain rows with Days Until Stockout < 7 and not OK', async () => {
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: {
        fetchSheet: async (key) => {
          if (key === 'OPS_PRODUCTS_INVENTORY') {
            return { available: true, rows: makeInventoryRows() };
          }
          return { available: false };
        },
      },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getOverview();

    // Mug A (days=2, LOW), Mug B (days=0, OUT), Tshirt D (days=3, REORDER) qualify
    assert.ok(result.alerts.length >= 3, `Expected >= 3 alerts, got ${result.alerts.length}`);
    // OK row (Tshirt C, days=33) should NOT be in alerts
    const okAlert = result.alerts.find(a => a.product === 'Tshirt C');
    assert.equal(okAlert, undefined, 'OK status items should not appear in alerts');
  });

  it('alerts are sorted by daysUntilStockout ascending', async () => {
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: {
        fetchSheet: async (key) => {
          if (key === 'OPS_PRODUCTS_INVENTORY') {
            return { available: true, rows: makeInventoryRows() };
          }
          return { available: false };
        },
      },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getOverview();

    for (let i = 1; i < result.alerts.length; i++) {
      assert.ok(
        result.alerts[i].daysUntilStockout >= result.alerts[i - 1].daysUntilStockout,
        'alerts should be sorted ascending by daysUntilStockout'
      );
    }
  });

  it('degraded gracefully when inventory sheet unavailable', async () => {
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: { fetchSheet: async () => ({ available: false }) },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getOverview();
    assert.equal(result.stockHealth.available, false);
    assert.ok(Array.isArray(result.alerts));
    assert.equal(result.alerts.length, 0);
  });

  it('handles fetchSheet rejections without throwing', async () => {
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: { fetchSheet: async () => { throw new Error('network error'); } },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    await assert.doesNotReject(() => svc.getOverview());
  });
});

// ── getStockHealth ────────────────────────────────────────────────────────────

describe('Ops Service — getStockHealth filters', () => {
  beforeEach(() => {
    delete require.cache[OPS_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: {
        fetchSheet: async () => ({ available: true, rows: makeInventoryRows() }),
      },
      parent: null, children: [], paths: [],
    };
  });

  afterEach(() => {
    delete require.cache[OPS_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  it('returns all rows when no filters', async () => {
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getStockHealth();
    assert.equal(result.available, true);
    assert.equal(result.total, 4);
  });

  it('filters by status', async () => {
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getStockHealth({ status: 'OK' });
    assert.equal(result.total, 1);
    assert.equal(result.rows[0]['Product'], 'Tshirt C');
  });

  it('filters by product name (partial match)', async () => {
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getStockHealth({ product: 'mug' });
    assert.equal(result.total, 2);
  });

  it('filters by vendor', async () => {
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getStockHealth({ vendor: 'VendorX' });
    assert.equal(result.total, 2);
  });

  it('filters by tier', async () => {
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getStockHealth({ tier: 'B' });
    assert.equal(result.total, 1);
    assert.equal(result.rows[0]['Product'], 'Mug B');
  });

  it('filters by search across product and options', async () => {
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getStockHealth({ search: 'red' });
    assert.equal(result.total, 1);
    assert.equal(result.rows[0]['Product'], 'Mug A');
  });

  it('returns available: false when sheet unavailable', async () => {
    delete require.cache[SHEETS_PATH];
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: { fetchSheet: async () => ({ available: false }) },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getStockHealth();
    assert.equal(result.available, false);
  });
});

// ── getSalesOverview ──────────────────────────────────────────────────────────

describe('Ops Service — getSalesOverview', () => {
  beforeEach(() => {
    delete require.cache[OPS_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  afterEach(() => {
    delete require.cache[OPS_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  it('returns correct totalOrders count', async () => {
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: { fetchSheet: async () => ({ available: true, rows: makeSalesRows() }) },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getSalesOverview();
    assert.equal(result.available, true);
    assert.equal(result.totalOrders, 3);
  });

  it('parses comma-formatted revenue correctly', async () => {
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: { fetchSheet: async () => ({ available: true, rows: makeSalesRows() }) },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getSalesOverview();
    // 1200 + 500 + 1800 = 3500
    assert.equal(result.totalRevenue, 3500);
  });

  it('parses float-formatted quantities correctly', async () => {
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: { fetchSheet: async () => ({ available: true, rows: makeSalesRows() }) },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getSalesOverview();
    // 2 + 1 + 3 = 6
    assert.equal(result.totalQuantity, 6);
  });

  it('groups byChannel correctly', async () => {
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: { fetchSheet: async () => ({ available: true, rows: makeSalesRows() }) },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getSalesOverview();
    const b2c = result.byChannel.find(c => c.name === 'B2C');
    assert.ok(b2c, 'B2C channel should exist');
    assert.equal(b2c.orders, 2);
    const b2b = result.byChannel.find(c => c.name === 'B2B');
    assert.ok(b2b, 'B2B channel should exist');
    assert.equal(b2b.orders, 1);
  });

  it('topProducts sorted by qty desc', async () => {
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: { fetchSheet: async () => ({ available: true, rows: makeSalesRows() }) },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getSalesOverview();
    // Mug A: qty=5, Tshirt C: qty=1
    assert.equal(result.topProducts[0].name, 'Mug A');
    assert.equal(result.topProducts[0].qty, 5);
  });

  it('recentOrders limited to 20 and sorted desc by date', async () => {
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: { fetchSheet: async () => ({ available: true, rows: makeSalesRows() }) },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getSalesOverview();
    assert.ok(result.recentOrders.length <= 20);
    // ORD003 (02-01-2025) should come before ORD001/ORD002 (01-01-2025)
    assert.equal(result.recentOrders[0].orderNum, 'ORD003');
  });

  it('returns available: false when sheet unavailable', async () => {
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: { fetchSheet: async () => ({ available: false }) },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getSalesOverview();
    assert.equal(result.available, false);
  });

  it('has timestamp', async () => {
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: { fetchSheet: async () => ({ available: true, rows: makeSalesRows() }) },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getSalesOverview();
    assert.ok(result.timestamp);
  });
});

// ── getProducts ───────────────────────────────────────────────────────────────

describe('Ops Service — getProducts filters', () => {
  beforeEach(() => {
    delete require.cache[OPS_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: {
        fetchSheet: async () => ({ available: true, rows: makeProductTypeRows() }),
      },
      parent: null, children: [], paths: [],
    };
  });

  afterEach(() => {
    delete require.cache[OPS_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  it('returns all rows when no filters', async () => {
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getProducts();
    assert.equal(result.total, 3);
  });

  it('filters by status', async () => {
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getProducts({ status: 'Active' });
    assert.equal(result.total, 2);
  });

  it('filters by vendor', async () => {
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getProducts({ vendor: 'VendorY' });
    assert.equal(result.total, 1);
    assert.equal(result.rows[0]['Product_Name'], 'Tshirt');
  });

  it('filters by tier', async () => {
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getProducts({ tier: 'A' });
    assert.equal(result.total, 2);
  });

  it('filters by search on Product_Name', async () => {
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getProducts({ search: 'cap' });
    assert.equal(result.total, 1);
    assert.equal(result.rows[0]['Product_Name'], 'Cap');
  });
});

// ── getPurchaseOrders ─────────────────────────────────────────────────────────

describe('Ops Service — getPurchaseOrders', () => {
  beforeEach(() => {
    delete require.cache[OPS_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  afterEach(() => {
    delete require.cache[OPS_SERVICE_PATH];
    delete require.cache[SHEETS_PATH];
  });

  it('returns all rows with urgency computed', async () => {
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: { fetchSheet: async () => ({ available: true, rows: makePoRows() }) },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getPurchaseOrders();
    assert.equal(result.available, true);
    assert.equal(result.total, 2);
    // PO001 has past delivery date — should be urgent
    assert.equal(result.rows[0].urgent, true);
    // PO002 has far future date — not urgent
    assert.equal(result.rows[1].urgent, false);
  });

  it('returns available: false when sheet unavailable', async () => {
    require.cache[SHEETS_PATH] = {
      id: SHEETS_PATH, filename: SHEETS_PATH, loaded: true,
      exports: { fetchSheet: async () => ({ available: false }) },
      parent: null, children: [], paths: [],
    };
    const svc = require(OPS_SERVICE_PATH);
    const result = await svc.getPurchaseOrders();
    assert.equal(result.available, false);
  });
});

// ── Ops Route — module loading ─────────────────────────────────────────────────

describe('Ops Route — module loading', () => {
  it('loads without crashing', () => {
    assert.doesNotThrow(() => require('../server/routes/ops'));
  });

  it('exports an express router', () => {
    const router = require('../server/routes/ops');
    assert.ok(typeof router === 'function' || typeof router.stack !== 'undefined');
  });

  it('registers GET / route', () => {
    const router = require('../server/routes/ops');
    const hasRoot = router.stack.some(l => l.route && l.route.path === '/' && l.route.methods.get);
    assert.ok(hasRoot, 'GET / should be registered');
  });

  it('registers GET /stock route', () => {
    const router = require('../server/routes/ops');
    const has = router.stack.some(l => l.route && l.route.path === '/stock' && l.route.methods.get);
    assert.ok(has, 'GET /stock should be registered');
  });

  it('registers GET /sales route', () => {
    const router = require('../server/routes/ops');
    const has = router.stack.some(l => l.route && l.route.path === '/sales' && l.route.methods.get);
    assert.ok(has, 'GET /sales should be registered');
  });

  it('registers GET /products route', () => {
    const router = require('../server/routes/ops');
    const has = router.stack.some(l => l.route && l.route.path === '/products' && l.route.methods.get);
    assert.ok(has, 'GET /products should be registered');
  });

  it('registers GET /purchase-orders route', () => {
    const router = require('../server/routes/ops');
    const has = router.stack.some(l => l.route && l.route.path === '/purchase-orders' && l.route.methods.get);
    assert.ok(has, 'GET /purchase-orders should be registered');
  });
});

describe('Ops Read Model', () => {
  afterEach(() => {
    delete require.cache[OPS_SERVICE_PATH];
    delete require.cache[OPS_READ_MODEL_PATH];
  });

  it('wraps overview payload in data/meta contract', async () => {
    const svc = require(OPS_SERVICE_PATH);
    const opsReadModel = require('../server/read-model/ops');

    svc.getOverview = async () => ({
      stockHealth: { available: true, byStatus: [], outOfStock: 0 },
      alerts: [],
      pendingPOs: { available: true, count: 0, items: [] },
      vendors: [],
      products: { available: true, total: 0, byTier: [] },
      timestamp: '2026-04-08T00:00:00.000Z',
    });

    const result = await opsReadModel.build();
    assert.ok(result.data, 'has data');
    assert.ok(result.meta, 'has meta');
    assert.equal(result.meta.partial, false);
    assert.deepEqual(result.meta.degradedSources, []);
    assert.equal(result.meta.sourceFreshness.stockHealth.status, 'ok');
  });

  it('flags degraded sources when overview sections are unavailable', async () => {
    const svc = require(OPS_SERVICE_PATH);
    const opsReadModel = require('../server/read-model/ops');

    svc.getOverview = async () => ({
      stockHealth: { available: false },
      alerts: [],
      pendingPOs: { available: false, count: 0, items: [] },
      vendors: null,
      products: { available: false, total: 0, byTier: [] },
      timestamp: '2026-04-08T00:00:00.000Z',
    });

    const result = await opsReadModel.build();
    assert.equal(result.meta.partial, true);
    assert.ok(result.meta.degradedSources.includes('stockHealth'));
    assert.ok(result.meta.degradedSources.includes('products'));
    assert.ok(result.meta.degradedSources.includes('pendingPOs'));
    assert.ok(result.meta.degradedSources.includes('vendors'));
  });
});

// ── Sheets Registry — OPS keys ────────────────────────────────────────────────

describe('Sheets Registry — OPS sheet keys', () => {
  const { SHEET_REGISTRY, SPREADSHEET_KEYS } = require('../server/services/sheets');

  const OPS_KEYS = [
    'OPS_PRODUCT_TYPES', 'OPS_PRODUCT_CLASSIFICATION', 'OPS_PRODUCTS_INVENTORY',
    'OPS_VENDORS', 'OPS_PO_LIST', 'OPS_WAREHOUSE_PRODUCTS',
    'OPS_SALES_ORDERS', 'OPS_SALES_PRODUCT_CLASS',
    'OPS_PRODUCT_VARIANTS', 'OPS_PRODUCT_TYPE_MASTER',
    'OPS_WAREHOUSE_ZONES', 'OPS_WAREHOUSE_BINS', 'OPS_WAREHOUSE_COLORS', 'OPS_PRODUCT_CODE_MASTER',
  ];

  for (const key of OPS_KEYS) {
    it(`SHEET_REGISTRY has key ${key}`, () => {
      assert.ok(SHEET_REGISTRY[key], `${key} should exist in SHEET_REGISTRY`);
    });

    it(`${key} has a spreadsheetKey and sheetName`, () => {
      const entry = SHEET_REGISTRY[key];
      assert.ok(entry.spreadsheetKey, `${key} should have spreadsheetKey`);
      assert.ok(entry.sheetName, `${key} should have sheetName`);
    });
  }

  it('SPREADSHEET_KEYS has OPS_INVENTORY', () => {
    assert.equal(SPREADSHEET_KEYS.OPS_INVENTORY, 'OPS_INVENTORY');
  });

  it('SPREADSHEET_KEYS has OPS_SALES', () => {
    assert.equal(SPREADSHEET_KEYS.OPS_SALES, 'OPS_SALES');
  });

  it('SPREADSHEET_KEYS has OPS_PRODUCTS', () => {
    assert.equal(SPREADSHEET_KEYS.OPS_PRODUCTS, 'OPS_PRODUCTS');
  });

  it('SPREADSHEET_KEYS has OPS_WAREHOUSE', () => {
    assert.equal(SPREADSHEET_KEYS.OPS_WAREHOUSE, 'OPS_WAREHOUSE');
  });
});
