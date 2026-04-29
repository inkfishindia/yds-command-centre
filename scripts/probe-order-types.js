// Probe raw Order Type column values across BOTH source tabs of the daily sales workbook.
// Bypasses parseOrder/dedup — reads the sheet directly via the same Google Service Account.
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
const envText = fs.readFileSync(envPath, 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) {
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}
const { google } = require('googleapis');

const SPREADSHEET_ID = '1fQ4kWvh4J6s5tsnSFJ5ulvdNxVmtQs5lI6WGLjipA_A';
const TABS = ['2027', 'April 2026'];

(async () => {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) { console.error('GOOGLE_SERVICE_ACCOUNT_KEY not set'); process.exit(1); }
  const opts = key.trimStart().startsWith('{')
    ? { credentials: JSON.parse(key), scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] }
    : { keyFile: key, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] };
  const auth = new google.auth.GoogleAuth(opts);
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('Spreadsheet ID :', SPREADSHEET_ID);
  console.log('URL            : https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit');

  // Workbook metadata
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  console.log('Workbook title :', meta.data.properties.title);
  console.log('All tabs       :', meta.data.sheets.map(s => s.properties.title).join(', '));
  console.log('');

  for (const tab of TABS) {
    console.log('═══ Tab: "' + tab + '" ═══');
    const tabMeta = meta.data.sheets.find(s => s.properties.title === tab);
    if (!tabMeta) {
      console.log('  ❌ Tab not found in workbook');
      console.log('');
      continue;
    }
    console.log('  gid=' + tabMeta.properties.sheetId + ', rows=' + tabMeta.properties.gridProperties.rowCount);

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${tab}'!A1:ZZ`,
    });
    const rows = resp.data.values || [];
    if (rows.length < 2) { console.log('  (empty or header only)\n'); continue; }
    const headers = rows[0];
    const orderTypeIdx = headers.findIndex(h => (h || '').trim().toLowerCase() === 'order type');
    console.log('  total data rows: ' + (rows.length - 1));
    console.log('  Order Type column index: ' + orderTypeIdx + ' (header: "' + (headers[orderTypeIdx] || '') + '")');

    if (orderTypeIdx < 0) { console.log('  ❌ "Order Type" header NOT FOUND in this tab\n'); continue; }

    const counts = new Map();
    for (let i = 1; i < rows.length; i++) {
      const val = (rows[i][orderTypeIdx] || '').trim();
      const key = val === '' ? '(blank)' : val;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    console.log('  Distinct Order Type values:');
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [val, n] of sorted) console.log('    ' + String(n).padStart(5) + '  "' + val + '"');
    console.log('');
  }
})().catch(err => { console.error('ERROR:', err.message); process.exit(2); });
