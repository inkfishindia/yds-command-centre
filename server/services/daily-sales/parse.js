'use strict';

/**
 * parse.js — normalized Order schema + row parser.
 *
 * parseOrder(rawRow) → Order
 * All aggregation helpers operate on Order[], not raw rows.
 */

const { IST_OFFSET_MS, fyOrdinal } = require('./fy');

/**
 * Statuses that count as "realized" revenue.
 * Case-insensitive match — includes common typo "fullfilled".
 *
 * @type {Set<string>}
 */
const REALIZED_STATUSES = new Set([
  'delivered',
  'fulfilled',
  'fullfilled',            // typo present in source data ("Fullfilled") — accepted per spec
  'partially fulfilled',
  'partially fullfilled',  // partial + typo variant
]);

/**
 * Parse a "DD-MM-YYYY" date string into a Date (UTC midnight).
 * Returns null on bad input — never throws.
 * @param {string|null} str
 * @returns {Date|null}
 */
function parseDDMMYYYY(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10); // 1-based
  const year = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1) return null; // e.g. Feb 30 → Mar 1 sanity check
  return d;
}

/**
 * Convert a UTC Date (from parseDDMMYYYY) to IST YYYY-MM-DD key string.
 * @param {Date} d
 * @returns {string}
 */
function toISTDateKey(d) {
  const istD = new Date(d.getTime() + IST_OFFSET_MS);
  const y = istD.getUTCFullYear();
  const mo = String(istD.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istD.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/**
 * Parse a numeric revenue value from a Sheets cell.
 * Strips ₹, commas, whitespace. Returns NaN on bad input.
 * @param {*} val
 * @returns {number}
 */
function parseRevenue(val) {
  if (val == null || val === '') return NaN;
  const cleaned = String(val).replace(/[₹,\s]/g, '');
  return parseFloat(cleaned);
}

/**
 * Normalize order type — pass through any non-empty trimmed value,
 * collapse blanks to "(unknown)". The set of canonical values is data-defined,
 * not enum-defined: YDS uses B2C / DS / Manual / Stores today, but new
 * categories should auto-surface without code changes.
 * @param {string} raw
 * @returns {string}
 */
function normalizeOrderType(raw) {
  if (!raw) return '(unknown)';
  const trimmed = String(raw).trim();
  return trimmed || '(unknown)';
}

/**
 * Parse a raw Sheets row into a normalized Order object.
 *
 * @typedef {Object} Order
 * @property {string} orderNumber
 * @property {Date|null} date
 * @property {string} time
 * @property {string} customer
 * @property {string} email
 * @property {string} phone
 * @property {string} orderType           - raw trimmed value from sheet (e.g. "B2C", "DS", "Manual", "Stores"); "(unknown)" when blank
 * @property {string} salesChannel
 * @property {Object} shipping            - { name, phone, address, city, state, country, pincode }
 * @property {Object} billing             - { name, phone, address, city, state, country, pincode }
 * @property {number} totalProducts
 * @property {number} totalQuantity
 * @property {number} amountWithTax       - NaN if unparseable
 * @property {string} status              - raw "Status" col (display casing preserved)
 * @property {string} acceptanceStatus    - raw "Acceptance Status"
 * @property {string} paymentMode
 * @property {string} shippingType
 * @property {number} shippingCost
 * @property {string} printMethod         - first tag from "Tags" col
 * @property {string|null} istDateKey     - "YYYY-MM-DD" in IST; null if date unparseable
 * @property {number|null} fyOrdinal      - days since April 1 of FY start (1-indexed)
 * @property {boolean} isRealized         - status ∈ REALIZED_STATUSES (case-insensitive)
 * @property {string} _sourceTab          - which tab this row came from
 * @property {Object} _raw               - original row, for debugging only
 *
 * @param {Object} rawRow   - raw row object from fetchSheet
 * @param {string} sourceTab - e.g. "2027", "April 2026"
 * @returns {Order}
 */
function parseOrder(rawRow, sourceTab) {
  const date = parseDDMMYYYY(rawRow['Date']);
  const istKey = date ? toISTDateKey(date) : null;
  const amount = parseRevenue(rawRow['Total Amount with tax']);
  const statusRaw = (rawRow['Status'] || '').trim();
  const isRealized = REALIZED_STATUSES.has(statusRaw.toLowerCase());
  const firstTag = ((rawRow['Tags'] || '').split(',')[0].trim()) || '(unknown)';

  return {
    orderNumber:       (rawRow['Order #'] || '').trim(),
    date,
    time:              (rawRow['Time'] || '').trim(),
    customer:          (rawRow['Customer'] || '').trim(),
    email:             (rawRow['Email'] || '').trim(),
    phone:             (rawRow['Phone'] || '').trim(),
    orderType:         normalizeOrderType(rawRow['Order Type']),
    salesChannel:      (rawRow['Sales Channel'] || '').trim(),
    shipping: {
      name:     (rawRow['Shipping Name'] || '').trim(),
      phone:    (rawRow['Shipping Phone'] || '').trim(),
      address:  (rawRow['Shipping Address'] || '').trim(),
      city:     (rawRow['Shipping City'] || '').trim(),
      state:    (rawRow['Shipping State'] || '').trim(),
      country:  (rawRow['Shipping Country'] || '').trim(),
      pincode:  (rawRow['Shipping Pincode'] || '').trim(),
    },
    billing: {
      name:     (rawRow['Billing Name'] || '').trim(),
      phone:    (rawRow['Billing Phone'] || '').trim(),
      address:  (rawRow['Billing Address'] || '').trim(),
      city:     (rawRow['Billing City'] || '').trim(),
      state:    (rawRow['Billing State'] || '').trim(),
      country:  (rawRow['Billing Country'] || '').trim(),
      pincode:  (rawRow['Billing Pincode'] || '').trim(),
    },
    totalProducts:     parseInt(rawRow['Total No of Products'], 10) || 0,
    totalQuantity:     parseInt(rawRow['Total Quantity of all the products'], 10) || 0,
    amountWithTax:     amount,
    status:            statusRaw,
    acceptanceStatus:  (rawRow['Acceptance Status'] || '').trim(),
    paymentMode:       (rawRow['Payment Mode'] || '').trim(),
    shippingType:      (rawRow['Shipping Type'] || '').trim(),
    shippingCost:      parseRevenue(rawRow['Shipping Cost']) || 0,
    printMethod:       firstTag,
    istDateKey:        istKey,
    fyOrdinal:         fyOrdinal(date),
    isRealized,
    _sourceTab:        sourceTab || '',
    _raw:              rawRow,
  };
}

module.exports = {
  REALIZED_STATUSES,
  parseDDMMYYYY,
  toISTDateKey,
  parseRevenue,
  parseOrder,
};
