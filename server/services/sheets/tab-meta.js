'use strict';

// tab-meta.js — tab metadata cache + getSheetLink deep-link helper
// Owns: tabMetaCache, getTabMetaCached, setTabMetaCache, getSheetLink
// Depends on: ./client, ./registry, ./resolve-sheet-name
// DO NOT add: main sheet cache (cache.js), CRUD ops (crud.js), domain reads

const { getReadWriteClient } = require('./client');
const { SHEET_REGISTRY, getSpreadsheetId } = require('./registry');
const { resolveSheetName } = require('./resolve-sheet-name');

const TAB_META_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const tabMetaCache = new Map();

function getTabMetaCached(spreadsheetId) {
  const entry = tabMetaCache.get(spreadsheetId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TAB_META_CACHE_TTL) {
    tabMetaCache.delete(spreadsheetId);
    return null;
  }
  return entry.data;
}

function setTabMetaCache(spreadsheetId, data) {
  tabMetaCache.set(spreadsheetId, { data, timestamp: Date.now() });
}

/**
 * Resolve the deep-link URL for a specific tab inside a registered sheet.
 *
 * @param {string} sheetKey - Key in SHEET_REGISTRY (e.g. 'SALES_CURRENT_MONTH')
 * @param {Date|number} [now] - Optional Date forwarded to resolveSheetName for
 *   dynamic tab names (same semantics as fetchSheet's `now` param).
 * @returns {Promise<{url, sheetName, spreadsheetTitle, label}|null>}
 *   null if the spreadsheet is not configured. Throws only on auth errors.
 */
async function getSheetLink(sheetKey, now) {
  const entry = SHEET_REGISTRY[sheetKey];
  if (!entry) throw new Error(`Unknown sheet key: ${sheetKey}`);

  const spreadsheetId = getSpreadsheetId(entry.spreadsheetKey);
  const config = require('../../config');
  if (!spreadsheetId || !config.GOOGLE_SERVICE_ACCOUNT_KEY) return null;

  const resolvedSheetName = resolveSheetName(entry, now);

  // Check cache for tab list per spreadsheetId
  let tabList = getTabMetaCached(spreadsheetId);

  if (!tabList) {
    // Fetch spreadsheet metadata (title + all tabs) from Sheets API
    const client = getReadWriteClient();
    if (!client) return null;

    try {
      const response = await client.spreadsheets.get({
        spreadsheetId,
        fields: 'properties.title,sheets.properties',
      });
      tabList = {
        title: (response.data.properties || {}).title || '',
        sheets: (response.data.sheets || []).map(s => ({
          title: (s.properties || {}).title || '',
          sheetId: (s.properties || {}).sheetId,
        })),
      };
      setTabMetaCache(spreadsheetId, tabList);
    } catch (err) {
      console.warn(`[sheets] getSheetLink("${sheetKey}") metadata fetch failed:`, err.message);
      return null;
    }
  }

  // Find the tab by resolved name
  const tab = tabList.sheets.find(s => s.title === resolvedSheetName);
  let gid;
  if (tab) {
    gid = tab.sheetId;
  } else {
    // Fall back to gid=0 (first tab) but warn
    console.warn(`[sheets] getSheetLink("${sheetKey}"): tab "${resolvedSheetName}" not found — falling back to gid=0`);
    gid = 0;
  }

  return {
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${gid}`,
    sheetName: resolvedSheetName,
    spreadsheetTitle: tabList.title,
    label: entry.label || resolvedSheetName,
  };
}

function clearTabMetaCache() {
  tabMetaCache.clear();
}

module.exports = { tabMetaCache, getTabMetaCached, setTabMetaCache, clearTabMetaCache, getSheetLink };
