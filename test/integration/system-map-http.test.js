'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

let server = null;

/**
 * Start Express app for integration testing.
 */
async function startServer() {
  return new Promise((resolve, reject) => {
    // Force server.js to export the app instead of calling listen()
    process.env.VERCEL = 'true';

    // Clear require cache to ensure VERCEL is checked
    delete require.cache[require.resolve('../../server.js')];
    const app = require('../../server.js');

    server = app.listen(PORT, () => {
      console.log(`[integration] server listening on ${PORT}`);
      resolve(server);
    });

    server.on('error', reject);
  });
}

/**
 * Stop the server and clean up.
 */
async function stopServer() {
  return new Promise((resolve, reject) => {
    if (!server) return resolve();

    server.close((err) => {
      if (err) return reject(err);
      console.log('[integration] server stopped');
      resolve();
    });
  });
}

/**
 * Make HTTP GET request and return { status, headers, body }.
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    }).on('error', reject);
  });
}

describe('[Integration] System Map HTTP', () => {
  before(async () => {
    await startServer();
    // Brief wait for server to be fully ready
    await new Promise((r) => setTimeout(r, 100));
  });

  after(async () => {
    await stopServer();
  });

  it('GET /api/system-map returns 200 with Content-Type application/json', async () => {
    const result = await httpGet(`${BASE_URL}/api/system-map`);

    assert.equal(result.status, 200, 'should return 200');
    assert.equal(
      result.headers['content-type'],
      'application/json; charset=utf-8',
      'should return JSON content type'
    );
  });

  it('response has all six top-level keys', async () => {
    const result = await httpGet(`${BASE_URL}/api/system-map`);
    const body = result.body;

    assert.ok(body.routes, 'routes key present');
    assert.ok(body.modules, 'modules key present');
    assert.ok(body.notionDatabases, 'notionDatabases key present');
    assert.ok(body.sheets, 'sheets key present');
    assert.ok(body.docs, 'docs key present');
    assert.ok(body.agents, 'agents key present');
    assert.ok(body.generatedAt, 'generatedAt timestamp present');
  });

  it('routes array contains at least one entry with file === "chat.js"', async () => {
    const result = await httpGet(`${BASE_URL}/api/system-map`);
    const { routes } = result.body;

    assert.ok(Array.isArray(routes), 'routes is array');
    const chatEntry = routes.find((r) => r.file === 'chat.js');
    assert.ok(chatEntry, 'routes should contain chat.js');
    assert.ok(Array.isArray(chatEntry.endpoints), 'chat.js entry has endpoints array');
    assert.ok(chatEntry.endpoints.length > 0, 'chat.js has at least one endpoint');
  });

  it('sheets entries do not leak raw sheet IDs — only key, envVar, idPresent, label', async () => {
    const result = await httpGet(`${BASE_URL}/api/system-map`);
    const { sheets } = result.body;

    assert.ok(Array.isArray(sheets), 'sheets is array');
    assert.ok(sheets.length > 0, 'sheets array is non-empty');

    for (const sheet of sheets) {
      // Expected fields
      assert.ok('key' in sheet, `sheet ${sheet.key} has key field`);
      assert.ok('envVar' in sheet, `sheet ${sheet.key} has envVar field`);
      assert.ok('idPresent' in sheet, `sheet ${sheet.key} has idPresent field`);
      assert.ok('label' in sheet, `sheet ${sheet.key} has label field`);
      assert.equal(typeof sheet.idPresent, 'boolean', `sheet ${sheet.key} idPresent is boolean`);

      // Forbidden fields
      assert.ok(!('id' in sheet), `sheet ${sheet.key} must not have raw id field`);
      assert.ok(!('value' in sheet), `sheet ${sheet.key} must not have raw value field`);

      // No field should contain a long spreadsheet ID (pattern: ~40+ chars with hyphens)
      for (const [fieldName, fieldValue] of Object.entries(sheet)) {
        if (typeof fieldValue === 'string' && fieldValue.length > 12) {
          const hasSpreadsheetIdPattern = /^[a-z0-9\-]{30,}$/i.test(fieldValue);
          assert.ok(
            !hasSpreadsheetIdPattern,
            `sheet.${fieldName} looks like a spreadsheet ID and should not be exposed`
          );
        }
      }
    }
  });

  it('?force=true busts cache — different generatedAt timestamp on second call', async () => {
    // First call (cached)
    const result1 = await httpGet(`${BASE_URL}/api/system-map`);
    const timestamp1 = result1.body.generatedAt;

    // Wait 100ms
    await new Promise((r) => setTimeout(r, 100));

    // Second call without force (still cached, same timestamp)
    const result2 = await httpGet(`${BASE_URL}/api/system-map`);
    const timestamp2 = result2.body.generatedAt;
    assert.equal(timestamp2, timestamp1, 'cached response returns same timestamp');

    // Wait another 100ms
    await new Promise((r) => setTimeout(r, 100));

    // Third call with force=true (fresh build)
    const result3 = await httpGet(`${BASE_URL}/api/system-map?force=true`);
    const timestamp3 = result3.body.generatedAt;
    assert.notEqual(timestamp3, timestamp1, 'force=true generates fresh timestamp');
  });
});
