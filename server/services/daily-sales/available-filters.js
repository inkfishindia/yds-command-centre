'use strict';

/**
 * daily-sales/available-filters.js — filter dropdown option builder.
 *
 * Public exports: buildAvailableFilters(allOrders) → filters.available sub-object.
 * Case-normalises printMethods and statuses (Decision #70): map key = lowercased
 * value, display name = first-seen casing. Prevents "DTG"/"dtg" from appearing
 * as two separate chips.
 *
 * DO NOT add: aggregation math (use aggregations.js), fetching (use fetch.js),
 * or filter application logic (use filters.js).
 */

/**
 * Build the set of available filter values from full (unfiltered) Order[].
 *
 * @param {Order[]} allOrders
 * @returns {{
 *   channels: string[], orderTypes: string[], paymentModes: string[],
 *   statuses: string[], printMethods: string[], states: string[]
 * }}
 */
function buildAvailableFilters(allOrders) {
  const channels    = new Map();
  const orderTypes  = new Set();
  const paymentModes = new Map();
  // printMethods and statuses: lower → { displayName, weight }
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

    // statuses — case-normalised, count-weighted
    const stRaw = o.status || '(empty)';
    const stKey = stRaw.toLowerCase();
    if (!statuses.has(stKey)) statuses.set(stKey, { displayName: stRaw, weight: 0 });
    statuses.get(stKey).weight += 1;

    // printMethods — case-normalised, revenue-weighted
    const tagRaw = o.printMethod || '(unknown)';
    const tagKey = tagRaw.toLowerCase();
    if (!printMethods.has(tagKey)) printMethods.set(tagKey, { displayName: tagRaw, weight: 0 });
    printMethods.get(tagKey).weight += rev;

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
    statuses:     Array.from(statuses.values())
      .sort((a, b) => b.weight - a.weight)
      .map(e => e.displayName),
    printMethods: Array.from(printMethods.values())
      .sort((a, b) => b.weight - a.weight)
      .map(e => e.displayName),
    states:       sortByRevDesc(states),
  };
}

module.exports = {
  buildAvailableFilters,
};
