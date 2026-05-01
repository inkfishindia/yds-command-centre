'use strict';

// crud.js — sheet CRUD operations: getSheetHeaders, fetchSheet, appendRow, updateRow, deleteRow
// Owns: getSheetHeaders, fetchSheet, appendRow, updateRow, deleteRow
// Depends on: ./cache, ./client, ./registry, ./resolve-sheet-name, ./parse-rows
// DO NOT add: domain-level reads (pipeline.js, strategy-cascade.js), tab-meta (tab-meta.js)

const { cache, getCached, setCache, HEADER_CACHE_TTL } = require('./cache');
const { getReadWriteClient } = require('./client');
const { SHEET_REGISTRY, getSpreadsheetId, isSpreadsheetConfigured } = require('./registry');
const { resolveSheetName } = require('./resolve-sheet-name');

async function getSheetHeaders(sheetKey) {
  const entry = SHEET_REGISTRY[sheetKey];
  if (!entry) throw new Error(`Unknown sheet key: ${sheetKey}`);

  const cacheKey = `headers_${sheetKey}`;
  const headerEntry = cache.get(cacheKey);
  if (headerEntry && Date.now() - headerEntry.timestamp < HEADER_CACHE_TTL) {
    return headerEntry.data;
  }

  const spreadsheetId = getSpreadsheetId(entry.spreadsheetKey);
  if (!spreadsheetId) throw new Error(`Spreadsheet ${entry.spreadsheetKey} not configured`);

  const client = getReadWriteClient();
  if (!client) throw new Error('Sheets client not available');

  const resolvedName = resolveSheetName(entry);
  const sheetName = resolvedName.includes(' ') ? `'${resolvedName}'` : resolvedName;
  const response = await client.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });

  const headers = (response.data.values && response.data.values[0]) || [];
  cache.set(cacheKey, { data: headers, timestamp: Date.now() });
  return headers;
}

/**
 * Fetch a sheet by registry key.
 *
 * @param {string} sheetKey - Key in SHEET_REGISTRY (e.g. 'SALES_CURRENT_MONTH')
 * @param {Date|number} [now] - Optional "now" forwarded to resolveSheetName for
 *   dynamic tab names. Pass an IST-adjusted Date so month-boundary resolution
 *   uses the correct Indian calendar month rather than the server's local TZ.
 *   Backward-compatible: omit for existing callers, they get current behavior.
 */
async function fetchSheet(sheetKey, now) {
  const entry = SHEET_REGISTRY[sheetKey];
  if (!entry) throw new Error(`Unknown sheet key: ${sheetKey}`);
  if (!isSpreadsheetConfigured(entry.spreadsheetKey)) {
    return { available: false, reason: 'not_configured' };
  }

  const cacheKey = `sheet_reg_${sheetKey}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const spreadsheetId = getSpreadsheetId(entry.spreadsheetKey);
  const client = getReadWriteClient();
  if (!client) return { available: false, reason: 'not_configured' };

  const resolvedSheetName = resolveSheetName(entry, now);

  try {
    const quotedName = resolvedSheetName.includes(' ') ? `'${resolvedSheetName}'` : resolvedSheetName;
    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range: quotedName,
    });

    const rows = response.data.values || [];
    if (rows.length < 2) {
      const result = { available: true, headers: rows[0] || [], rows: [] };
      setCache(cacheKey, result);
      return result;
    }

    const headers = rows[0];
    const data = rows.slice(1).map((row, index) => {
      const obj = { rowIndex: index + 2 }; // 1-based, +1 for header row
      headers.forEach((h, i) => { obj[h] = row[i] || null; });
      return obj;
    });

    const result = { available: true, headers, rows: data };
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    // Sheets API returns "Unable to parse range" or "Requested entity was not found"
    // when a tab name doesn't exist. Convert to a structured unavailable response
    // so callers (e.g. daily-sales-service) can degrade gracefully.
    const msg = err.message || '';
    if (msg.includes('Unable to parse range') || msg.includes('Requested entity was not found')) {
      console.warn(`[sheets] fetchSheet("${sheetKey}") tab not found: "${resolvedSheetName}"`);
      return {
        available: false,
        reason: 'tab_not_found_for_month',
        expectedTabName: resolvedSheetName,
      };
    }
    console.warn(`[sheets] fetchSheet("${sheetKey}") API error:`, err.message);
    return { available: false, reason: 'api_error', error: err.message };
  }
}

async function appendRow(sheetKey, rowData) {
  const entry = SHEET_REGISTRY[sheetKey];
  if (!entry) throw new Error(`Unknown sheet key: ${sheetKey}`);

  const spreadsheetId = getSpreadsheetId(entry.spreadsheetKey);
  if (!spreadsheetId) throw new Error(`Spreadsheet ${entry.spreadsheetKey} not configured`);

  const client = getReadWriteClient();
  if (!client) throw new Error('Sheets client not available');

  const headers = await getSheetHeaders(sheetKey);
  const rowArray = headers.map(h => rowData[h] ?? '');

  const resolvedName = resolveSheetName(entry);
  const sheetName = resolvedName.includes(' ') ? `'${resolvedName}'` : resolvedName;
  const response = await client.spreadsheets.values.append({
    spreadsheetId,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [rowArray] },
  });

  // Invalidate cache for this sheet
  cache.delete(`sheet_reg_${sheetKey}`);

  return { success: true, updates: response.data.updates };
}

async function updateRow(sheetKey, rowIndex, rowData) {
  const entry = SHEET_REGISTRY[sheetKey];
  if (!entry) throw new Error(`Unknown sheet key: ${sheetKey}`);

  const spreadsheetId = getSpreadsheetId(entry.spreadsheetKey);
  if (!spreadsheetId) throw new Error(`Spreadsheet ${entry.spreadsheetKey} not configured`);

  const client = getReadWriteClient();
  if (!client) throw new Error('Sheets client not available');

  const headers = await getSheetHeaders(sheetKey);
  const rowArray = headers.map(h => rowData[h] ?? '');

  const resolvedName = resolveSheetName(entry);
  const sheetName = resolvedName.includes(' ') ? `'${resolvedName}'` : resolvedName;
  const response = await client.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [rowArray] },
  });

  cache.delete(`sheet_reg_${sheetKey}`);

  return { success: true, updatedCells: response.data.updatedCells };
}

async function deleteRow(sheetKey, rowIndex) {
  const entry = SHEET_REGISTRY[sheetKey];
  if (!entry) throw new Error(`Unknown sheet key: ${sheetKey}`);

  const spreadsheetId = getSpreadsheetId(entry.spreadsheetKey);
  if (!spreadsheetId) throw new Error(`Spreadsheet ${entry.spreadsheetKey} not configured`);

  const client = getReadWriteClient();
  if (!client) throw new Error('Sheets client not available');

  await client.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: parseInt(entry.gid, 10),
            dimension: 'ROWS',
            startIndex: rowIndex - 1, // 0-based for API
            endIndex: rowIndex,
          },
        },
      }],
    },
  });

  cache.delete(`sheet_reg_${sheetKey}`);

  return { success: true };
}

module.exports = { getSheetHeaders, fetchSheet, appendRow, updateRow, deleteRow };
