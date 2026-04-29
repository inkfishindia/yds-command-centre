'use strict';

/**
 * FY / IST helpers — pure date math, no I/O.
 *
 * Indian FY: April 1 – March 31.
 * Tab names are keyed by FY end-year (e.g. FY 26-27 → "2027").
 * All day/month bucketing done in IST (UTC+5:30).
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

/**
 * Returns a Date representing "now" in IST.
 * We shift the UTC epoch by IST offset so getUTCFullYear/Month/Date
 * read IST wall-clock values.
 * @param {number|null} nowMs  - epoch ms; defaults to Date.now()
 * @returns {Date}
 */
function getISTNow(nowMs) {
  return new Date((nowMs != null ? nowMs : Date.now()) + IST_OFFSET_MS);
}

/**
 * Returns last day of a given month.
 * @param {number} year
 * @param {number} month0  - 0-based JS month
 * @returns {number}
 */
function lastDayOfMonth(year, month0) {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/**
 * Convert an FY end-year string (e.g. "2027") to a human-readable label
 * like "FY 26-27". Falls back to the raw string if not a valid integer.
 * @param {string} endYearStr
 * @returns {string}
 */
function fyDisplayLabel(endYearStr) {
  const endYear = parseInt(endYearStr, 10);
  if (!Number.isFinite(endYear)) return endYearStr;
  const startYear = endYear - 1;
  const ss = String(startYear).slice(-2);
  const ee = String(endYear).slice(-2);
  return `FY ${ss}-${ee}`;
}

/**
 * FY month index: April = 0, May = 1, ..., March = 11.
 * @param {number} month0  - 0-based JS month
 * @returns {number}
 */
function fyMonthIndex(month0) {
  return month0 >= 3 ? month0 - 3 : month0 + 9;
}

/**
 * Days since April 1 of the FY start year (1-indexed).
 * Returns null if date is null.
 * @param {Date|null} utcDate  - from parseDDMMYYYY (UTC midnight)
 * @returns {number|null}
 */
function fyOrdinal(utcDate) {
  if (!utcDate) return null;
  const ist = new Date(utcDate.getTime() + IST_OFFSET_MS);
  const month0 = ist.getUTCMonth();
  const year = ist.getUTCFullYear();
  const day = ist.getUTCDate();
  // FY start year: if month >= 3 (April+), same year; else year - 1
  const fyStartYear = month0 >= 3 ? year : year - 1;
  const fyStart = Date.UTC(fyStartYear, 3, 1); // April 1 UTC
  const orderUTC = Date.UTC(year, month0, day);
  return Math.floor((orderUTC - fyStart) / 86400000) + 1; // 1-indexed
}

module.exports = {
  IST_OFFSET_MS,
  getISTNow,
  lastDayOfMonth,
  fyDisplayLabel,
  fyMonthIndex,
  fyOrdinal,
};
