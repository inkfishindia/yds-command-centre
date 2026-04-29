'use strict';

/**
 * filters.js — FilterSpec definition, parser, and order filter applier.
 *
 * All functions are pure (no I/O).
 *
 * @typedef {Object} FilterSpec
 * @property {string|null} from       - "YYYY-MM-DD" inclusive (IST); null = no lower bound
 * @property {string|null} to         - "YYYY-MM-DD" inclusive (IST); null = no upper bound
 * @property {string[]} channels      - empty = all
 * @property {string} orderType       - "all" | any value present in the sheet's Order Type column (e.g. "B2C", "DS", "Manual", "Stores")
 * @property {string} paymentMode     - "all" | specific value
 * @property {string} status          - "realized" | "all" | specific Status value
 * @property {string} state           - empty = all
 * @property {string} printMethod     - empty = all
 */

/**
 * Default FilterSpec — realized orders only, no other constraints.
 * @type {FilterSpec}
 */
const DEFAULT_FILTER_SPEC = {
  from:        null,
  to:          null,
  channels:    [],
  orderType:   'all',
  paymentMode: 'all',
  status:      'realized',
  state:       '',
  printMethod: '',
};

/**
 * Parse a FilterSpec from Express req.query.
 * Unknown/missing keys fall back to defaults.
 * @param {Object} query    - req.query
 * @param {FilterSpec} [defaults]
 * @returns {FilterSpec}
 */
function parseFilterSpec(query, defaults) {
  const d = Object.assign({}, DEFAULT_FILTER_SPEC, defaults || {});

  // Date range
  const from = typeof query.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.from)
    ? query.from : d.from;
  const to = typeof query.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.to)
    ? query.to : d.to;

  // channels: comma-separated string or array
  let channels = d.channels;
  if (query.channels) {
    const raw = Array.isArray(query.channels) ? query.channels : [query.channels];
    channels = raw.flatMap(c => c.split(',')).map(c => c.trim()).filter(Boolean);
  }

  // orderType: pass through any non-empty trimmed value (case-insensitive match
  // applied later in applyFilters). YDS canonical values are B2C/DS/Manual/Stores
  // but the parser is data-defined, not enum-defined.
  let orderType;
  if (typeof query.orderType !== 'string' || query.orderType.trim() === '') {
    orderType = d.orderType;
  } else {
    const t = query.orderType.trim();
    orderType = t.toLowerCase() === 'all' ? 'all' : t;
  }
  const paymentMode = typeof query.paymentMode === 'string' ? query.paymentMode : d.paymentMode;
  const status = typeof query.status === 'string' ? query.status : d.status;
  const state = typeof query.state === 'string' ? query.state : d.state;
  const printMethod = typeof query.printMethod === 'string' ? query.printMethod : d.printMethod;

  return { from, to, channels, orderType, paymentMode, status, state, printMethod };
}

/**
 * Validate a FilterSpec — returns array of error strings (empty = valid).
 * @param {FilterSpec} spec
 * @returns {string[]}
 */
function validateFilterSpec(spec) {
  const errors = [];
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (spec.from && !dateRe.test(spec.from)) errors.push('`from` must be YYYY-MM-DD');
  if (spec.to && !dateRe.test(spec.to)) errors.push('`to` must be YYYY-MM-DD');
  if (spec.from && spec.to && spec.from > spec.to) errors.push('`from` must be ≤ `to`');
  return errors;
}

/**
 * Apply a FilterSpec to an Order[].
 * Returns a new array — does not mutate input.
 *
 * @param {import('./parse').Order[]} orders
 * @param {FilterSpec} spec
 * @returns {import('./parse').Order[]}
 */
function applyFilters(orders, spec) {
  if (!orders || orders.length === 0) return [];
  if (!spec) return orders;

  return orders.filter(order => {
    // Date range (using istDateKey for IST-correct bucketing)
    if (spec.from && order.istDateKey && order.istDateKey < spec.from) return false;
    if (spec.to && order.istDateKey && order.istDateKey > spec.to) return false;
    // Orders with no parseable date are included unless a date range is set
    if ((spec.from || spec.to) && !order.istDateKey) return false;

    // Sales channels (case-insensitive)
    if (spec.channels && spec.channels.length > 0) {
      const orderChannel = order.salesChannel.toLowerCase();
      const match = spec.channels.some(c => c.toLowerCase() === orderChannel);
      if (!match) return false;
    }

    // Order type (case-insensitive)
    if (spec.orderType && spec.orderType !== 'all') {
      if ((order.orderType || '').toLowerCase() !== spec.orderType.toLowerCase()) return false;
    }

    // Payment mode
    if (spec.paymentMode && spec.paymentMode !== 'all') {
      if (order.paymentMode.toLowerCase() !== spec.paymentMode.toLowerCase()) return false;
    }

    // Status filter
    if (spec.status && spec.status !== 'all') {
      if (spec.status === 'realized') {
        if (!order.isRealized) return false;
      } else {
        // Specific status value — case-insensitive match
        if (order.status.toLowerCase() !== spec.status.toLowerCase()) return false;
      }
    }

    // State (shipping state)
    if (spec.state) {
      if (order.shipping.state.toLowerCase() !== spec.state.toLowerCase()) return false;
    }

    // Print method (first tag)
    if (spec.printMethod) {
      if (order.printMethod.toLowerCase() !== spec.printMethod.toLowerCase()) return false;
    }

    return true;
  });
}

/**
 * Build a summary of the applied filter for inclusion in the response payload.
 * @param {FilterSpec} spec
 * @returns {FilterSpec}
 */
function summarizeFilterApplied(spec) {
  // Return the spec as-is for now — frontend can display it
  return Object.assign({}, spec);
}

module.exports = {
  DEFAULT_FILTER_SPEC,
  parseFilterSpec,
  validateFilterSpec,
  applyFilters,
  summarizeFilterApplied,
};
