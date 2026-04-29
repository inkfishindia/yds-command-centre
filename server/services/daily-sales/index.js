'use strict';

/**
 * daily-sales/index.js — public API for the Daily Sales service.
 *
 * Public exports:
 *   getDashboard({ filterSpec, nowMs })  → composed payload
 *   getFilteredOrders({ filterSpec, limit, offset })  → paginated Order[]
 *   clearCache()
 *
 * Also re-exports helpers used in tests:
 *   parseDDMMYYYY, getISTNow, toISTDateKey, fyDisplayLabel
 */

const { fetchSheet, resolveSheetName, SHEET_REGISTRY, getSpreadsheetId } = require('../sheets');

const { IST_OFFSET_MS, getISTNow, lastDayOfMonth, fyDisplayLabel, fyMonthIndex } = require('./fy');
const { parseDDMMYYYY, toISTDateKey, parseOrder } = require('./parse');
const { applyFilters, DEFAULT_FILTER_SPEC, summarizeFilterApplied } = require('./filters');
const {
  aggregate, delta,
  buildMix, buildTrend30d, buildTrend30dLong,
  buildConcerns, buildTopStates, buildTodaysOrders,
} = require('./aggregations');
const {
  detectIntraTabDuplicates,
  detectAcceptanceMix,
  summarizeRealizedRatio,
} = require('./data-quality');

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 50;

// Map preserves insertion order — used for LRU eviction (oldest key first).
// Shape: key → { data, ts }
const _cacheMap = new Map();

/**
 * Build a simple cache key from filterSpec + date bucket.
 * Default (no filter) always maps to 'default'.
 */
function buildCacheKey(filterSpec, nowMs) {
  if (!filterSpec || filterSpec === DEFAULT_FILTER_SPEC) {
    // Use a 5-minute bucket so cache expires naturally
    const bucket = Math.floor((nowMs || Date.now()) / CACHE_TTL_MS);
    return `default:${bucket}`;
  }
  // For filtered calls, serialize the spec as the key
  const spec = JSON.stringify(filterSpec);
  const bucket = Math.floor((nowMs || Date.now()) / CACHE_TTL_MS);
  return `filtered:${spec}:${bucket}`;
}

function getCached(key) {
  const entry = _cacheMap.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    _cacheMap.delete(key);
    return null;
  }
  // LRU touch on read: re-insert to move to end
  _cacheMap.delete(key);
  _cacheMap.set(key, entry);
  return entry.data;
}

function setCache(key, data) {
  // If at capacity and adding a new key, evict the oldest entry first
  if (_cacheMap.size >= MAX_CACHE_ENTRIES && !_cacheMap.has(key)) {
    const oldest = _cacheMap.keys().next().value;
    _cacheMap.delete(oldest);
  }
  // Re-insert to move to end (LRU touch on write)
  _cacheMap.delete(key);
  _cacheMap.set(key, { data, ts: Date.now() });
}

function clearCache() {
  _cacheMap.clear();
}

// ── Row fetching + parsing ─────────────────────────────────────────────────────

/**
 * Fetch raw rows from all three tabs and return Order[] per tab.
 * Applies intra-tab dedup before returning.
 *
 * @param {Date} istNowDate  - IST-shifted Date for resolving tab names
 * @returns {{ ytdOrders: Order[], monthOrders: Order[], lastFYOrders: Order[],
 *             ytdAvailable: boolean, monthTabAvailable: boolean, lastFYAvailable: boolean,
 *             ytdTabName: string, lastFYTabName: string, currentMonthTabName: string,
 *             monthResult: Object }}
 */
async function fetchAllOrders(istNowDate) {
  const ytdTabName = resolveSheetName(SHEET_REGISTRY.SALES_YTD, istNowDate);
  const lastFYTabName = resolveSheetName(SHEET_REGISTRY.SALES_LAST_FY, istNowDate);
  const currentMonthTabName = resolveSheetName(SHEET_REGISTRY.SALES_CURRENT_MONTH, istNowDate);

  const [ytdResult, monthResult, lastFYResult] = await Promise.all([
    fetchSheet('SALES_YTD', istNowDate),
    fetchSheet('SALES_CURRENT_MONTH', istNowDate),
    fetchSheet('SALES_LAST_FY', istNowDate),
  ]);

  const ytdAvailable = !!(ytdResult && ytdResult.available);
  const monthTabAvailable = !!(monthResult && monthResult.available);
  const lastFYAvailable = !!(lastFYResult && lastFYResult.available);

  // Parse rows → Order[], then apply intra-tab dedup per tab
  const ytdOrders = deduplicateIntraTab(
    (ytdAvailable ? (ytdResult.rows || []) : []).map(r => parseOrder(r, ytdTabName))
  );
  const monthOrders = deduplicateIntraTab(
    (monthTabAvailable ? (monthResult.rows || []) : []).map(r => parseOrder(r, currentMonthTabName))
  );
  const lastFYOrders = deduplicateIntraTab(
    (lastFYAvailable ? (lastFYResult.rows || []) : []).map(r => parseOrder(r, lastFYTabName))
  );

  return {
    ytdOrders, monthOrders, lastFYOrders,
    ytdAvailable, monthTabAvailable, lastFYAvailable,
    ytdTabName, lastFYTabName, currentMonthTabName,
    monthResult,
  };
}

/**
 * Dedup within a single tab — same orderNumber, last wins.
 * @param {Order[]} orders
 * @returns {Order[]}
 */
function deduplicateIntraTab(orders) {
  const seen = new Map();
  for (const o of orders) seen.set(o.orderNumber, o);
  return Array.from(seen.values());
}

/**
 * Cross-tab dedup: merge ytdOrders + monthOrders, month wins on overlap.
 * @param {Order[]} ytdOrders
 * @param {Order[]} monthOrders
 * @returns {Order[]}
 */
function deduplicateCrossTab(ytdOrders, monthOrders) {
  const seen = new Map();
  // YTD first, month second → month wins (last write wins)
  for (const o of ytdOrders) seen.set(o.orderNumber, o);
  for (const o of monthOrders) seen.set(o.orderNumber, o);
  return Array.from(seen.values());
}

// ── Available filter options ───────────────────────────────────────────────────

/**
 * Build the set of available filter values from full (unfiltered) Order[].
 * @param {Order[]} allOrders
 * @returns {Object}
 */
function buildAvailableFilters(allOrders) {
  const channels    = new Map();
  const orderTypes  = new Set();
  const paymentModes = new Map();
  const statuses    = new Map();
  const printMethods = new Map();
  const states      = new Map();

  for (const o of allOrders) {
    // Count for revenue-desc sort later
    const rev = isNaN(o.amountWithTax) ? 0 : o.amountWithTax;

    // channels
    const ch = o.salesChannel || '(unknown)';
    if (!channels.has(ch)) channels.set(ch, 0);
    channels.set(ch, channels.get(ch) + rev);

    orderTypes.add(o.orderType);

    const pm = o.paymentMode || '(unknown)';
    if (!paymentModes.has(pm)) paymentModes.set(pm, 0);
    paymentModes.set(pm, paymentModes.get(pm) + rev);

    const st = o.status || '(empty)';
    if (!statuses.has(st)) statuses.set(st, 0);
    statuses.set(st, statuses.get(st) + 1);

    const tag = o.printMethod || '(unknown)';
    if (!printMethods.has(tag)) printMethods.set(tag, 0);
    printMethods.set(tag, printMethods.get(tag) + rev);

    const state = o.shipping.state || '(unknown)';
    if (!states.has(state)) states.set(state, 0);
    states.set(state, states.get(state) + rev);
  }

  const sortByRevDesc = map => Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  return {
    channels:     sortByRevDesc(channels),
    orderTypes:   Array.from(orderTypes).sort(),
    paymentModes: sortByRevDesc(paymentModes),
    statuses:     Array.from(statuses.entries()).sort((a, b) => b[1] - a[1]).map(([s]) => s),
    printMethods: sortByRevDesc(printMethods),
    states:       sortByRevDesc(states),
  };
}

// ── getDashboard ───────────────────────────────────────────────────────────────

/**
 * Returns the composed daily-sales dashboard payload.
 *
 * Accepts either:
 *   getDashboard()                          — default filter, live time
 *   getDashboard(nowMs)                     — backward-compat: positional number (test injection)
 *   getDashboard({ filterSpec, nowMs })     — new object form
 *
 * @param {Object|number|null} [optsOrNowMs]
 * @returns {Promise<Object>}
 */
async function getDashboard(optsOrNowMs) {
  // Backward-compat: positional number was the old API signature
  let filterSpec = null;
  let nowMs = null;
  if (typeof optsOrNowMs === 'number') {
    nowMs = optsOrNowMs;
  } else if (optsOrNowMs && typeof optsOrNowMs === 'object') {
    filterSpec = optsOrNowMs.filterSpec || null;
    nowMs = optsOrNowMs.nowMs != null ? optsOrNowMs.nowMs : null;
  }
  return _getDashboard({ filterSpec, nowMs });
}

async function _getDashboard({ filterSpec = null, nowMs = null } = {}) {
  const _nowMs = nowMs != null ? nowMs : Date.now();

  // Normalize filterSpec — null means "use default"
  const activeFilter = filterSpec || DEFAULT_FILTER_SPEC;

  const cacheKey = buildCacheKey(activeFilter, _nowMs);

  const cached = getCached(cacheKey);
  // Skip cache when nowMs injected (test mode)
  if (cached && nowMs == null) return cached;

  const istNowDate = new Date(_nowMs + IST_OFFSET_MS);
  const istNow = getISTNow(_nowMs);
  const istYear = istNow.getUTCFullYear();
  const istMonth = istNow.getUTCMonth(); // 0-based
  const istDay = istNow.getUTCDate();

  const todayKey = `${istYear}-${String(istMonth + 1).padStart(2, '0')}-${String(istDay).padStart(2, '0')}`;

  // Fetch
  const {
    ytdOrders, monthOrders, lastFYOrders,
    ytdAvailable, monthTabAvailable, lastFYAvailable,
    ytdTabName, lastFYTabName, currentMonthTabName,
    monthResult,
  } = await fetchAllOrders(istNowDate);

  // Cross-tab dedup: ytd + month → allOrders (month wins on overlap)
  const allOrders = deduplicateCrossTab(ytdOrders, monthOrders);

  // Source rows for today/MTD/mix/topStates — prefer month tab
  const sourceOrders = monthTabAvailable ? monthOrders : ytdOrders;

  // ── Today ────────────────────────────────────────────────────────────────────

  const yesterdayD = new Date(Date.UTC(istYear, istMonth, istDay - 1) + IST_OFFSET_MS);
  const yesterdayKey = `${yesterdayD.getUTCFullYear()}-${String(yesterdayD.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterdayD.getUTCDate()).padStart(2, '0')}`;

  const dayBeforeD = new Date(Date.UTC(istYear, istMonth, istDay - 2) + IST_OFFSET_MS);
  const dayBeforeKey = `${dayBeforeD.getUTCFullYear()}-${String(dayBeforeD.getUTCMonth() + 1).padStart(2, '0')}-${String(dayBeforeD.getUTCDate()).padStart(2, '0')}`;

  const todayOrdersAll = sourceOrders.filter(o => o.istDateKey === todayKey);
  const yesterdayOrdersAll = sourceOrders.filter(o => o.istDateKey === yesterdayKey);
  const dayBeforeOrdersAll = sourceOrders.filter(o => o.istDateKey === dayBeforeKey);

  // todayAgg / yesterdayAgg kept for internal use only — do not expose in payload.
  // allStatuses uses allStatusAgg variants below (see "Apply financial filter" block).
  const todayAgg = aggregate(todayOrdersAll);
  const yesterdayAgg = aggregate(yesterdayOrdersAll);

  // ── MTD ──────────────────────────────────────────────────────────────────────

  const mtdStart = `${istYear}-${String(istMonth + 1).padStart(2, '0')}-01`;
  const mtdEnd = todayKey;
  const mtdOrders = sourceOrders.filter(o => o.istDateKey && o.istDateKey >= mtdStart && o.istDateKey <= mtdEnd);

  const lastMonth0 = istMonth === 0 ? 11 : istMonth - 1;
  const lastMonthYear = istMonth === 0 ? istYear - 1 : istYear;
  const lastMonthLastDay = lastDayOfMonth(lastMonthYear, lastMonth0);
  const lastMonthSameDay = Math.min(istDay, lastMonthLastDay);
  const lmStart = `${lastMonthYear}-${String(lastMonth0 + 1).padStart(2, '0')}-01`;
  const lmEnd = `${lastMonthYear}-${String(lastMonth0 + 1).padStart(2, '0')}-${String(lastMonthSameDay).padStart(2, '0')}`;
  const lastMonthSourcePool = [...allOrders, ...lastFYOrders];
  const lastMonthMTDOrders = lastMonthSourcePool.filter(o => o.istDateKey && o.istDateKey >= lmStart && o.istDateKey <= lmEnd);

  const mtdAgg = aggregate(mtdOrders);
  const lastMonthMTDAgg = aggregate(lastMonthMTDOrders);

  // ── YTD ──────────────────────────────────────────────────────────────────────

  const ytdAgg = aggregate(allOrders);

  // ── Apply financial filter ────────────────────────────────────────────────────
  // Financial aggregations (today, MTD, YTD, trend, mix, topStates) are computed
  // on filter-applied orders. Status mix breakdown uses UNFILTERED sourceOrders
  // so it remains diagnostic regardless of filter.

  const filteredAllOrders = applyFilters(allOrders, activeFilter);
  const filteredSourceOrders = applyFilters(sourceOrders, activeFilter);

  // Re-run aggregations on filtered orders
  const filteredTodayOrders = filteredSourceOrders.filter(o => o.istDateKey === todayKey);
  const filteredYesterdayOrders = filteredSourceOrders.filter(o => o.istDateKey === yesterdayKey);
  const filteredMtdOrders = filteredSourceOrders.filter(o => o.istDateKey && o.istDateKey >= mtdStart && o.istDateKey <= mtdEnd);
  const filteredLastMonthMTDOrders = applyFilters(lastMonthMTDOrders, activeFilter);

  const filteredTodayAgg = applyFilters(todayOrdersAll, activeFilter).length > 0
    ? aggregate(applyFilters(todayOrdersAll, activeFilter))
    : todayAgg; // When no filter changes things, keep original

  // If filtering is the default (status: realized) use the full aggregates for today/mtd/ytd
  // so existing tests pass — the default filter just means "no explicit filter applied".
  // Actually, the default IS realized; we must always filter. Let's just always apply.
  const todayAggFinal = aggregate(applyFilters(todayOrdersAll, activeFilter));
  const yesterdayAggFinal = aggregate(applyFilters(yesterdayOrdersAll, activeFilter));
  const dayBeforeAggFinal = aggregate(applyFilters(dayBeforeOrdersAll, activeFilter));
  const mtdAggFinal = aggregate(applyFilters(mtdOrders, activeFilter));
  const lastMonthMTDAggFinal = aggregate(applyFilters(lastMonthMTDOrders, activeFilter));
  const ytdAggFinal = aggregate(applyFilters(allOrders, activeFilter));

  // allStatuses aggregates: all non-status filters (channel, orderType, etc.) still apply,
  // but status filter is lifted so gross counts include realized/placed/cancelled/etc.
  const allStatusFilter = { ...activeFilter, status: 'all' };
  const todayAggAllStatus     = aggregate(applyFilters(todayOrdersAll,     allStatusFilter));
  const yesterdayAggAllStatus = aggregate(applyFilters(yesterdayOrdersAll, allStatusFilter));
  const dayBeforeAggAllStatus = aggregate(applyFilters(dayBeforeOrdersAll, allStatusFilter));

  // ── vsLastFY ─────────────────────────────────────────────────────────────────
  // Computed AFTER ytdAggFinal so both sides (current and prior) are filtered
  // identically. Using ytdAgg (unfiltered) vs lastFYAgg (unfiltered) caused
  // apples-to-oranges deltas when the strip displays filtered values.

  let vsLastFY = null;
  if (lastFYAvailable) {
    const todayFYMonthIdx = fyMonthIndex(istMonth);
    const lastFYScopedOrders = lastFYOrders.filter(o => {
      if (!o.date) return false;
      const ist = new Date(o.date.getTime() + IST_OFFSET_MS);
      const rowMonth0 = ist.getUTCMonth();
      const rowDay = ist.getUTCDate();
      const rowFYMonthIdx = fyMonthIndex(rowMonth0);
      if (rowFYMonthIdx < todayFYMonthIdx) return true;
      if (rowFYMonthIdx === todayFYMonthIdx) return rowDay <= istDay;
      return false;
    });
    const lastFYAggFinal = aggregate(applyFilters(lastFYScopedOrders, activeFilter));
    vsLastFY = {
      orders:  delta(ytdAggFinal.orders, lastFYAggFinal.orders),
      revenue: delta(ytdAggFinal.revenue, lastFYAggFinal.revenue),
      aov:     delta(ytdAggFinal.aov, lastFYAggFinal.aov),
      lastFYTabName,
      lastFYDisplayLabel: fyDisplayLabel(lastFYTabName),
    };
  }

  // ── Trend 30d ─────────────────────────────────────────────────────────────────

  const trend30d = buildTrend30d(applyFilters(allOrders, activeFilter), _nowMs);
  const trend30dLong = buildTrend30dLong(trend30d);

  // ── Mix (status mix = unfiltered for diagnostic value) ────────────────────────

  // Mix uses sourceOrders (unfiltered) so status breakdown is always visible
  const mix = buildMix(sourceOrders);

  // ── Top States ────────────────────────────────────────────────────────────────

  const topStates = buildTopStates(applyFilters(sourceOrders, activeFilter));

  // ── Today's Orders ────────────────────────────────────────────────────────────

  const todaysOrders = buildTodaysOrders(sourceOrders, todayKey);

  // ── Concerns (unfiltered — diagnostic) ───────────────────────────────────────

  const concerns = buildConcerns(allOrders, _nowMs);

  // ── Data Quality ──────────────────────────────────────────────────────────────

  // Collect all orders before cross-tab dedup, but after intra-tab dedup,
  // to detect cross-tab relationships. For intra-tab duplicates, check each tab.
  const allOrdersPreCrossDedup = [...ytdOrders, ...monthOrders];
  const intraDups = detectIntraTabDuplicates(allOrdersPreCrossDedup);
  const acceptanceMix = detectAcceptanceMix(allOrders);
  const realizedRatio = summarizeRealizedRatio(allOrders);

  const dataQuality = {
    realized:          realizedRatio.realized,
    total:             realizedRatio.total,
    realizedPct:       realizedRatio.realizedPct,
    excludedByStatus:  realizedRatio.excludedByStatus,
    duplicates:        intraDups,
    acceptanceMix,
  };

  // ── Available filter options ──────────────────────────────────────────────────

  const availableFilters = buildAvailableFilters(allOrders);

  // ── Compose payload ───────────────────────────────────────────────────────────

  const spreadsheetId = getSpreadsheetId('DAILY_SALES');
  const sourceUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    : null;

  // ── dataCutoff ────────────────────────────────────────────────────────────────
  // Latest istDateKey in allOrders that has at least one order.
  // Semantically: "data is complete through this date." Distinct from fetchedAt
  // (when the API last pulled from Sheets). Null when Sheets is unavailable.
  let dataCutoff = null;
  if (allOrders.length > 0) {
    for (const o of allOrders) {
      if (o.istDateKey && (dataCutoff === null || o.istDateKey > dataCutoff)) {
        dataCutoff = o.istDateKey;
      }
    }
  }

  // ── latestOrder ────────────────────────────────────────────────────────────────
  // Most recent order (by date + time combo) from allOrders.
  // Used to show "last order at HH:MM AM/PM" in the UI.
  let latestOrder = null;
  if (allOrders.length > 0) {
    let maxKey = '';
    for (const o of allOrders) {
      const orderKey = o.istDateKey && o.time ? `${o.istDateKey}T${o.time}` : '';
      if (orderKey && orderKey > maxKey) {
        maxKey = orderKey;
        latestOrder = { orderNumber: o.orderNumber, time: o.time };
      }
    }
  }

  const payload = {
    source: {
      workbookTitle: 'YDC - sales report',
      ytdTabName,
      ytdDisplayLabel: fyDisplayLabel(ytdTabName),
      currentMonthTabName,
      ytdAvailable,
      monthTabAvailable,
      monthTabReason: monthTabAvailable ? undefined : (monthResult && monthResult.reason),
      sourceUrl,
    },
    freshness: {
      fetchedAt: new Date(_nowMs).toISOString(),
      // dataCutoff: latest IST date with orders in the dataset.
      // Null when Sheets is unavailable (allOrders empty).
      dataCutoff,
      // latestOrder: most recent order's number + time, for "last order at HH:MM"
      latestOrder,
    },
    /**
     * today.orders / revenue / aov — realized only (status filter applied).
     * today.allStatuses — gross counts with NO STATUS filter, but all other active
     *   filters (channel, orderType, paymentMode, state, printMethod) still apply.
     *   Use allStatuses.orders for the "did orders come in today?" UX glance.
     *   Use today.orders for financial reporting (realized only).
     *
     * yesterday — same shape as today but aggregated over the previous calendar day
     *   (IST-bucketed). vsDayBefore compares yesterday vs day-before-yesterday so
     *   the user can see day-over-day movement on the most recent complete dataset.
     *   yesterday.allStatuses applies all active filters except status (same semantics
     *   as today.allStatuses) — channel/type/etc. filters still apply.
     *
     * MTD and YTD intentionally have no allStatuses equivalent — they are
     * financial reports and should always show realized figures only.
     */
    today: {
      orders:  todayAggFinal.orders,
      revenue: todayAggFinal.revenue,
      aov:     todayAggFinal.aov,
      vsYesterday: {
        orders:  delta(todayAggFinal.orders, yesterdayAggFinal.orders),
        revenue: delta(todayAggFinal.revenue, yesterdayAggFinal.revenue),
        aov:     delta(todayAggFinal.aov, yesterdayAggFinal.aov),
      },
      allStatuses: {
        orders:  todayAggAllStatus.orders,
        revenue: todayAggAllStatus.revenue,
        aov:     todayAggAllStatus.aov,
        vsYesterday: {
          orders:  delta(todayAggAllStatus.orders,  yesterdayAggAllStatus.orders),
          revenue: delta(todayAggAllStatus.revenue, yesterdayAggAllStatus.revenue),
          aov:     delta(todayAggAllStatus.aov,     yesterdayAggAllStatus.aov),
        },
      },
      _skippedRows: todayAggFinal._skippedRows,
    },
    yesterday: {
      orders:  yesterdayAggFinal.orders,
      revenue: yesterdayAggFinal.revenue,
      aov:     yesterdayAggFinal.aov,
      date:    yesterdayKey,
      vsDayBefore: {
        orders:  delta(yesterdayAggFinal.orders,  dayBeforeAggFinal.orders),
        revenue: delta(yesterdayAggFinal.revenue, dayBeforeAggFinal.revenue),
        aov:     delta(yesterdayAggFinal.aov,     dayBeforeAggFinal.aov),
      },
      allStatuses: {
        orders:  yesterdayAggAllStatus.orders,
        revenue: yesterdayAggAllStatus.revenue,
        aov:     yesterdayAggAllStatus.aov,
        vsDayBefore: {
          orders:  delta(yesterdayAggAllStatus.orders,  dayBeforeAggAllStatus.orders),
          revenue: delta(yesterdayAggAllStatus.revenue, dayBeforeAggAllStatus.revenue),
          aov:     delta(yesterdayAggAllStatus.aov,     dayBeforeAggAllStatus.aov),
        },
      },
      _skippedRows: yesterdayAggFinal._skippedRows,
    },
    mtd: {
      orders:  mtdAggFinal.orders,
      revenue: mtdAggFinal.revenue,
      aov:     mtdAggFinal.aov,
      vsLastMonthSameDate: {
        orders:  delta(mtdAggFinal.orders, lastMonthMTDAggFinal.orders),
        revenue: delta(mtdAggFinal.revenue, lastMonthMTDAggFinal.revenue),
        aov:     delta(mtdAggFinal.aov, lastMonthMTDAggFinal.aov),
      },
      _skippedRows: mtdAggFinal._skippedRows,
    },
    ytd: {
      orders:  ytdAggFinal.orders,
      revenue: ytdAggFinal.revenue,
      aov:     ytdAggFinal.aov,
      vsLastFY,
      _skippedRows: ytdAggFinal._skippedRows,
    },
    trend30d,
    trend30dLong,
    mix,
    topStates,
    todaysOrders,
    concerns,
    filters: {
      applied:             summarizeFilterApplied(activeFilter),
      available:           availableFilters,
      defaultStatusFilter: 'realized',
    },
    dataQuality,
  };

  setCache(cacheKey, payload);
  return payload;
}

// ── getFilteredOrders ─────────────────────────────────────────────────────────

/**
 * Return paginated Order[] for the drilldown endpoint.
 * Sorted by date desc, then time desc.
 *
 * @param {Object} [opts]
 * @param {import('./filters').FilterSpec|null} [opts.filterSpec]
 * @param {number} [opts.limit]   - max 500, default 100
 * @param {number} [opts.offset]  - 0-indexed, default 0
 * @param {number|null} [opts.nowMs]
 * @returns {Promise<{ orders: Order[], total: number, hasMore: boolean }>}
 */
async function getFilteredOrders({ filterSpec = null, limit = 100, offset = 0, nowMs = null } = {}) {
  const _nowMs = nowMs != null ? nowMs : Date.now();
  const istNowDate = new Date(_nowMs + IST_OFFSET_MS);

  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 100), 500);
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

  const { ytdOrders, monthOrders } = await fetchAllOrders(istNowDate);
  const allOrders = deduplicateCrossTab(ytdOrders, monthOrders);

  const activeFilter = filterSpec || DEFAULT_FILTER_SPEC;
  const filtered = applyFilters(allOrders, activeFilter);

  // Sort: date desc, time desc
  const { parseTime12h } = require('./aggregations');
  filtered.sort((a, b) => {
    if (a.istDateKey && b.istDateKey) {
      if (b.istDateKey !== a.istDateKey) return b.istDateKey.localeCompare(a.istDateKey);
    } else if (a.istDateKey) return -1;
    else if (b.istDateKey) return 1;
    return parseTime12h(b.time) - parseTime12h(a.time);
  });

  const total = filtered.length;
  const page = filtered.slice(safeOffset, safeOffset + safeLimit);
  const hasMore = safeOffset + safeLimit < total;

  return { orders: page, total, hasMore };
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  getDashboard,
  getFilteredOrders,
  clearCache,
  // Re-exported for backward compatibility (tests import from service path)
  parseDDMMYYYY,
  getISTNow,
  toISTDateKey,
  fyDisplayLabel,
};
