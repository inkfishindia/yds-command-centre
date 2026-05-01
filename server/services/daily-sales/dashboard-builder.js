'use strict';

/**
 * daily-sales/dashboard-builder.js — payload composition orchestrator.
 *
 * Public exports:
 *   buildDashboard({ filterSpec, nowMs }) → composed dashboard payload
 *   buildFilteredOrders({ filterSpec, limit, offset, nowMs }) → paginated Order[]
 *
 * This is the single place where the response shape is decided. It calls into
 * fetch, cache, filters, aggregations, available-filters, and data-quality to
 * assemble the payload — it does not implement those concerns itself.
 *
 * DO NOT add: low-level data access, pure aggregation helpers, or filter logic.
 * Those belong in their own files; this file orchestrates.
 */

const { IST_OFFSET_MS, getISTNow, lastDayOfMonth, fyDisplayLabel, fyMonthIndex } = require('./fy');
const { applyFilters, DEFAULT_FILTER_SPEC, summarizeFilterApplied, resolveStatusList } = require('./filters');
const {
  aggregate, delta,
  buildMix, buildTrend30d, buildTrend30dLong,
  buildConcerns, buildTopStates, buildTodaysOrders, buildWeeklyTrend,
  parseTime12h,
} = require('./aggregations');
const {
  detectIntraTabDuplicates,
  detectAcceptanceMix,
  summarizeRealizedRatio,
  detectTagCoverage,
  detectUnknownTags,
  detectUnattributedPartnerOrders,
  detectUnexpectedStatusCombinations,
} = require('./data-quality');
const { buildCacheKey, getCached, setCache } = require('./cache');
const { fetchAllOrders, deduplicateCrossTab } = require('./fetch');
const { buildAvailableFilters } = require('./available-filters');

// Channel group labels in fixed display order — all four always appear in mtdByChannel
const CHANNEL_GROUPS = ['D2C', 'Corporate', 'Partner – DS', 'Partner – Stores'];

/**
 * Compose and return the full daily-sales dashboard payload.
 *
 * @param {Object} [opts]
 * @param {import('./filters').FilterSpec|null} [opts.filterSpec]
 * @param {number|null} [opts.nowMs]
 * @returns {Promise<Object>}
 */
async function buildDashboard({ filterSpec = null, nowMs = null } = {}) {
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
  const _todayAgg = aggregate(todayOrdersAll);
  const _yesterdayAgg = aggregate(yesterdayOrdersAll);

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

  const _mtdAgg = aggregate(mtdOrders);
  const _lastMonthMTDAgg = aggregate(lastMonthMTDOrders);

  // ── YTD ──────────────────────────────────────────────────────────────────────

  const _ytdAgg = aggregate(allOrders);

  // ── Apply financial filter ────────────────────────────────────────────────────
  // Financial aggregations (today, MTD, YTD, trend, mix, topStates) are computed
  // on filter-applied orders. Status mix breakdown uses UNFILTERED sourceOrders
  // so it remains diagnostic regardless of filter.

  const todayAggFinal = aggregate(applyFilters(todayOrdersAll, activeFilter));
  const yesterdayAggFinal = aggregate(applyFilters(yesterdayOrdersAll, activeFilter));
  const dayBeforeAggFinal = aggregate(applyFilters(dayBeforeOrdersAll, activeFilter));
  const mtdAggFinal = aggregate(applyFilters(mtdOrders, activeFilter));
  const lastMonthMTDAggFinal = aggregate(applyFilters(lastMonthMTDOrders, activeFilter));
  const ytdAggFinal = aggregate(applyFilters(allOrders, activeFilter));

  // ── MTD by Channel Group ───────────────────────────────────────────────────
  // Group the filter-applied MTD orders by channelGroup. All four groups always
  // appear (empty ones get zeros) so the frontend can render four cards unconditionally.
  const mtdFiltered = applyFilters(mtdOrders, activeFilter);
  const mtdByChannel = {};
  for (const group of CHANNEL_GROUPS) {
    // Destructure to strip _skippedRows — UI Spec §10 shape has only orders/revenue/aov
    const { _skippedRows: _sr, ...groupAgg } = aggregate(mtdFiltered.filter(o => o.channelGroup === group));
    mtdByChannel[group] = groupAgg;
  }

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
    realized:                    realizedRatio.realized,
    total:                       realizedRatio.total,
    realizedPct:                 realizedRatio.realizedPct,
    excludedByStatus:            realizedRatio.excludedByStatus,
    duplicates:                  intraDups,
    acceptanceMix,
    // New — Master Spec §16 / UI Spec §12
    tagCoverage:                 detectTagCoverage(allOrders),
    unknownTags:                 detectUnknownTags(allOrders),
    unattributedPartnerOrders:   detectUnattributedPartnerOrders(allOrders),
    unexpectedStatusCombinations: detectUnexpectedStatusCombinations(allOrders),
  };

  // ── Weekly Trend ──────────────────────────────────────────────────────────────

  const weeklyTrend = buildWeeklyTrend(applyFilters(allOrders, activeFilter), _nowMs);

  // ── Available filter options ──────────────────────────────────────────────────

  const availableFilters = buildAvailableFilters(allOrders);

  // ── Compose payload ───────────────────────────────────────────────────────────

  const { getSpreadsheetId } = require('../sheets');
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
    /**
     * mtdByChannel — MTD aggregations grouped by Channel Group.
     * Shape per Master Spec §13.2. All four groups always present (zeros for empty).
     * Source: applyFilters(mtdOrders, activeFilter) grouped by o.channelGroup.
     */
    mtdByChannel,
    ytd: {
      orders:  ytdAggFinal.orders,
      revenue: ytdAggFinal.revenue,
      aov:     ytdAggFinal.aov,
      vsLastFY,
      _skippedRows: ytdAggFinal._skippedRows,
    },
    trend30d,
    trend30dLong,
    weeklyTrend,
    mix,
    topStates,
    todaysOrders,
    concerns,
    filters: {
      applied:             summarizeFilterApplied(activeFilter),
      available:           availableFilters,
      defaultStatusFilter: 'realized',
      appliedStatusList:   resolveStatusList(activeFilter, allOrders),
    },
    dataQuality,
  };

  setCache(cacheKey, payload);
  return payload;
}

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
async function buildFilteredOrders({ filterSpec = null, limit = 100, offset = 0, nowMs = null } = {}) {
  const _nowMs = nowMs != null ? nowMs : Date.now();
  const istNowDate = new Date(_nowMs + IST_OFFSET_MS);

  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 100), 500);
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

  const { ytdOrders, monthOrders } = await fetchAllOrders(istNowDate);
  const allOrders = deduplicateCrossTab(ytdOrders, monthOrders);

  const activeFilter = filterSpec || DEFAULT_FILTER_SPEC;
  const filtered = applyFilters(allOrders, activeFilter);

  // Sort: date desc, time desc
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

module.exports = {
  buildDashboard,
  buildFilteredOrders,
};
