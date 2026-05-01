'use strict';

// index.js — public re-export shim for server/services/sheets package
// Owns: module.exports for all 16 public exports. No logic.
// Depends on: all sibling files (re-export only)
// DO NOT add: business logic, cache infra, domain reads. Everything belongs in a sibling.

const { getPipelineData } = require('./pipeline');
const { getStrategyCascade } = require('./strategy-cascade');
const { isConfigured } = require('./client');
const { clearCache: clearMainCache } = require('./cache');
const { SHEET_REGISTRY, SPREADSHEET_KEYS, isSpreadsheetConfigured, getSpreadsheetId } = require('./registry');
const { fetchSheet, appendRow, updateRow, deleteRow, getSheetHeaders } = require('./crud');
const { parseRows } = require('./parse-rows');
const { resolveSheetName } = require('./resolve-sheet-name');
const { clearTabMetaCache, getSheetLink } = require('./tab-meta');

// Clear both caches on every module load. In production this is a no-op (runs once
// at startup). In tests, the harness deletes sheets.js (the shim) from require.cache
// between describe blocks; this file stays cached, so the clear below is NOT
// re-invoked automatically. However, tests that delete SHEETS_PATH and re-require
// sheets.js will re-run the shim, which calls require('./sheets/index'). If index.js
// is still cached, this line does not re-run — which is the known limitation of this
// split pattern. The tabMetaCache stale issue is handled by clearCache() being
// available for callers to invoke explicitly, and by client.js / registry.js
// reading config lazily at call time (Decision #73).
clearMainCache();
clearTabMetaCache();

/**
 * Combined clearCache — clears both the main 5-min sheet cache and the
 * 1-hour tab-metadata cache. Called by tests and manual cache invalidation.
 */
function clearCache() {
  clearMainCache();
  clearTabMetaCache();
}

module.exports = {
  // Domain reads
  getPipelineData,
  getStrategyCascade,
  // Config
  isConfigured,
  clearCache,
  // Registry
  SHEET_REGISTRY,
  SPREADSHEET_KEYS,
  isSpreadsheetConfigured,
  getSpreadsheetId,
  // CRUD
  fetchSheet,
  appendRow,
  updateRow,
  deleteRow,
  getSheetHeaders,
  // Helpers
  parseRows,
  resolveSheetName,
  // Deep-link
  getSheetLink,
};
