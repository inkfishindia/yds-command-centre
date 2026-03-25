'use strict';

const { fetchSheet } = require('./sheets');

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripNulls(obj) {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) result[k] = v;
  }
  return result;
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  return parseFloat(String(val).replace(/,/g, '')) || 0;
}

// Parse DD-MM-YYYY date strings into a Date object.
// Returns null if unparseable.
function parseDDMMYYYY(str) {
  if (!str) return null;
  const parts = String(str).split('-');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
  return isNaN(d.getTime()) ? null : d;
}

function formatDDMMYYYY(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Group an array by a key function and reduce values with a reducer.
// Returns a plain object: { key: reducedValue }
function _groupBy(arr, keyFn, reducerFn, initFn) {
  const map = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (key === undefined || key === null || key === '') continue;
    if (!(key in map)) map[key] = initFn();
    reducerFn(map[key], item);
  }
  return map;
}

// ── Sales cache (2-minute TTL) ────────────────────────────────────────────────

let salesCache = null;

function getFreshSalesCache() {
  if (!salesCache) return null;
  if (Date.now() - salesCache.time > 2 * 60 * 1000) return null;
  return salesCache.data;
}

// ── getOverview ───────────────────────────────────────────────────────────────

async function getOverview() {
  const [inventory, productTypes, poList, vendors] = await Promise.all([
    fetchSheet('OPS_PRODUCTS_INVENTORY').catch(() => ({ available: false })),
    fetchSheet('OPS_PRODUCT_TYPES').catch(() => ({ available: false })),
    fetchSheet('OPS_PO_LIST').catch(() => ({ available: false })),
    fetchSheet('OPS_VENDORS').catch(() => ({ available: false })),
  ]);

  // ── Stock Health ────────────────────────────────────────────────────────────
  let stockHealth = { available: false };
  let alerts = [];

  if (inventory.available) {
    const rows = inventory.rows || [];
    const statusCount = {};
    const urgentRows = [];

    for (const row of rows) {
      const status = String(row['Stock Status'] || '').toUpperCase();
      const totalStock = parseNum(row['Total Stock']);
      const daysUntil = parseNum(row['Days Until Stockout']);

      // Bucket by status — sheet values include emojis like 🔴 OUT, ⚠️ LOW, 🟢 OK, 🟡 REORDER,
      // 🟠 SLOW (N), 🟤 DEAD (N), 🟣 EXCESS%, ⚪ NO SALES
      let bucket;
      if (status.includes('OK')) bucket = 'OK';
      else if (status.includes('OUT')) bucket = 'OUT';
      else if (status.includes('REORDER')) bucket = 'REORDER';
      else if (status.includes('LOW')) bucket = 'LOW';
      else if (status.includes('SLOW')) bucket = 'SLOW';
      else if (status.includes('DEAD')) bucket = 'DEAD';
      else if (status.includes('NO SALES')) bucket = 'NO_SALES';
      else if (status.includes('%')) bucket = 'EXCESS';
      else bucket = 'UNKNOWN';

      statusCount[bucket] = (statusCount[bucket] || 0) + 1;

      // Alert candidates: low/reorder/out items, or days until stockout < 7
      const isAtRisk = bucket === 'OUT' || bucket === 'LOW' || bucket === 'REORDER';
      if (isAtRisk || (daysUntil > 0 && daysUntil < 7 && bucket !== 'OK' && bucket !== 'EXCESS')) {
        urgentRows.push({
          product: row['Product'] || '',
          color: row['Option 1 Value'] || '',
          size: row['Option 2 Value'] || '',
          totalStock,
          dailySalesRate: parseNum(row['Daily Sales Rate']),
          daysUntilStockout: daysUntil,
          stockStatus: row['Stock Status'] || '',
        });
      }
    }

    // Sort alerts by daysUntilStockout ascending, take top 20
    urgentRows.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
    alerts = urgentRows.slice(0, 20);

    stockHealth = {
      available: true,
      totalVariants: rows.length,
      lowStock: statusCount['LOW'] || 0,
      reorderNeeded: statusCount['REORDER'] || 0,
      outOfStock: statusCount['OUT'] || 0,
      healthy: statusCount['OK'] || 0,
      byStatus: Object.entries(statusCount).map(([name, count]) => ({ name, count })),
    };
  }

  // ── Products by tier ────────────────────────────────────────────────────────
  let products = { available: false };
  if (productTypes.available) {
    const rows = productTypes.rows || [];
    const tierCount = {};
    for (const row of rows) {
      const tier = row['Template Product Tier Classification'] ||
                   row['All Product Tier Classification'] ||
                   row['tier'] || 'Unknown';
      tierCount[tier] = (tierCount[tier] || 0) + 1;
    }
    products = {
      available: true,
      total: rows.length,
      byTier: Object.entries(tierCount).map(([name, count]) => ({ name, count })),
    };
  }

  // ── Pending POs ─────────────────────────────────────────────────────────────
  const pendingPOs = poList.available
    ? { available: true, count: (poList.rows || []).length, items: (poList.rows || []).slice(0, 20) }
    : { available: false };

  // ── Vendors ─────────────────────────────────────────────────────────────────
  const vendorList = vendors.available ? vendors.rows || [] : [];

  return {
    stockHealth,
    alerts,
    pendingPOs,
    vendors: vendorList,
    products,
    timestamp: new Date().toISOString(),
  };
}

// ── getStockHealth ────────────────────────────────────────────────────────────

async function getStockHealth(filters = {}) {
  const result = await fetchSheet('OPS_PRODUCTS_INVENTORY').catch(() => ({ available: false }));
  if (!result.available) return { available: false };

  let rows = result.rows || [];

  if (filters.status) {
    const s = filters.status.toUpperCase();
    rows = rows.filter(r => String(r['Stock Status'] || '').toUpperCase().includes(s));
  }
  if (filters.product) {
    const p = filters.product.toLowerCase();
    rows = rows.filter(r => String(r['Product'] || '').toLowerCase().includes(p));
  }
  if (filters.vendor) {
    const v = filters.vendor.toLowerCase();
    rows = rows.filter(r => String(r['Vendor'] || '').toLowerCase().includes(v));
  }
  if (filters.tier) {
    const t = filters.tier.toLowerCase();
    rows = rows.filter(r => String(r['Product_Tier'] || '').toLowerCase().includes(t));
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(r =>
      String(r['Product'] || '').toLowerCase().includes(q) ||
      String(r['Variant SKU'] || '').toLowerCase().includes(q) ||
      String(r['Option 1 Value'] || '').toLowerCase().includes(q) ||
      String(r['Option 2 Value'] || '').toLowerCase().includes(q)
    );
  }

  const total = rows.length;
  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 100;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = rows.slice((page - 1) * limit, page * limit).map(stripNulls);

  return { available: true, rows: paginated, total, page, limit, totalPages };
}

// ── getSalesOverview ──────────────────────────────────────────────────────────

async function getSalesOverview() {
  const cached = getFreshSalesCache();
  if (cached) return cached;

  const result = await fetchSheet('OPS_SALES_ORDERS').catch(() => ({ available: false }));
  if (!result.available) return { available: false };

  const rows = result.rows || [];

  let totalQuantity = 0;
  let totalRevenue = 0;

  const byChannel = {};   // key: channel name -> { orders, qty, revenue }
  const byStatus = {};    // key: status -> count
  const byCity = {};      // key: city -> count
  const byProduct = {};   // key: product name -> { orders, qty }
  const byDate = {};      // key: DD-MM-YYYY -> { orders, qty, revenue }

  const recentRows = [];  // collect all with parsed date for sorting

  for (const row of rows) {
    const qty = parseNum(row['quantity'] || row['Quantity'] || 0);
    const revenue = parseNum(row['Total Amount with tax'] || row['total_amount_with_tax'] || 0);
    const channel = row['Sales Channel'] || row['Order Type Key'] || row['sales_channel'] || 'Unknown';
    const status = row['Status'] || row['status'] || 'Unknown';
    const city = row['Shipping City'] || row['City'] || row['city'] || '';
    const product = row['Product'] || row['product'] || '';
    const rawDate = row['Date'] || row['Order Date'] || row['date'] || row['order_date'] || '';
    const orderNum = row['Order Number'] || row['order_number'] || row['Order ID'] || '';
    const customer = row['Customer Name'] || row['customer_name'] || row['Name'] || '';
    const amount = revenue;

    totalQuantity += qty;
    totalRevenue += revenue;

    // byChannel
    if (!byChannel[channel]) byChannel[channel] = { orders: 0, qty: 0, revenue: 0 };
    byChannel[channel].orders += 1;
    byChannel[channel].qty += qty;
    byChannel[channel].revenue += revenue;

    // byStatus
    byStatus[status] = (byStatus[status] || 0) + 1;

    // byCity (top 10 later)
    if (city) byCity[city] = (byCity[city] || 0) + 1;

    // byProduct
    if (product) {
      if (!byProduct[product]) byProduct[product] = { orders: 0, qty: 0 };
      byProduct[product].orders += 1;
      byProduct[product].qty += qty;
    }

    // byDate
    const parsedDate = parseDDMMYYYY(rawDate);
    if (parsedDate) {
      const dateKey = formatDDMMYYYY(parsedDate);
      if (!byDate[dateKey]) byDate[dateKey] = { orders: 0, qty: 0, revenue: 0, _ts: parsedDate.getTime() };
      byDate[dateKey].orders += 1;
      byDate[dateKey].qty += qty;
      byDate[dateKey].revenue += revenue;
    }

    recentRows.push({ orderNum, date: rawDate, _ts: parsedDate ? parsedDate.getTime() : 0, customer, product, qty, amount, status });
  }

  // Top 10 cities
  const topCities = Object.entries(byCity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Top 15 products by qty
  const topProducts = Object.entries(byProduct)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 15)
    .map(([name, d]) => ({ name, orders: d.orders, qty: d.qty }));

  // Recent 20 orders by date desc
  recentRows.sort((a, b) => b._ts - a._ts);
  const recentOrders = recentRows.slice(0, 20).map(r => stripNulls({
    orderNum: r.orderNum,
    date: r.date,
    customer: r.customer,
    product: r.product,
    qty: r.qty,
    amount: r.amount,
    status: r.status,
  }));

  // Daily trend: last 30 unique dates sorted desc
  const dailyTrend = Object.entries(byDate)
    .sort((a, b) => b[1]._ts - a[1]._ts)
    .slice(0, 30)
    .map(([date, d]) => ({ date, orders: d.orders, qty: d.qty, revenue: d.revenue }));

  const data = {
    available: true,
    totalOrders: rows.length,
    totalQuantity,
    totalRevenue,
    byChannel: Object.entries(byChannel).map(([name, d]) => ({ name, orders: d.orders, qty: d.qty, revenue: d.revenue })),
    byStatus: Object.entries(byStatus).map(([name, count]) => ({ name, count })),
    byCity: topCities,
    topProducts,
    recentOrders,
    dailyTrend,
    timestamp: new Date().toISOString(),
  };

  salesCache = { data, time: Date.now() };
  return data;
}

// ── getProducts ───────────────────────────────────────────────────────────────

async function getProducts(filters = {}) {
  const result = await fetchSheet('OPS_PRODUCT_TYPES').catch(() => ({ available: false }));
  if (!result.available) return { available: false };

  let rows = result.rows || [];

  if (filters.status) {
    const s = filters.status.toLowerCase();
    rows = rows.filter(r => String(r['Status'] || r['status'] || '').toLowerCase() === s);
  }
  if (filters.vendor) {
    const v = filters.vendor.toLowerCase();
    rows = rows.filter(r => String(r['Vendor'] || r['vendor'] || '').toLowerCase().includes(v));
  }
  if (filters.tier) {
    const t = filters.tier.toLowerCase();
    rows = rows.filter(r =>
      String(r['Template Product Tier Classification'] || '').toLowerCase().includes(t) ||
      String(r['All Product Tier Classification'] || '').toLowerCase().includes(t)
    );
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(r =>
      String(r['Product_Name'] || r['Product Name'] || '').toLowerCase().includes(q) ||
      String(r['Product_Code'] || r['Product Code'] || '').toLowerCase().includes(q)
    );
  }

  return { available: true, rows, total: rows.length };
}

// ── getPurchaseOrders ─────────────────────────────────────────────────────────

async function getPurchaseOrders() {
  const result = await fetchSheet('OPS_PO_LIST').catch(() => ({ available: false }));
  if (!result.available) return { available: false };

  const rows = (result.rows || []).map(row => {
    // Compute urgency: days until expected delivery
    const deliveryDate = parseDDMMYYYY(row['Expected Delivery'] || row['Delivery Date'] || row['expected_delivery'] || '');
    const now = new Date();
    const daysUntilDelivery = deliveryDate
      ? Math.round((deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      ...row,
      daysUntilDelivery,
      urgent: daysUntilDelivery !== null && daysUntilDelivery <= 3,
    };
  });

  return { available: true, rows, total: rows.length };
}

// ── warmCaches ────────────────────────────────────────────────────────────────
// Fire-and-forget: pre-warm the sales cache at server startup so the first
// user request is served from cache rather than waiting 5s.

function warmCaches() {
  getSalesOverview().catch(err => {
    console.error('[ops] warmCaches error:', err.message);
  });
}

module.exports = {
  getOverview,
  getStockHealth,
  getSalesOverview,
  getProducts,
  getPurchaseOrders,
  warmCaches,
};
