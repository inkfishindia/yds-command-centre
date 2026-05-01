'use strict';

// client.js — Google Sheets API client singletons (RO + RW)
// Owns: isConfigured, authOptions, getClient (read-only), getReadWriteClient (read-write)
// Depends on: ../config (required lazily inside each function — honours test mock injection)
// DO NOT add: cache logic, registry data, domain reads

// Note: config is NOT captured at module top. Each function does require('../../config')
// at call time so that test harness injections into require.cache[CONFIG_PATH] are
// picked up even when this module stays cached between test runs (same lazy-require
// contract as the external callers of ../sheets, per Decision #73).

// ── Read-only singleton ──────────────────────────────────────────────────────

let sheetsClient = null;

/**
 * Returns true when both a service account key and the primary sheets ID are set.
 * Used for the CRM/pipeline features that target GOOGLE_SHEETS_ID specifically.
 */
function isConfigured() {
  const config = require('../../config');
  return !!(config.GOOGLE_SERVICE_ACCOUNT_KEY && config.GOOGLE_SHEETS_ID);
}

/**
 * Build GoogleAuth options — supports both a file path (local dev) and
 * an inline JSON string (Vercel / cloud deploy).
 */
function authOptions(scopes) {
  const config = require('../../config');
  const key = config.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) return null;
  // If it starts with '{' it's inline JSON; otherwise treat as file path
  if (key.trimStart().startsWith('{')) {
    return { credentials: JSON.parse(key), scopes };
  }
  return { keyFile: key, scopes };
}

function getClient() {
  if (!isConfigured()) return null;
  if (sheetsClient) return sheetsClient;

  try {
    const { google } = require('googleapis');
    const opts = authOptions(['https://www.googleapis.com/auth/spreadsheets.readonly']);
    if (!opts) return null;
    const auth = new google.auth.GoogleAuth(opts);
    sheetsClient = google.sheets({ version: 'v4', auth });
    return sheetsClient;
  } catch (err) {
    console.error('Sheets client init failed:', err.message);
    return null;
  }
}

// ── Read-write singleton ─────────────────────────────────────────────────────

let rwClient = null;

function getReadWriteClient() {
  const config = require('../../config');
  if (!config.GOOGLE_SERVICE_ACCOUNT_KEY) return null;
  if (rwClient) return rwClient;
  try {
    const { google } = require('googleapis');
    const opts = authOptions(['https://www.googleapis.com/auth/spreadsheets']);
    if (!opts) return null;
    const auth = new google.auth.GoogleAuth(opts);
    rwClient = google.sheets({ version: 'v4', auth });
    return rwClient;
  } catch (err) {
    console.error('Sheets RW client init failed:', err.message);
    return null;
  }
}

module.exports = { isConfigured, authOptions, getClient, getReadWriteClient };
