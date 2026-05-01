'use strict';

/**
 * daily-sales/fetch.js — Sheets fetch + deduplication.
 *
 * Public exports: fetchAllOrders, deduplicateIntraTab, deduplicateCrossTab.
 * Reads three tabs (YTD, current month, last FY) and applies intra-tab dedup.
 * Blank Order# rows bypass the dedup map (each is treated as unique — Decision #71).
 *
 * DO NOT add: aggregation math, payload shaping, or cache logic.
 * Aggregation belongs in aggregations.js; payload assembly in dashboard-builder.js.
 *
 * Note: ../sheets is required lazily inside fetchAllOrders so that test mocks
 * injected into require.cache are always picked up on each call, regardless of
 * whether this module was previously cached.
 */

const { parseOrder } = require('./parse');

/**
 * Fetch raw rows from all three tabs and return Order[] per tab.
 * Applies intra-tab dedup before returning.
 *
 * @param {Date} istNowDate  - IST-shifted Date for resolving tab names
 * @returns {Promise<{
 *   ytdOrders: Order[], monthOrders: Order[], lastFYOrders: Order[],
 *   ytdAvailable: boolean, monthTabAvailable: boolean, lastFYAvailable: boolean,
 *   ytdTabName: string, lastFYTabName: string, currentMonthTabName: string,
 *   monthResult: Object
 * }>}
 */
async function fetchAllOrders(istNowDate) {
  // Lazy require so test mocks injected into require.cache are always honoured,
  // even when this module itself is cached across test runs.
  const { fetchSheet, resolveSheetName, SHEET_REGISTRY } = require('../sheets');

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
 * Rows with blank orderNumber bypass the dedup map (each is treated as unique).
 * @param {Order[]} orders
 * @returns {Order[]}
 */
function deduplicateIntraTab(orders) {
  const seen = new Map();
  const blanks = [];
  for (const o of orders) {
    if (!o.orderNumber) {
      blanks.push(o); // blank order# — pass through as-is (each is unique)
    } else {
      seen.set(o.orderNumber, o); // last wins
    }
  }
  return [...Array.from(seen.values()), ...blanks];
}

/**
 * Cross-tab dedup: merge ytdOrders + monthOrders, month wins on overlap.
 * Rows with blank orderNumber bypass the dedup map (each is treated as unique).
 * @param {Order[]} ytdOrders
 * @param {Order[]} monthOrders
 * @returns {Order[]}
 */
function deduplicateCrossTab(ytdOrders, monthOrders) {
  const seen = new Map();
  const blanks = [];
  // YTD first, month second → month wins (last write wins)
  for (const o of ytdOrders) {
    if (!o.orderNumber) blanks.push(o);
    else seen.set(o.orderNumber, o);
  }
  for (const o of monthOrders) {
    if (!o.orderNumber) blanks.push(o);
    else seen.set(o.orderNumber, o);
  }
  return [...Array.from(seen.values()), ...blanks];
}

module.exports = {
  fetchAllOrders,
  deduplicateIntraTab,
  deduplicateCrossTab,
};
