// Google Sheets service — gracefully degrades when GOOGLE_SERVICE_ACCOUNT_KEY
// and GOOGLE_SHEETS_ID are not configured.
// Cache pattern mirrors server/services/notion.js (5-min TTL, Map-based).

const config = require('../config');

// ── Cache ────────────────────────────────────────────────────────────────────

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ── Auth / client ─────────────────────────────────────────────────────────────

function isConfigured() {
  return !!(config.GOOGLE_SERVICE_ACCOUNT_KEY && config.GOOGLE_SHEETS_ID);
}

let sheetsClient = null;

function getClient() {
  if (!isConfigured()) return null;
  if (sheetsClient) return sheetsClient;

  try {
    // Lazy-require googleapis so the module loads cleanly even if the
    // package is not installed (it will be installed by npm install googleapis).
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      keyFile: config.GOOGLE_SERVICE_ACCOUNT_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    sheetsClient = google.sheets({ version: 'v4', auth });
    return sheetsClient;
  } catch (err) {
    console.error('Sheets client init failed:', err.message);
    return null;
  }
}

// ── Low-level data access ─────────────────────────────────────────────────────

async function getSheetData(range) {
  const client = getClient();
  if (!client) return null;

  const cached = getCached(`sheet_${range}`);
  if (cached) return cached;

  const response = await client.spreadsheets.values.get({
    spreadsheetId: config.GOOGLE_SHEETS_ID,
    range,
  });

  const data = response.data.values || [];
  setCache(`sheet_${range}`, data);
  return data;
}

// Parse sheet rows into objects using the header row (row[0]).
function parseRows(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map(h => h.toLowerCase().trim().replace(/\s+/g, '_'));
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns pipeline data from the LEAD_FLOWS sheet, broken down by flow type
 * (b2b vs drop-ship) with stage counts and SLA breach indicators.
 *
 * Returns { available: false } when Google Sheets is not configured or an
 * error occurs — the UI should handle this gracefully.
 */
async function getPipelineData() {
  if (!isConfigured()) {
    return { available: false };
  }

  try {
    const rows = await getSheetData('LEAD_FLOWS!A:Z');
    if (!rows) return { available: false };

    const leads = parseRows(rows);

    const b2bLeads = leads.filter(l => (l.flow_type || '').toLowerCase().includes('b2b'));
    const dsLeads  = leads.filter(l => (l.flow_type || '').toLowerCase().includes('drop'));

    const countByStage = (items) => {
      const stages = {};
      items.forEach(l => {
        const stage = l.stage || l.status || 'Unknown';
        stages[stage] = (stages[stage] || 0) + 1;
      });
      return Object.entries(stages).map(([name, count]) => ({ name, count }));
    };

    // SLA breach: lead not contacted within 2 hours of creation
    const now = Date.now();
    const slaBreaches = leads.filter(l => {
      const contactStatus = (l.contact_status || '').toLowerCase();
      const createdAt = l.created_at ? new Date(l.created_at).getTime() : 0;
      return (
        contactStatus === 'not contacted' &&
        createdAt > 0 &&
        (now - createdAt) > 2 * 60 * 60 * 1000
      );
    });

    return {
      available: true,
      b2b: {
        stages: countByStage(b2bLeads),
        totalActive: b2bLeads.length,
        slaBreaches: slaBreaches.filter(l => (l.flow_type || '').toLowerCase().includes('b2b')).length,
      },
      dropship: {
        stages: countByStage(dsLeads),
        totalActive: dsLeads.length,
        slaBreaches: slaBreaches.filter(l => (l.flow_type || '').toLowerCase().includes('drop')).length,
      },
      totalSlaBreaches: slaBreaches.length,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Sheets pipeline error:', err.message);
    return { available: false, error: err.message };
  }
}

/**
 * Returns the Strategy Cascade from Google Sheets.
 * Expects columns: Level, Name, Description, Status, Owner.
 * Groups rows by Level into a hierarchical structure.
 *
 * Returns { available: false } when Sheets is not configured or an error occurs.
 */
async function getStrategyCascade() {
  if (!config.STRATEGY_SHEETS_ID || !config.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return { available: false };
  }

  // Strategy cascade uses its own sheet ID but shares the Google auth.
  // Build a client independently of GOOGLE_SHEETS_ID (which gates the CRM pipeline sheet).
  let client;
  try {
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      keyFile: config.GOOGLE_SERVICE_ACCOUNT_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    client = google.sheets({ version: 'v4', auth });
  } catch (err) {
    console.error('Strategy cascade auth error:', err.message);
    return { available: false };
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
    console.error('Sheets strategy cascade error:', err.message);
    return { available: false, error: err.message };
  }
}

function clearCache() {
  cache.clear();
}

module.exports = { getPipelineData, getStrategyCascade, isConfigured, clearCache };
