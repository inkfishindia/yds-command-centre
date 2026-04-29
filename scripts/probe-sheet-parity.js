// Sheet ↔ Dashboard parity check.
// For each source tab and each render-relevant column, compare distinct raw
// sheet values against what the dashboard exposes via /api/daily-sales.
//
// Catches:
//   - Parser enum-whitelists silently dumping values into (unknown)
//   - Dedup logic dropping rows with unique categories
//   - filters.available.* missing values that exist in the sheet
//   - mix.* missing categories
//
// Usage: node scripts/probe-sheet-parity.js
const fs = require('fs');
const path = require('path');

// Load .env manually (no dotenv dep)
const envText = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) {
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}
const { google } = require('googleapis');
const http = require('http');

const SPREADSHEET_ID = '1fQ4kWvh4J6s5tsnSFJ5ulvdNxVmtQs5lI6WGLjipA_A';
const TABS = ['2027', 'April 2026', '2026'];
const API_URL = 'http://localhost:3000/api/daily-sales';

// Map: sheet column header → { apiAvailableKey, apiMixKey (optional), label }
const COLUMNS = [
  { sheet: 'Order Type',        apiAvailableKey: 'orderTypes',   apiMixKey: 'orderType',    label: 'Order Type' },
  { sheet: 'Status',            apiAvailableKey: 'statuses',     apiMixKey: 'status',       label: 'Status' },
  { sheet: 'Acceptance Status', apiAvailableKey: null,           apiMixKey: null,           label: 'Acceptance Status' },
  { sheet: 'Sales Channel',     apiAvailableKey: 'channels',     apiMixKey: 'salesChannel', label: 'Sales Channel' },
  { sheet: 'Payment Mode',      apiAvailableKey: 'paymentModes', apiMixKey: 'paymentMode',  label: 'Payment Mode' },
  { sheet: 'Tags',              apiAvailableKey: 'printMethods', apiMixKey: 'printMethod',  label: 'Tags (print method)', firstTagOnly: true },
  { sheet: 'Shipping State',    apiAvailableKey: 'states',       apiMixKey: null,           label: 'Shipping State' },
];

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

(async () => {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) { console.error('GOOGLE_SERVICE_ACCOUNT_KEY not set'); process.exit(1); }
  const opts = key.trimStart().startsWith('{')
    ? { credentials: JSON.parse(key), scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] }
    : { keyFile: key, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] };
  const auth = new google.auth.GoogleAuth(opts);
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('Spreadsheet:', SPREADSHEET_ID);
  console.log('Tabs:', TABS.join(', '));
  console.log('');

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const allTabs = meta.data.sheets.map(s => s.properties.title);
  for (const tab of TABS) if (!allTabs.includes(tab)) console.log('  ⚠  tab "' + tab + '" not in workbook');

  // Fetch raw values per tab
  const rawByTab = {};
  for (const tab of TABS) {
    if (!allTabs.includes(tab)) continue;
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID, range: `'${tab}'!A1:ZZ`,
    });
    rawByTab[tab] = resp.data.values || [];
  }

  // Fetch dashboard payload (with status=all so we see full universe)
  let api;
  try {
    api = await get(API_URL + '?status=all&limit=5000');
  } catch (e) {
    console.log('❌ API unreachable at ' + API_URL + ' — start the dev server first.');
    process.exit(2);
  }
  const apiAvail = (api.filters && api.filters.available) || {};
  const apiMix = (api.mix) || {};

  // For each column, compute distinct values per tab + union, compare to API
  for (const col of COLUMNS) {
    console.log('─── ' + col.label + ' (sheet: "' + col.sheet + '") ───');

    const perTab = {};
    const unionRaw = new Map(); // val → totalCount across tabs
    for (const tab of TABS) {
      const rows = rawByTab[tab];
      if (!rows || rows.length < 2) { perTab[tab] = null; continue; }
      const headers = rows[0];
      const idx = headers.findIndex(h => (h || '').trim().toLowerCase() === col.sheet.toLowerCase());
      if (idx < 0) { perTab[tab] = { missing: true }; continue; }
      const counts = new Map();
      for (let i = 1; i < rows.length; i++) {
        let val = (rows[i][idx] || '').trim();
        if (col.firstTagOnly && val) val = val.split(',')[0].trim();
        if (!val) continue; // ignore blanks for distinct-value check; parser maps to (unknown)
        counts.set(val, (counts.get(val) || 0) + 1);
        unionRaw.set(val, (unionRaw.get(val) || 0) + 1);
      }
      perTab[tab] = counts;
    }

    // Print per-tab summary
    for (const tab of TABS) {
      const c = perTab[tab];
      if (c == null) { console.log('  ' + tab.padEnd(14) + ' (no data)'); continue; }
      if (c.missing) { console.log('  ' + tab.padEnd(14) + ' ⚠  header missing'); continue; }
      const top = [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
      console.log('  ' + tab.padEnd(14) + ' ' + c.size + ' distinct: ' +
        top.map(([v, n]) => v + '(' + n + ')').join(', ') +
        (c.size > 6 ? ', …' : ''));
    }

    // Compare union of raw distinct values (exc. blanks) against API
    if (col.apiAvailableKey) {
      const apiSet = new Set((apiAvail[col.apiAvailableKey] || []).filter(v => v && v !== '(unknown)'));
      const rawSet = new Set(unionRaw.keys());
      const missingFromApi = [...rawSet].filter(v => !apiSet.has(v));
      const apiOnly = [...apiSet].filter(v => !rawSet.has(v));
      if (missingFromApi.length > 0) {
        console.log('  🔴 in sheet but MISSING from filters.available.' + col.apiAvailableKey + ': ' + missingFromApi.join(', '));
      } else {
        console.log('  ✓  filters.available.' + col.apiAvailableKey + ' covers all ' + rawSet.size + ' raw values');
      }
      if (apiOnly.length > 0) {
        console.log('  🟡 in API but not in any source tab (possibly stale): ' + apiOnly.join(', '));
      }
    } else {
      console.log('  (not exposed via filters.available — diagnostic only)');
    }

    // Compare mix coverage
    if (col.apiMixKey && apiMix[col.apiMixKey]) {
      const mixNames = new Set(apiMix[col.apiMixKey].map(m => m.name).filter(n => n !== '(unknown)'));
      const rawSet = new Set(unionRaw.keys());
      const missingFromMix = [...rawSet].filter(v => !mixNames.has(v));
      if (missingFromMix.length > 0) {
        console.log('  🔴 in sheet but MISSING from mix.' + col.apiMixKey + ': ' + missingFromMix.join(', '));
      }
    }

    console.log('');
  }

  // Top-level totals sanity check
  console.log('─── Totals sanity ───');
  let rawRowCount = 0;
  for (const tab of TABS) {
    const rows = rawByTab[tab];
    const n = rows && rows.length > 1 ? rows.length - 1 : 0;
    console.log('  ' + tab.padEnd(14) + ' ' + n + ' data rows');
    rawRowCount += n;
  }
  console.log('  union (pre-dedup): ' + rawRowCount);
  console.log('  API dataQuality.total (post-dedup): ' + ((api.dataQuality && api.dataQuality.total) || '?'));
  console.log('  API dataQuality.realized: ' + ((api.dataQuality && api.dataQuality.realized) || '?'));
  console.log('');
  console.log('Done. Any 🔴 above = parser/dedup bug in server/services/daily-sales/.');
})().catch(err => { console.error('ERROR:', err.message); process.exit(2); });
