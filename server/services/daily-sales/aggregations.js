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
  'delivered', 'cancelled', 'returned', 'refunded',
]);

/**
 * Build concerns: pending acceptance + stuck orders.
 * @param {import('./parse').Order[]} orders
 * @param {number|null} nowMs
 * @returns {{ pendingAcceptance: Object[], stuckOrders: Object[] }}
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
  const stuckOrders = [];

  for (const o of orders) {
    let daysAgo = null;
    if (o.istDateKey) {
      const [oy, om, od] = o.istDateKey.split('-').map(Number);
      const [ty, tm, td] = todayKey.split('-').map(Number);
      const orderUTC = Date.UTC(oy, om - 1, od);
      const todayUTC = Date.UTC(ty, tm - 1, td);
      daysAgo = Math.floor((todayUTC - orderUTC) / 86400000);
    }

    const concern = {
      orderNumber: o.orderNumber,
      customer:    o.customer,
      amount:      isNaN(o.amountWithTax) ? 0 : Math.round(o.amountWithTax),
      daysAgo:     daysAgo != null ? daysAgo : 0,
      channel:     o.salesChannel,
    };

    const accStatus = (o.acceptanceStatus || '').toLowerCase();
    if (accStatus === 'pending' || accStatus === 'awaiting' || accStatus === 'rejected') {
      pendingAcceptance.push(concern);
    }

    if (daysAgo != null && daysAgo > 5 && !TERMINAL_STATUSES.has(o.status.toLowerCase())) {
      stuckOrders.push({ ...concern, status: o.status });
    }
  }

  return { pendingAcceptance, stuckOrders };
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
 * @param {import('./parse').Order[]} orders
 * @param {string} todayKey  - "YYYY-MM-DD" IST
 * @returns {Object[]}
 */
function buildTodaysOrders(orders, todayKey) {
  return orders
    .filter(o => o.istDateKey === todayKey)
    .map(o => ({
      orderNumber:  o.orderNumber,
      customer:     o.customer,
      amount:       Math.round(isNaN(o.amountWithTax) ? 0 : o.amountWithTax),
      status:       o.status,
      salesChannel: o.salesChannel,
      tag:          o.printMethod,
      time:         o.time,
    }))
    .sort((a, b) => parseTime12h(b.time) - parseTime12h(a.time))
    .slice(0, 50);
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
  parseTime12h,
};
