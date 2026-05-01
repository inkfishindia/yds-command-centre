'use strict';

// strategy-cascade.js — getStrategyCascade domain read (strategy hierarchy from STRATEGY_SHEETS_ID)
// Owns: getStrategyCascade
// Depends on: ./cache, ./parse-rows, ./client (authOptions only), ../config (lazy inside function)
// DO NOT add: refactor the inline client to use getReadWriteClient — PRESERVE INLINE CLIENT.
//   This function uses STRATEGY_SHEETS_ID (not GOOGLE_SHEETS_ID) so it intentionally
//   builds its own auth client. Behavior is frozen per refactor contract (Decision #79).

// Note: config is NOT captured at module top — it is required lazily inside getStrategyCascade
// so that test harness injections into require.cache[CONFIG_PATH] are honoured even when
// this module stays cached between test runs (Decision #73).

const { getCached, setCache } = require('./cache');
const { parseRows } = require('./parse-rows');
const { authOptions } = require('./client');

/**
 * Returns the Strategy Cascade from Google Sheets.
 * Expects columns: Level, Name, Description, Status, Owner.
 * Groups rows by Level into a hierarchical structure.
 *
 * Returns { available: false } when Sheets is not configured or an error occurs.
 */
async function getStrategyCascade() {
  const config = require('../../config');
  if (!config.STRATEGY_SHEETS_ID || !config.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return { available: false, reason: 'not_configured' };
  }

  // Strategy cascade uses its own sheet ID but shares the Google auth.
  // Build a client independently of GOOGLE_SHEETS_ID (which gates the CRM pipeline sheet).
  let client;
  try {
    const { google } = require('googleapis');
    const opts = authOptions(['https://www.googleapis.com/auth/spreadsheets.readonly']);
    if (!opts) return { available: false, reason: 'not_configured' };
    const auth = new google.auth.GoogleAuth(opts);
    client = google.sheets({ version: 'v4', auth });
  } catch (err) {
    console.warn('[sheets] getStrategyCascade auth init error:', err.message);
    return { available: false, reason: 'api_error', error: err.message };
  }

  const cached = getCached('strategy_cascade');
  if (cached) return cached;

  try {
    const response = await client.spreadsheets.values.get({
      spreadsheetId: config.STRATEGY_SHEETS_ID,
      range: 'A:Z',
    });

    const rows = response.data.values || [];
    const items = parseRows(rows);

    // Group by the "level" column into a hierarchical structure
    const levelMap = {};
    const levelOrder = [];
    for (const item of items) {
      const level = item.level || 'Other';
      if (!levelMap[level]) {
        levelMap[level] = [];
        levelOrder.push(level);
      }
      levelMap[level].push({
        name: item.name || '',
        description: item.description || '',
        status: item.status || '',
        owner: item.owner || '',
      });
    }

    const levels = levelOrder.map(name => ({ name, items: levelMap[name] }));
    const result = { available: true, levels };

    setCache('strategy_cascade', result);
    return result;
  } catch (err) {
    console.warn('[sheets] getStrategyCascade API error:', err.message);
    return { available: false, reason: 'api_error', error: err.message };
  }
}

module.exports = { getStrategyCascade };
