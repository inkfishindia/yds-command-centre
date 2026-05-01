'use strict';

/**
 * aggregations.js — pure aggregation helpers.
 *
 * All functions take Order[] (from parse.js) and return plain objects.
 * No I/O, no side effects.
 */

const { getISTNow } = require('./fy');

// ── Revenue / order aggregation ────────────────────────────────────────────────

/**
 * Aggregate an Order[] into { orders, revenue, aov, _skippedRows }.
 * @param {import('./parse').Order[]} orders
 * @returns {{ orders: number, revenue: number, aov: number, _skippedRows: number }}
 */
function aggregate(orders) {
  let count = 0;
  let revenue = 0;
  let skipped = 0;
  for (const o of orders) {
    const v = o.amountWithTax;
    if (isNaN(v)) {
      skipped += 1;
      continue;
    }
    count += 1;
    revenue += v;
  }
  const aov = count > 0 ? Math.round(revenue / count) : 0;
  return { orders: count, revenue: Math.round(revenue), aov, _skippedRows: skipped };
}

/**
 * Compute delta + percentage change between two values.
 * @param {number} current
 * @param {number} previous
 * @returns {{ delta: number, pct: number|null }}
 */
function delta(current, previous) {
  const d = current - previous;
  const pct = previous !== 0 ? Math.round((d / previous) * 1000) / 10 : null;
  return { delta: Math.round(d), pct };
}

// ── Mix breakdowns ─────────────────────────────────────────────────────────────

/**
 * Build a mix breakdown by a field extracted from each Order.
 * Returns array sorted by revenue desc.
 *
 * @param {import('./parse').Order[]} orders
 * @param {function(import('./parse').Order): string} getField  - extract display value
 * @returns {Array<{ name: string, orders: number, revenue: number, pctRevenue: number }>}
 */
function buildMixByFn(orders, getField) {
  if (!orders || orders.length === 0) return [];

  const totalRevenue = orders.reduce((s, o) => {
    const v = o.amountWithTax;
    return s + (isNaN(v) ? 0 : v);
  }, 0);

  const map = new Map(); // lower → { displayName, orders, revenue }
  for (const o of orders) {
    const raw = getField(o) || '(unknown)';
    const key = raw.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { displayName: raw, orders: 0, revenue: 0 });
    }
    const entry = map.get(key);
    entry.orders += 1;
    const v = o.amountWithTax;
    if (!isNaN(v)) entry.revenue += v;
  }

  const result = [];
  for (const [, g] of map) {
    result.push({
      name: g.displayName,
      orders: g.orders,
      revenue: Math.round(g.revenue),
      pctRevenue: totalRevenue > 0 ? Math.round((g.revenue / totalRevenue) * 1000) / 10 : 0,
    });
  }
  result.sort((a, b) => b.revenue - a.revenue);
  return result;
}

/**
 * Build the full mix breakdown object.
 * @param {import('./parse').Order[]} orders
 * @returns {Object}
 */
function buildMix(orders) {
  return {
    salesChannel: buildMixByFn(orders, o => o.salesChannel),
    orderType:    buildMixByFn(orders, o => o.orderType),
    printMethod:  buildMixByFn(orders, o => o.printMethod),
    paymentMode:  buildMixByFn(orders, o => o.paymentMode),
    status:       buildMixByFn(orders, o => o.status),
  };
}

// ── Trend 30d ──────────────────────────────────────────────────────────────────

/**
 * Build 30-day trend array from Order[].
 * Returns wide format: [{ date, orders, revenue }].
 * @param {import('./parse').Order[]} orders
 * @param {number|null} nowMs
 * @returns {Array<{ date: string, orders: number, revenue: number }>}
 */
function buildTrend30d(orders, nowMs) {
  const istNow = getISTNow(nowMs);
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(istNow.getTime() - i * 24 * 60 * 60 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    days.push({ date: `${y}-${m}-${day}`, orders: 0, revenue: 0 });
  }

  const dateMap = new Map(days.map(d => [d.date, d]));

  for (const o of orders) {
    if (!o.istDateKey || !dateMap.has(o.istDateKey)) continue;
    const v = o.amountWithTax;
    const entry = dateMap.get(o.istDateKey);
    if (!isNaN(v)) {
      entry.orders += 1;
      entry.revenue += v;
    }
  }

  days.forEach(d => {
    d.revenue = Math.round(d.revenue);
    d.aov = d.orders > 0 ? Math.round(d.revenue / d.orders) : 0;
  });
  return days;
}

/**
 * Convert wide trend30d to long format for Observable Plot consumption.
 * Each date produces 2 records: one for 'orders', one for 'revenue'.
 * @param {Array<{ date: string, orders: number, revenue: number }>} wide
 * @returns {Array<{ date: string, metric: string, value: number }>}
 */
function buildTrend30dLong(wide) {
  const result = [];
  for (const entry of wide) {
    result.push({ date: entry.date, metric: 'orders',  value: entry.orders });
    result.push({ date: entry.date, metric: 'revenue', value: entry.revenue });
  }
  return result;
}

// ── Concerns ───────────────────────────────────────────────────────────────────

const TERMINAL_STATUSES = new Set([
  'delivered', 'fulfilled', 'fullfilled',
  'partially fulfilled', 'partially fullfilled',
  'cancelled', 'returned', 'refunded', 'rto', 'lost',
]);

/**
 * Build concerns per Master Spec §7 / UI Spec §11.
 *
 * pendingAcceptance  — status === 'Order Placed' && acceptanceStatus === 'awaiting'
 * rejectedOrders     — status === 'Order Placed' && acceptanceStatus === 'rejected'
 * stuckOrders        — (status === 'Order Placed' || status === 'Processing') && daysOpen > 5
 *
 * Each concern row: { orderNumber, customer, amount, daysAgo, daysOpen, channel, madeBy }
 * Revenue sums: pendingRevenue (sum over pendingAcceptance), rejectedRevenue (sum over rejectedOrders)
 *
 * @param {import('./parse').Order[]} orders
 * @param {number|null} nowMs
 * @returns {{
 *   pendingAcceptance: Object[],
 *   rejectedOrders: Object[],
 *   stuckOrders: Object[],
 *   pendingRevenue: number,
 *   rejectedRevenue: number
 * }}
 */
function buildConcerns(orders, nowMs) {
  const istNow = getISTNow(nowMs);
  const todayKey = (() => {
    const y = istNow.getUTCFullYear();
    const m = String(istNow.getUTCMonth() + 1).padStart(2, '0');
    const d = String(istNow.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();

  const pendingAcceptance = [];
  const rejectedOrders = [];
  const stuckOrders = [];
  let pendingRevenue = 0;
  let rejectedRevenue = 0;

  for (const o of orders) {
    let daysOpen = null;
    if (o.istDateKey) {
      const [oy, om, od] = o.istDateKey.split('-').map(Number);
      const [ty, tm, td] = todayKey.split('-').map(Number);
      const orderUTC = Date.UTC(oy, om - 1, od);
      const todayUTC = Date.UTC(ty, tm - 1, td);
      daysOpen = Math.floor((todayUTC - orderUTC) / 86400000);
    }

    const amt = isNaN(o.amountWithTax) ? 0 : Math.round(o.amountWithTax);
    const concern = {
      orderNumber: o.orderNumber,
      customer:    o.customer,
      amount:      amt,
      daysAgo:     daysOpen != null ? daysOpen : 0,  // kept for frontend compat
      daysOpen:    daysOpen != null ? daysOpen : 0,  // synonym per spec
      channel:     o.salesChannel,
      madeBy:      o.madeBy,
    };

    const statusLower = (o.status || '').toLowerCase();
    const accStatus = (o.acceptanceStatus || '').toLowerCase();

    // pendingAcceptance: Order Placed + awaiting
    if (statusLower === 'order placed' && accStatus === 'awaiting') {
      pendingAcceptance.push(concern);
      pendingRevenue += amt;
    }

    // rejectedOrders: Order Placed + rejected
    if (statusLower === 'order placed' && accStatus === 'rejected') {
      rejectedOrders.push({ ...concern });
      rejectedRevenue += amt;
    }

    // stuckOrders: Order Placed or Processing, open > 5 days
    // TERMINAL_STATUSES exclusion is defense-in-depth (Order Placed + Processing are non-terminal)
    if (
      (statusLower === 'order placed' || statusLower === 'processing') &&
      daysOpen != null && daysOpen > 5 &&
      !TERMINAL_STATUSES.has(statusLower)
    ) {
      stuckOrders.push({ ...concern, status: o.status });
    }
  }

  return {
    pendingAcceptance,
    rejectedOrders,
    stuckOrders,
    pendingRevenue,
    rejectedRevenue,
  };
}

// ── Top States ─────────────────────────────────────────────────────────────────

/**
 * Build top-10 states breakdown.
 * Sort: revenue desc, then orders desc, then state name asc.
 * @param {import('./parse').Order[]} orders
 * @returns {Array<{ state: string, orders: number, revenue: number }>}
 */
function buildTopStates(orders) {
  if (!orders || orders.length === 0) return [];

  const map = new Map();
  for (const o of orders) {
    const state = o.shipping.state || '(unknown)';
    const rev = o.amountWithTax;
    if (!map.has(state)) map.set(state, { state, orders: 0, revenue: 0 });
    const entry = map.get(state);
    entry.orders += 1;
    if (!isNaN(rev)) entry.revenue += rev;
  }

  return Array.from(map.values())
    .map(e => ({ ...e, revenue: Math.round(e.revenue) }))
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      if (b.orders !== a.orders) return b.orders - a.orders;
      return a.state.localeCompare(b.state);
    })
    .slice(0, 10);
}

// ── Today's Orders ─────────────────────────────────────────────────────────────

/**
 * Parse a 12-hour time string like "10:35 PM" to minutes since midnight.
 * Returns -Infinity on bad/missing input so invalid times sort LAST in desc order.
 * @param {string} str
 * @returns {number}
 */
function parseTime12h(str) {
  if (!str) return -Infinity;
  const m = str.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return -Infinity;
  let hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  const period = m[3].toUpperCase();
  if (period === 'AM') {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }
  return hours * 60 + minutes;
}

/**
 * Extract today's orders sorted by time desc.
 * Extended with channelGroup, shippingState, acceptanceStatus, madeBy per UI Spec Panel 10.
 * @param {import('./parse').Order[]} orders
 * @param {string} todayKey  - "YYYY-MM-DD" IST
 * @returns {Object[]}
 */
function buildTodaysOrders(orders, todayKey) {
  return orders
    .filter(o => o.istDateKey === todayKey)
    .map(o => ({
      orderNumber:      o.orderNumber,
      customer:         o.customer,
      amount:           Math.round(isNaN(o.amountWithTax) ? 0 : o.amountWithTax),
      status:           o.status,
      salesChannel:     o.salesChannel,
      tag:              o.printMethod,
      time:             o.time,
      // Extended fields (UI Spec Panel 10)
      channelGroup:     o.channelGroup,
      shippingState:    o.shipping.state,
      acceptanceStatus: o.acceptanceStatus,
      madeBy:           o.madeBy,
    }))
    .sort((a, b) => parseTime12h(b.time) - parseTime12h(a.time))
    .slice(0, 50);
}

// ── Weekly Trend ───────────────────────────────────────────────────────────────

const MONTH_ABBREVS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

/**
 * Format an FY week's date range as e.g. "1 Apr – 7 Apr".
 * FY week N spans FY days (N-1)*7+1 .. N*7, capped at today.
 * @param {number} weekNum   - 1-indexed FY week number
 * @param {number} fyStartYear - calendar year of April 1 (FY start)
 * @param {number} todayUTC  - today epoch ms (UTC midnight IST day)
 * @returns {string}
 */
function weekDateRange(weekNum, fyStartYear, todayUTC) {
  const fyStartUTC = Date.UTC(fyStartYear, 3, 1); // April 1 of FY start year
  const weekStartOrdinal = (weekNum - 1) * 7 + 1; // FY day (1-indexed)
  const weekEndOrdinal = weekNum * 7;

  const startMs = fyStartUTC + (weekStartOrdinal - 1) * 86400000;
  const endMs = Math.min(fyStartUTC + (weekEndOrdinal - 1) * 86400000, todayUTC);

  function fmt(ms) {
    const d = new Date(ms);
    const dayNum = d.getUTCDate();
    const month0 = d.getUTCMonth();
    // FY month index: April=0 → index 0 in MONTH_ABBREVS
    const fyMonthIdx = month0 >= 3 ? month0 - 3 : month0 + 9;
    return `${dayNum} ${MONTH_ABBREVS[fyMonthIdx]}`;
  }

  return `${fmt(startMs)} – ${fmt(endMs)}`;
}

/**
 * Build weekly trend array from filter-applied orders.
 * Returns one entry per FY week from W1 (Apr 1) up to the current week.
 * Future weeks are excluded (no data yet).
 *
 * @param {import('./parse').Order[]} orders   - filter-applied orders
 * @param {number|null} nowMs
 * @returns {Array<{ week: number, dateRange: string, orders: number, revenue: number, aov: number }>}
 */
function buildWeeklyTrend(orders, nowMs) {
  const istNow = getISTNow(nowMs);
  const istYear = istNow.getUTCFullYear();
  const istMonth0 = istNow.getUTCMonth();
  const istDay = istNow.getUTCDate();

  // FY start year (same calendar year if April+, else year - 1)
  const fyStartYear = istMonth0 >= 3 ? istYear : istYear - 1;
  const fyStartUTC = Date.UTC(fyStartYear, 3, 1); // April 1

  // Today as UTC midnight (for FY ordinal calculation)
  const todayUTC = Date.UTC(istYear, istMonth0, istDay);
  const todayFyOrdinal = Math.floor((todayUTC - fyStartUTC) / 86400000) + 1; // 1-indexed
  const currentWeek = Math.ceil(todayFyOrdinal / 7);

  // Aggregate orders by fyWeek
  const weekMap = new Map(); // weekNum → { orders: 0, revenue: 0 }
  for (const o of orders) {
    if (!o.fyWeek) continue;
    if (o.fyWeek > currentWeek) continue; // future week
    if (!weekMap.has(o.fyWeek)) weekMap.set(o.fyWeek, { orders: 0, revenue: 0 });
    const entry = weekMap.get(o.fyWeek);
    const v = o.amountWithTax;
    if (!isNaN(v)) {
      entry.orders += 1;
      entry.revenue += v;
    }
  }

  const result = [];
  for (let w = 1; w <= currentWeek; w++) {
    const data = weekMap.get(w) || { orders: 0, revenue: 0 };
    const revenue = Math.round(data.revenue);
    result.push({
      week:      w,
      dateRange: weekDateRange(w, fyStartYear, todayUTC),
      orders:    data.orders,
      revenue,
      aov:       data.orders > 0 ? Math.round(revenue / data.orders) : 0,
    });
  }
  return result;
}

module.exports = {
  aggregate,
  delta,
  buildMix,
  buildMixByFn,
  buildTrend30d,
  buildTrend30dLong,
  buildConcerns,
  buildTopStates,
  buildTodaysOrders,
  buildWeeklyTrend,
  parseTime12h,
};
