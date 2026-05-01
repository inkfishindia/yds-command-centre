'use strict';

/**
 * parse.js — normalized Order schema + row parser.
 *
 * parseOrder(rawRow) → Order
 * All aggregation helpers operate on Order[], not raw rows.
 *
 * Taxonomy constants and helpers (PRINT_METHOD_MAP, PARTNER_LOOKUP,
 * CHANNEL_GROUP_MAP, getChannelGroup, normalisePrintMethod) live in
 * taxonomy.js and are re-exported here for backward compatibility.
 *
 * Public exports:
 *   PRINT_METHOD_MAP, PARTNER_LOOKUP, CHANNEL_GROUP_MAP (re-exported from taxonomy)
 *   getChannelGroup, normalisePrintMethod (re-exported from taxonomy)
 *   REALIZED_STATUSES, IN_FLIGHT_STATUSES, CANCELLED_STATUSES, DRAFT_STATUSES
 *   statusBucket(rawStatus)
 *   parseDDMMYYYY, toISTDateKey, parseRevenue, normalizeOrderType
 *   parseOrder
 */

const { IST_OFFSET_MS, fyOrdinal } = require('./fy');
const {
  PRINT_METHOD_MAP,
  PARTNER_LOOKUP,
  CHANNEL_GROUP_MAP,
  getChannelGroup,
  normalisePrintMethod,
} = require('./taxonomy');

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
 * Statuses for orders that are placed but not yet fulfilled.
 * @type {Set<string>}
 */
const IN_FLIGHT_STATUSES = new Set([
  'order placed',
  'processing',
]);

/**
 * Statuses for cancelled / returned orders.
 * @type {Set<string>}
 */
const CANCELLED_STATUSES = new Set([
  'cancelled',
  'rto',
  'returned',
  'lost',
]);

/**
 * Statuses for draft / uncommitted orders.
 * @type {Set<string>}
 */
const DRAFT_STATUSES = new Set([
  'draft order',
]);

/**
 * Classify a raw status string into a named bucket.
 * All comparisons are case-insensitive.
 *
 * @param {string} rawStatus
 * @returns {'realized'|'in_flight'|'cancelled'|'draft'|'other'}
 */
function statusBucket(rawStatus) {
  const s = (rawStatus || '').toLowerCase();
  if (REALIZED_STATUSES.has(s))  return 'realized';
  if (IN_FLIGHT_STATUSES.has(s)) return 'in_flight';
  if (CANCELLED_STATUSES.has(s)) return 'cancelled';
  if (DRAFT_STATUSES.has(s))     return 'draft';
  return 'other';
}

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
 * @property {string} gstin               - raw GSTIN value (trimmed)
 * @property {string} partnerOrderNumber  - raw Partner Order Number (trimmed)
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
 * @property {string} printMethod         - canonical first tag from "Tags" col (via normalisePrintMethod)
 * @property {string|null} printMethod2   - canonical second tag, or null if absent
 * @property {string|null} istDateKey     - "YYYY-MM-DD" in IST; null if date unparseable
 * @property {number|null} fyOrdinal      - days since April 1 of FY start (1-indexed)
 * @property {number|null} fyWeek         - FY week number (1-indexed); null if fyOrdinal null
 * @property {boolean} isRealized         - status ∈ REALIZED_STATUSES (case-insensitive)
 * @property {'realized'|'in_flight'|'cancelled'|'draft'|'other'} statusBucket - named bucket for this status
 * @property {'D2C'|'Corporate'|'Partner – DS'|'Partner – Stores'|'Other'} channelGroup - derived from orderType
 * @property {boolean} isB2C
 * @property {boolean} isCorporate
 * @property {boolean} isDS
 * @property {boolean} isStores
 * @property {boolean} isPartner          - isDS || isStores
 * @property {string|null} madeBy         - "Order Made By" trimmed; null if blank
 * @property {boolean} isArun             - madeBy === 'Arun Nair'
 * @property {string|null} accountTier    - from PARTNER_LOOKUP; null if no match
 * @property {null} accountManager        - null until accountManager column added to sheet
 * @property {'high'|'mid'|'low'|'micro'} revenueTier - ≥10k=high, ≥3k=mid, ≥500=low, <500=micro
 * @property {boolean} isB2BClient        - (Manual||Stores) && gstin present
 * @property {boolean} hasPartnerRef      - partnerOrderNumber is non-empty
 * @property {boolean} isTagged           - printMethod !== '(unknown)'
 * @property {boolean} isMadeByBlank      - madeBy === null && isPartner
 * @property {string|null} printMethodRaw - raw first tag string before normalisation; null if blank (used by detectUnknownTags)
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
  const ordType = normalizeOrderType(rawRow['Order Type']);
  const ordFyOrdinal = fyOrdinal(date);

  // ── Tags / print method ─────────────────────────────────────────────────────
  const tagTokens = (rawRow['Tags'] || '').split(',').map(t => t.trim()).filter(Boolean);
  const rawFirstTag = tagTokens[0] ?? null;  // raw first tag, preserved before normalisation
  const pm  = normalisePrintMethod(rawFirstTag ?? '');
  const pm2 = tagTokens[1] ? normalisePrintMethod(tagTokens[1]) : null;

  // ── Segmentation ────────────────────────────────────────────────────────────
  const channelGroup = getChannelGroup(ordType);
  const isB2C        = ordType === 'B2C';
  const isCorporate  = ordType === 'Manual';
  const isDS         = ordType === 'DS';
  const isStores     = ordType === 'Stores';
  const isPartner    = isDS || isStores;

  // ── Staff & partner attribution ─────────────────────────────────────────────
  const madeByRaw = (rawRow['Order Made By'] || '').trim();
  const madeBy    = madeByRaw || null;
  const gstin     = (rawRow['GSTIN'] || '').trim();
  const partnerOrderNumber = (rawRow['Partner Order Number'] || '').trim();

  return {
    orderNumber:       (rawRow['Order #'] || '').trim(),
    date,
    time:              (rawRow['Time'] || '').trim(),
    gstin,
    partnerOrderNumber,
    customer:          (rawRow['Customer'] || '').trim(),
    email:             (rawRow['Email'] || '').trim(),
    phone:             (rawRow['Phone'] || '').trim(),
    orderType:         ordType,
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
    printMethod:       pm,
    printMethod2:      pm2,
    istDateKey:        istKey,
    fyOrdinal:         ordFyOrdinal,
    fyWeek:            ordFyOrdinal != null ? Math.floor((ordFyOrdinal - 1) / 7) + 1 : null,
    isRealized,
    statusBucket:      statusBucket(statusRaw),
    // ── Derived segmentation ─────────────────────────────────────────────────
    channelGroup,
    isB2C,
    isCorporate,
    isDS,
    isStores,
    isPartner,
    madeBy,
    isArun:            madeBy === 'Arun Nair',
    accountTier:       madeBy ? (PARTNER_LOOKUP[madeBy]?.tier ?? null) : null,
    accountManager:    null, // null until accountManager column added to sheet
    // ── Revenue segmentation ─────────────────────────────────────────────────
    revenueTier: (
      isNaN(amount) ? 'micro' :
      amount >= 10000 ? 'high' :
      amount >= 3000  ? 'mid'  :
      amount >= 500   ? 'low'  : 'micro'
    ),
    // ── B2B / data flags ─────────────────────────────────────────────────────
    isB2BClient:       (ordType === 'Manual' || ordType === 'Stores') && !!gstin,
    hasPartnerRef:     !!partnerOrderNumber,
    isTagged:          pm !== '(unknown)',
    isMadeByBlank:     madeBy === null && isPartner,
    printMethodRaw:    rawFirstTag,  // raw first tag before normalisation; null if blank
    // ── Meta ─────────────────────────────────────────────────────────────────
    _sourceTab:        sourceTab || '',
    _raw:              rawRow,
  };
}

module.exports = {
  // Taxonomy constants (new — §4, §8.2, §10.5)
  PRINT_METHOD_MAP,
  PARTNER_LOOKUP,
  CHANNEL_GROUP_MAP,
  // Pure helpers (new)
  getChannelGroup,
  normalisePrintMethod,
  // Existing status taxonomy
  REALIZED_STATUSES,
  IN_FLIGHT_STATUSES,
  CANCELLED_STATUSES,
  DRAFT_STATUSES,
  statusBucket,
  // Existing date/revenue helpers
  parseDDMMYYYY,
  toISTDateKey,
  parseRevenue,
  // Main parser
  parseOrder,
};
