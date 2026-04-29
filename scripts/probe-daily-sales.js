// One-off probe — reads the "2026" tab of the daily sales spreadsheet
// using the existing service-account credentials.
const fs = require('fs');
const path = require('path');
const envPath = path.join(
  '/Users/dan/Library/CloudStorage/GoogleDrive-danish@yourdesignstore.in/My Drive/market/yds-command-centre',
  '.env'
);
const envText = fs.readFileSync(envPath, 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) {
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}
const { google } = require('googleapis');

const SPREADSHEET_ID = '1fQ4kWvh4J6s5tsnSFJ5ulvdNxVmtQs5lI6WGLjipA_A';
const TAB = '2026';

(async () => {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    console.error('GOOGLE_SERVICE_ACCOUNT_KEY not set');
    process.exit(1);
  }
  const opts = key.trimStart().startsWith('{')
    ? { credentials: JSON.parse(key), scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] }
    : { keyFile: key, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] };

  const auth = new google.auth.GoogleAuth(opts);
  const sheets = google.sheets({ version: 'v4', auth });

  // Service account email for Dan to share with if access fails
  const credEmail =
    (opts.credentials && opts.credentials.client_email) || '(read from keyFile)';
  console.log('service account email:', credEmail);
  console.log('spreadsheet:', SPREADSHEET_ID);
  console.log('tab:', TAB);
  console.log('---');

  try {
    // Pull metadata first so we can confirm the tab exists and grab gid
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    console.log('spreadsheet title:', meta.data.properties.title);
    const tabs = meta.data.sheets.map(s => ({
      name: s.properties.title,
      gid: s.properties.sheetId,
      rows: s.properties.gridProperties && s.properties.gridProperties.rowCount,
      cols: s.properties.gridProperties && s.properties.gridProperties.columnCount,
    }));
    console.log('all tabs:', JSON.stringify(tabs, null, 2));

    const target = tabs.find(t => t.name === TAB);
    if (!target) {
      console.error(`tab "${TAB}" not found`);
      process.exit(1);
    }
    console.log(`\ntarget tab "${TAB}": gid=${target.gid}, ${target.rows} rows × ${target.cols} cols`);

    // Pull the data
    const range = `'${TAB}'!A1:ZZ`;
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    const rows = resp.data.values || [];
    console.log(`\nfetched ${rows.length} rows (incl. header)`);

    if (rows.length === 0) {
      console.log('(empty sheet)');
      return;
    }

    const headers = rows[0];
    console.log(`\nheaders (${headers.length}):`);
    headers.forEach((h, i) => console.log(`  [${i}] ${h}`));

    console.log('\nfirst 3 data rows:');
    rows.slice(1, 4).forEach((r, i) => {
      console.log(`\n  row ${i + 2}:`);
      headers.forEach((h, j) => {
        const val = r[j];
        if (val !== undefined && val !== '') console.log(`    ${h}: ${val}`);
      });
    });

    console.log('\nlast 3 data rows:');
    rows.slice(-3).forEach((r, i) => {
      console.log(`\n  row ${rows.length - 2 + i}:`);
      headers.forEach((h, j) => {
        const val = r[j];
        if (val !== undefined && val !== '') console.log(`    ${h}: ${val}`);
      });
    });
  } catch (err) {
    console.error('ERROR:', err.message);
    if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
    process.exit(2);
  }
})();
