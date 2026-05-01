'use strict';

/**
 * taxonomy.js — taxonomy lookups + canonicalisation helpers.
 *
 * Pure data + pure functions. No I/O, no parsing, no aggregation.
 *
 * Public exports:
 *   PRINT_METHOD_MAP     — lowercase raw tag → canonical print method name
 *   PARTNER_LOOKUP       — madeBy exact-match → { tier } for named partners
 *   CHANNEL_GROUP_MAP    — orderType → channelGroup label
 *   getChannelGroup(orderType) → 'D2C' | 'Corporate' | 'Partner – DS' | 'Partner – Stores' | 'Other'
 *   normalisePrintMethod(raw) → canonical print method string or '(unknown)'
 *
 * DO NOT add: I/O, parsing logic, status taxonomy, date helpers.
 * Status taxonomy (REALIZED_STATUSES etc.) belongs in parse.js.
 */

// ── Taxonomy constants ─────────────────────────────────────────────────────────

/**
 * Maps lowercase raw tag values to canonical print method names.
 * Source: Master Spec §10.2 + §10.5.
 * @type {Object<string, string>}
 */
const PRINT_METHOD_MAP = {
  'dtg':                                 'DTG',
  'dtf':                                 'DTF',
  'screenprint':                         'Screenprint',
  'screen print':                        'Screenprint',
  'print: water based screen print':     'Screenprint',
  'products -1 screen print':            'Screenprint',
  'screenprint tees':                    'Screenprint',
  'embroidery':                          'Embroidery',
  'front puff':                          'Puff',
  'puff':                                'Puff',
};

/**
 * Named partner accounts — keyed by exact `Order Made By` value.
 * Source: Master Spec §8.2 (_Partners tab).
 * When a new partner is onboarded, add them here and to the _Partners sheet tab.
 * @type {Object<string, { tier: string }>}
 */
const PARTNER_LOOKUP = {
  'Ather Basics Store':                 { tier: 'Platinum' },
  'Ather Uniform Store':                { tier: 'Platinum' },
  'Morgan Stanley Employee Swag Store': { tier: 'Platinum' },
  'Zatags Lifestyles Pvt Ltd':          { tier: 'Gold'     },
  'Zondag Inc':                         { tier: 'Gold'     },
  'THE UNDEAD REVOLUTION':              { tier: 'Silver'   },
  'Doodleodrama':                       { tier: 'Silver'   },
};

/**
 * Maps orderType to channelGroup label.
 * Source: Master Spec §4.
 * @type {Object<string, string>}
 */
const CHANNEL_GROUP_MAP = {
  'B2C':    'D2C',
  'Manual': 'Corporate',
  'DS':     'Partner – DS',
  'Stores': 'Partner – Stores',
};

// ── Pure helpers ───────────────────────────────────────────────────────────────

/**
 * Derive the Channel Group from orderType.
 * Source: Master Spec §4.
 * @param {string} orderType
 * @returns {'D2C'|'Corporate'|'Partner – DS'|'Partner – Stores'|'Other'}
 */
function getChannelGroup(orderType) {
  return CHANNEL_GROUP_MAP[orderType] ?? 'Other';
}

/**
 * Normalise a raw tag string to a canonical print method value.
 * Trims, lowercases, maps via PRINT_METHOD_MAP.
 * Returns '(unknown)' on blank or unmapped input.
 * Source: Master Spec §10.5.
 * @param {string|null|undefined} raw
 * @returns {string}
 */
function normalisePrintMethod(raw) {
  if (!raw || !raw.trim()) return '(unknown)';
  return PRINT_METHOD_MAP[raw.trim().toLowerCase()] ?? '(unknown)';
}

module.exports = {
  PRINT_METHOD_MAP,
  PARTNER_LOOKUP,
  CHANNEL_GROUP_MAP,
  getChannelGroup,
  normalisePrintMethod,
};
