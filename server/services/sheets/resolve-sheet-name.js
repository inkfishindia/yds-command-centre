'use strict';

// resolve-sheet-name.js — dynamic sheetName resolver for registry entries
// Owns: resolveSheetName(entry, now)
// Depends on: nothing (leaf — pure helper)
// DO NOT add: registry data, client, cache

/**
 * Resolves a registry entry's sheetName, which may be a plain string or a
 * function `(now: Date) => string`. Returns the resolved string.
 *
 * @param {object} entry  - SHEET_REGISTRY entry
 * @param {Date|number} [now] - Optional Date (or ms epoch) to use as "now".
 *   Defaults to `new Date()` (server local time). Pass an IST-adjusted Date
 *   when the resolved name depends on the Indian calendar month.
 */
function resolveSheetName(entry, now) {
  if (typeof entry.sheetName === 'function') {
    const d = now instanceof Date ? now : (now != null ? new Date(now) : new Date());
    return entry.sheetName(d);
  }
  return entry.sheetName;
}

module.exports = { resolveSheetName };
