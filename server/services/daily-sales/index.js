'use strict';

/**
 * daily-sales/index.js — public entry shim.
 *
 * Public exports: getDashboard, getFilteredOrders, clearCache.
 * Also re-exports helpers used in tests: parseDDMMYYYY, getISTNow, toISTDateKey, fyDisplayLabel.
 *
 * Owns: public exports + backward-compat signature normalization. Nothing else.
 * DO NOT add: any business logic. If you're tempted, you want a different file.
 *   Business logic → dashboard-builder.js
 *   Cache → cache.js
 *   Fetch + dedup → fetch.js
 *   Filter options → available-filters.js
 */

const { clearCache } = require('./cache');
const { buildDashboard, buildFilteredOrders } = require('./dashboard-builder');
const { parseDDMMYYYY, toISTDateKey } = require('./parse');
const { getISTNow, fyDisplayLabel } = require('./fy');

// Clear the in-memory cache on every module load. In production this runs once
// at server startup and is a no-op. In tests, clearMocks() deletes index.js
// from require.cache so each test describe block gets a fresh cache, preserving
// the same isolation semantics the original single-file module provided.
clearCache();

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
  return buildDashboard({ filterSpec, nowMs });
}

/**
 * Return paginated Order[] for the drilldown endpoint.
 *
 * @param {Object} [opts]
 * @param {import('./filters').FilterSpec|null} [opts.filterSpec]
 * @param {number} [opts.limit]
 * @param {number} [opts.offset]
 * @param {number|null} [opts.nowMs]
 * @returns {Promise<{ orders: Order[], total: number, hasMore: boolean }>}
 */
async function getFilteredOrders(opts) {
  return buildFilteredOrders(opts || {});
}

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
