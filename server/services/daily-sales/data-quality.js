'use strict';

/**
 * data-quality.js — data quality checks on Order[].
 *
 * Existing diagnostics:
 *   detectIntraTabDuplicates(orders)
 *   detectAcceptanceMix(orders)
 *   summarizeRealizedRatio(orders)
 *
 * New diagnostics (Pass 2 — Master Spec §16 / UI Spec §12):
 *   detectTagCoverage(orders)
 *   detectUnknownTags(orders)
 *   detectUnattributedPartnerOrders(orders)
 *   detectUnexpectedStatusCombinations(orders)
 */

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

// ── New diagnostics (Pass 2 — Master Spec §16 / UI Spec §12) ─────────────────

/**
 * Tag coverage report: how many orders have a recognised print method tag.
 * `tagged` = orders where isTagged === true (printMethod !== '(unknown)').
 *
 * @param {import('./parse').Order[]} orders
 * @returns {{
 *   overall: { tagged: number, total: number, pct: number },
 *   byOrderType: {
 *     B2C:     { tagged: number, total: number, pct: number },
 *     DS:      { tagged: number, total: number, pct: number },
 *     Manual:  { tagged: number, total: number, pct: number },
 *     Stores:  { tagged: number, total: number, pct: number }
 *   }
 * }}
 */
function detectTagCoverage(orders) {
  const TRACKED_TYPES = ['B2C', 'DS', 'Manual', 'Stores'];

  const totals = { overall: { tagged: 0, total: 0 } };
  for (const t of TRACKED_TYPES) totals[t] = { tagged: 0, total: 0 };

  for (const o of orders) {
    totals.overall.total += 1;
    if (o.isTagged) totals.overall.tagged += 1;

    if (TRACKED_TYPES.includes(o.orderType)) {
      totals[o.orderType].total += 1;
      if (o.isTagged) totals[o.orderType].tagged += 1;
    }
  }

  function pct(t, tot) { return tot === 0 ? 0 : Math.round((t / tot) * 100); }

  const byOrderType = {};
  for (const t of TRACKED_TYPES) {
    const { tagged, total } = totals[t];
    byOrderType[t] = { tagged, total, pct: pct(tagged, total) };
  }

  return {
    overall: {
      tagged:  totals.overall.tagged,
      total:   totals.overall.total,
      pct:     pct(totals.overall.tagged, totals.overall.total),
    },
    byOrderType,
  };
}

/**
 * Find raw tag values that failed to normalise (i.e. printMethodRaw is present
 * but normalisePrintMethod maps it to '(unknown)').
 * Groups by raw value (case-insensitive), returns sorted desc by count.
 *
 * Requires o.printMethodRaw to be set on each Order (added in parseOrder Pass 2).
 *
 * @param {import('./parse').Order[]} orders
 * @returns {Array<{ raw: string, count: number }>}
 */
function detectUnknownTags(orders) {
  // Lazy-require normalisePrintMethod to honour live require.cache mock state
  const { normalisePrintMethod } = require('./taxonomy');

  const map = new Map(); // lower → { raw, count }
  for (const o of orders) {
    if (!o.printMethodRaw) continue;
    if (normalisePrintMethod(o.printMethodRaw) !== '(unknown)') continue;
    const key = o.printMethodRaw.toLowerCase();
    if (!map.has(key)) map.set(key, { raw: o.printMethodRaw, count: 0 });
    map.get(key).count += 1;
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/**
 * Count orders where Made By is blank for a Partner order (isMadeByBlank === true).
 *
 * @param {import('./parse').Order[]} orders
 * @returns {number}
 */
function detectUnattributedPartnerOrders(orders) {
  return orders.filter(o => o.isMadeByBlank === true).length;
}

/**
 * Flag orders violating semantic status × acceptance-status combinations.
 * Based on violation rules (not whitelist) per Master Spec §7.
 *
 * Rules:
 *   1. Realized status + acceptanceStatus !== 'accepted' → unexpected
 *   2. Cancelled status + acceptanceStatus === 'awaiting' → unexpected
 *   3. status === 'Draft Order' + acceptanceStatus === 'accepted' → unexpected
 *
 * Returns up to 50 violations.
 *
 * @param {import('./parse').Order[]} orders
 * @returns {Array<{ orderNumber: string, status: string, acceptanceStatus: string }>}
 */
function detectUnexpectedStatusCombinations(orders) {
  const REALIZED_BUCKET = new Set(['realized']);
  const CANCELLED_BUCKET = new Set(['cancelled']);

  const violations = [];
  for (const o of orders) {
    if (violations.length >= 50) break;
    const accLower = (o.acceptanceStatus || '').toLowerCase();
    const bucket = o.statusBucket;

    let flagged = false;

    // Rule 1: Realized but not accepted
    if (REALIZED_BUCKET.has(bucket) && accLower !== 'accepted') flagged = true;

    // Rule 2: Cancelled but still awaiting acceptance
    if (!flagged && CANCELLED_BUCKET.has(bucket) && accLower === 'awaiting') flagged = true;

    // Rule 3: Draft Order but accepted
    if (!flagged && o.status.toLowerCase() === 'draft order' && accLower === 'accepted') flagged = true;

    if (flagged) {
      violations.push({
        orderNumber:      o.orderNumber,
        status:           o.status,
        acceptanceStatus: o.acceptanceStatus,
      });
    }
  }
  return violations;
}

module.exports = {
  detectIntraTabDuplicates,
  detectAcceptanceMix,
  summarizeRealizedRatio,
  detectTagCoverage,
  detectUnknownTags,
  detectUnattributedPartnerOrders,
  detectUnexpectedStatusCombinations,
};
