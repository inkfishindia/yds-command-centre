'use strict';

/**
 * data-quality.js — data quality checks on Order[].
 *
 * All functions are pure (no I/O). They operate on Order[] from parse.js.
 */

const { REALIZED_STATUSES } = require('./parse');

/**
 * Detect orders with the same orderNumber appearing more than once
 * within the same source tab.
 *
 * Note: cross-tab duplicates (same order in YTD + month tabs) are expected
 * and handled by cross-tab dedup in index.js. This function only flags
 * intra-tab duplicates (same order appearing twice in the same tab).
 *
 * @param {import('./parse').Order[]} orders
 * @returns {Array<{ orderNumber: string, count: number, sourceTab: string, amounts: number[] }>}
 */
function detectIntraTabDuplicates(orders) {
  // Group by (orderNumber, _sourceTab)
  const map = new Map(); // `${orderNumber}|${sourceTab}` → Order[]
  for (const o of orders) {
    const key = `${o.orderNumber}|${o._sourceTab}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(o);
  }

  const duplicates = [];
  for (const [, group] of map) {
    if (group.length <= 1) continue;
    duplicates.push({
      orderNumber: group[0].orderNumber,
      count:       group.length,
      sourceTab:   group[0]._sourceTab,
      amounts:     group.map(o => isNaN(o.amountWithTax) ? null : Math.round(o.amountWithTax)),
    });
  }
  return duplicates;
}

/**
 * Count orders by acceptanceStatus (case-insensitive).
 * Buckets: accepted, rejected, awaiting, other.
 *
 * @param {import('./parse').Order[]} orders
 * @returns {{ accepted: number, rejected: number, awaiting: number, other: number, total: number }}
 */
function detectAcceptanceMix(orders) {
  let accepted = 0;
  let rejected = 0;
  let awaiting = 0;
  let other = 0;

  for (const o of orders) {
    const s = o.acceptanceStatus.toLowerCase();
    if (s === 'accepted') accepted++;
    else if (s === 'rejected') rejected++;
    else if (s === 'pending' || s === 'awaiting') awaiting++;
    else other++;
  }

  return { accepted, rejected, awaiting, other, total: orders.length };
}

/**
 * Summarize the realized/non-realized split.
 *
 * @param {import('./parse').Order[]} orders
 * @returns {{
 *   realized: number,
 *   total: number,
 *   realizedPct: number,
 *   excludedByStatus: Array<{ status: string, count: number }>
 * }}
 */
function summarizeRealizedRatio(orders) {
  let realized = 0;
  const statusCounts = new Map(); // lower → { displayStatus, count }

  for (const o of orders) {
    if (o.isRealized) {
      realized++;
    } else {
      const lower = o.status.toLowerCase() || '(empty)';
      const display = o.status || '(empty)';
      if (!statusCounts.has(lower)) {
        statusCounts.set(lower, { status: display, count: 0 });
      }
      statusCounts.get(lower).count++;
    }
  }

  const total = orders.length;
  const realizedPct = total > 0 ? Math.round((realized / total) * 1000) / 10 : 0;

  const excludedByStatus = Array.from(statusCounts.values())
    .sort((a, b) => b.count - a.count);

  return { realized, total, realizedPct, excludedByStatus };
}

module.exports = {
  detectIntraTabDuplicates,
  detectAcceptanceMix,
  summarizeRealizedRatio,
};
