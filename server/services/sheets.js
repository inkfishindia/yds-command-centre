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
  // Config error — not an unexpected condition, no warning needed
  if (!client) return null;

  const cached = getCached(`sheet_${range}`);
  if (cached) return cached;

  try {
    const response = await client.spreadsheets.values.get({
      spreadsheetId: config.GOOGLE_SHEETS_ID,
      range,
    });

    const data = response.data.values || [];
    setCache(`sheet_${range}`, data);
    return data;
  } catch (err) {
    console.warn(`[sheets] getSheetData("${range}") API error:`, err.message);
    throw err; // Re-throw so callers (getPipelineData) can apply their own error shape
  }
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
    return { available: false, reason: 'not_configured' };
  }

  try {
    const rows = await getSheetData('LEAD_FLOWS!A:Z');
    // getSheetData returns null when client init failed (config error)
    if (!rows) return { available: false, reason: 'not_configured' };

    const leads = parseRows(rows);

    // Actual sheet column is "channel" (values: "B2B", etc.), not "flow_type"
    const b2bLeads = leads.filter(l => (l.channel || '').toLowerCase() === 'b2b');
    const otherLeads = leads.filter(l => (l.channel || '').toLowerCase() !== 'b2b' && (l.channel || '') !== '');

    const countByStage = (items) => {
      const stages = {};
      items.forEach(l => {
        const stage = l.stage || l.status || 'Unknown';
        stages[stage] = (stages[stage] || 0) + 1;
      });
      return Object.entries(stages).map(([name, count]) => ({ name, count }));
    };

    const countByStatus = (items) => {
      const statuses = {};
      items.forEach(l => {
        const status = l.status || 'Unknown';
        statuses[status] = (statuses[status] || 0) + 1;
      });
      return Object.entries(statuses).map(([name, count]) => ({ name, count }));
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
      totalLeads: leads.length,
      b2b: {
        stages: countByStage(b2bLeads),
        statuses: countByStatus(b2bLeads),
        totalActive: b2bLeads.filter(l => l.status === 'Active' || l.status === 'New' || l.status === 'Qualified').length,
        total: b2bLeads.length,
        slaBreaches: slaBreaches.filter(l => (l.channel || '').toLowerCase() === 'b2b').length,
      },
      other: {
        stages: countByStage(otherLeads),
        statuses: countByStatus(otherLeads),
        total: otherLeads.length,
      },
      statusBreakdown: countByStatus(leads),
      totalSlaBreaches: slaBreaches.length,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[sheets] getPipelineData API error:', err.message);
    return { available: false, reason: 'api_error', error: err.message };
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
    return { available: false, reason: 'not_configured' };
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

function clearCache() {
  cache.clear();
}

// ── Sheet Registry ─────────────────────────────────────────────────────────────

const SPREADSHEET_KEYS = {
  STRATEGY: 'STRATEGY',
  EXECUTION: 'EXECUTION',
  APP_LOGGING: 'APP_LOGGING',
  BMC: 'BMC',
  CRM_CORE: 'CRM_CORE',
  CRM_CONFIG: 'CRM_CONFIG',
  CRM_FLOWS: 'CRM_FLOWS',
  OPS_INVENTORY: 'OPS_INVENTORY',
  OPS_SALES: 'OPS_SALES',
  OPS_PRODUCTS: 'OPS_PRODUCTS',
  OPS_WAREHOUSE: 'OPS_WAREHOUSE',
  COMPETITOR_INTEL: 'COMPETITOR_INTEL',
};

// Maps spreadsheet keys to config env var values
function getSpreadsheetId(spreadsheetKey) {
  const map = {
    STRATEGY: config.STRATEGY_SPREADSHEET_ID,
    EXECUTION: config.EXECUTION_SPREADSHEET_ID,
    APP_LOGGING: config.APP_LOGGING_SPREADSHEET_ID,
    BMC: config.BMC_SPREADSHEET_ID,
    CRM_CORE: config.GOOGLE_SHEETS_ID,
    CRM_CONFIG: config.CRM_CONFIG_SPREADSHEET_ID,
    CRM_FLOWS: config.CRM_FLOWS_SPREADSHEET_ID,
    OPS_INVENTORY: config.OPS_INVENTORY_SPREADSHEET_ID,
    OPS_SALES: config.OPS_SALES_SPREADSHEET_ID,
    OPS_PRODUCTS: config.OPS_PRODUCTS_SPREADSHEET_ID,
    OPS_WAREHOUSE: config.OPS_WAREHOUSE_SPREADSHEET_ID,
    COMPETITOR_INTEL: config.COMPETITOR_INTEL_SPREADSHEET_ID,
  };
  return map[spreadsheetKey] || '';
}

function isSpreadsheetConfigured(spreadsheetKey) {
  return !!(config.GOOGLE_SERVICE_ACCOUNT_KEY && getSpreadsheetId(spreadsheetKey));
}

const SHEET_REGISTRY = {
  // Execution
  PROJECTS: { spreadsheetKey: 'EXECUTION', sheetName: 'PROJECTS', gid: '784960017' },
  TASKS: { spreadsheetKey: 'EXECUTION', sheetName: 'TASKS', gid: '268128158' },
  PEOPLE: { spreadsheetKey: 'EXECUTION', sheetName: 'PEOPLE & CAPACITY', gid: '40806932' },
  CAMPAIGNS: { spreadsheetKey: 'EXECUTION', sheetName: 'CAMPAIGNS', gid: '2052586943' },
  EXECUTIVE_DASHBOARD: { spreadsheetKey: 'EXECUTION', sheetName: 'EXECUTIVE DASHBOARD', gid: '1902780278' },
  TIME_TRACKING: { spreadsheetKey: 'EXECUTION', sheetName: 'TIME TRACKING', gid: '1450207772' },
  // Strategy
  BUSINESS_UNITS: { spreadsheetKey: 'STRATEGY', sheetName: 'BUSINESS UNITS', gid: '0' },
  FLYWHEEL: { spreadsheetKey: 'STRATEGY', sheetName: 'Flywheel', gid: '225662612' },
  HUBS: { spreadsheetKey: 'STRATEGY', sheetName: 'Hub', gid: '1390706317' },
  CUSTOMER_SEGMENT: { spreadsheetKey: 'STRATEGY', sheetName: 'Customer Segment & foundation', gid: '1469082015' },
  TOUCHPOINTS: { spreadsheetKey: 'STRATEGY', sheetName: 'TOUCHPOINTS', gid: '1839538407' },
  APP_STORES: { spreadsheetKey: 'STRATEGY', sheetName: 'APP STORES', gid: '1447819195' },
  // App Logging
  LOGIN: { spreadsheetKey: 'APP_LOGGING', sheetName: 'Login', gid: '288121377' },
  BRAIN_DUMP: { spreadsheetKey: 'APP_LOGGING', sheetName: 'BrainDump', gid: '0' },
  // CRM Core (GOOGLE_SHEETS_ID)
  CRM_LEADS: { spreadsheetKey: 'CRM_CORE', sheetName: 'Leads' },
  CRM_LEAD_FLOWS: { spreadsheetKey: 'CRM_CORE', sheetName: 'LEAD_FLOWS' },
  CRM_FLOW_DETAILS: { spreadsheetKey: 'CRM_CORE', sheetName: 'FLOW_DETAILS' },
  CRM_ACCOUNTS: { spreadsheetKey: 'CRM_CORE', sheetName: 'Accounts' },
  CRM_PARTNER_LIFECYCLE: { spreadsheetKey: 'CRM_CORE', sheetName: 'PARTNER_LIFECYCLE' },
  CRM_SOURCES: { spreadsheetKey: 'CRM_CORE', sheetName: 'Sources' },
  CRM_SYSTEM_USERS: { spreadsheetKey: 'CRM_CORE', sheetName: 'SYSTEM_USERS' },
  // CRM Config
  CRM_SLA_RULES: { spreadsheetKey: 'CRM_CONFIG', sheetName: 'SLA_RULES' },
  CRM_ROUTING_RULES: { spreadsheetKey: 'CRM_CONFIG', sheetName: 'ROUTING_RULES' },
  CRM_STAGE_PROMPTS: { spreadsheetKey: 'CRM_CONFIG', sheetName: 'STAGE_PROMPTS' },
  CRM_SUGGESTED_ACTIONS: { spreadsheetKey: 'CRM_CONFIG', sheetName: 'SUGGESTED_NEXT_ACTIONS' },
  CRM_MESSAGE_TEMPLATES: { spreadsheetKey: 'CRM_CONFIG', sheetName: 'MESSAGE_TEMPLATES' },
  CRM_FLOW_TYPE_CONFIG: { spreadsheetKey: 'CRM_CONFIG', sheetName: 'FLOW_TYPE_CONFIG' },
  CRM_PRODUCT_RANGE: { spreadsheetKey: 'CRM_CONFIG', sheetName: 'Product Range' },
  CRM_APP_SETTINGS: { spreadsheetKey: 'CRM_CONFIG', sheetName: 'APP_SETTINGS' },
  // CRM Flows
  CRM_LEAD_TO_ACCOUNT: { spreadsheetKey: 'CRM_FLOWS', sheetName: 'LEAD_TO_ACCOUNT_MAP' },
  CRM_STORE: { spreadsheetKey: 'CRM_FLOWS', sheetName: 'Store' },
  CRM_B2B: { spreadsheetKey: 'CRM_FLOWS', sheetName: 'B2B' },
  // Business Model Canvas
  BMC_SEGMENTS: { spreadsheetKey: 'BMC', sheetName: 'segments', gid: '1306312699' },
  BMC_BUSINESS_UNITS: { spreadsheetKey: 'BMC', sheetName: 'business_units', gid: '1781583811' },
  BMC_FLYWHEELS: { spreadsheetKey: 'BMC', sheetName: 'flywheels', gid: '1180180195' },
  BMC_REVENUE_STREAMS: { spreadsheetKey: 'BMC', sheetName: 'revenue_streams', gid: '1625184466' },
  BMC_COST_STRUCTURE: { spreadsheetKey: 'BMC', sheetName: 'cost_structure', gid: '1493870932' },
  BMC_CHANNELS: { spreadsheetKey: 'BMC', sheetName: 'channels', gid: '715227562' },
  BMC_PLATFORMS: { spreadsheetKey: 'BMC', sheetName: 'platforms', gid: '1300146116' },
  BMC_TEAM: { spreadsheetKey: 'BMC', sheetName: 'team', gid: '1710233820' },
  BMC_HUBS: { spreadsheetKey: 'BMC', sheetName: 'hubs', gid: '906330339' },
  BMC_PARTNERS: { spreadsheetKey: 'BMC', sheetName: 'partners', gid: '898629063' },
  BMC_METRICS: { spreadsheetKey: 'BMC', sheetName: 'metrics', gid: '439308533' },
  // Ops - Inventory
  OPS_PRODUCT_TYPES: { spreadsheetKey: 'OPS_INVENTORY', sheetName: 'Product Type' },
  OPS_PRODUCT_CLASSIFICATION: { spreadsheetKey: 'OPS_INVENTORY', sheetName: 'Product Classification' },
  OPS_PRODUCTS_INVENTORY: { spreadsheetKey: 'OPS_INVENTORY', sheetName: 'Products Inventory' },
  OPS_VENDORS: { spreadsheetKey: 'OPS_INVENTORY', sheetName: 'Vendors' },
  OPS_PO_LIST: { spreadsheetKey: 'OPS_INVENTORY', sheetName: 'PO_List' },
  OPS_WAREHOUSE_PRODUCTS: { spreadsheetKey: 'OPS_INVENTORY', sheetName: 'Warehouse products' },
  // Ops - Sales
  OPS_SALES_ORDERS: { spreadsheetKey: 'OPS_SALES', sheetName: 'Sales- Orders + Products' },
  OPS_SALES_PRODUCT_CLASS: { spreadsheetKey: 'OPS_SALES', sheetName: 'Product Classifciation' },
  // Ops - Products
  OPS_PRODUCT_VARIANTS: { spreadsheetKey: 'OPS_PRODUCTS', sheetName: 'Product Variants' },
  OPS_PRODUCT_TYPE_MASTER: { spreadsheetKey: 'OPS_PRODUCTS', sheetName: 'Product Type' },
  // Ops - Warehouse
  OPS_WAREHOUSE_ZONES: { spreadsheetKey: 'OPS_WAREHOUSE', sheetName: 'Warehouse Master' },
  OPS_WAREHOUSE_BINS: { spreadsheetKey: 'OPS_WAREHOUSE', sheetName: 'Bin Location Master (Main Sheet)' },
  OPS_WAREHOUSE_COLORS: { spreadsheetKey: 'OPS_WAREHOUSE', sheetName: 'Color Code Master' },
  OPS_PRODUCT_CODE_MASTER: { spreadsheetKey: 'OPS_WAREHOUSE', sheetName: 'Product Code Master' },
  // Competitor Intelligence
  CI_COMPETITORS: { spreadsheetKey: 'COMPETITOR_INTEL', sheetName: 'Competitors_Master' },
  CI_ANALYSIS: { spreadsheetKey: 'COMPETITOR_INTEL', sheetName: 'Competitor analysis' },
  CI_POSITIONING: { spreadsheetKey: 'COMPETITOR_INTEL', sheetName: 'Competitor_Positioning' },
  CI_NOTES: { spreadsheetKey: 'COMPETITOR_INTEL', sheetName: 'Competitor_Notes' },
  CI_CAPABILITIES: { spreadsheetKey: 'COMPETITOR_INTEL', sheetName: 'Competitor_Capabilities' },
  CI_UX_PRODUCT: { spreadsheetKey: 'COMPETITOR_INTEL', sheetName: 'Competitor_UX_Product' },
  CI_MESSAGING: { spreadsheetKey: 'COMPETITOR_INTEL', sheetName: 'Competitor_Messaging' },
  CI_SWOT: { spreadsheetKey: 'COMPETITOR_INTEL', sheetName: 'Competitor_SWOT' },
  CI_PHILOSOPHY: { spreadsheetKey: 'COMPETITOR_INTEL', sheetName: 'Copy of Competitor_Philosophy' },
  CI_MOMENTS: { spreadsheetKey: 'COMPETITOR_INTEL', sheetName: 'Copy of Competitor_MomentsOfTruth' },
  CI_STEAL_ADAPT: { spreadsheetKey: 'COMPETITOR_INTEL', sheetName: 'Copy of Competitor_StealAdaptAvoid' },
  CI_WATCHLIST: { spreadsheetKey: 'COMPETITOR_INTEL', sheetName: 'Copy of Competitor_Watchlist' },
};

// ── Read/Write Client ──────────────────────────────────────────────────────────

let rwClient = null;

function getReadWriteClient() {
  if (!config.GOOGLE_SERVICE_ACCOUNT_KEY) return null;
  if (rwClient) return rwClient;
  try {
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      keyFile: config.GOOGLE_SERVICE_ACCOUNT_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    rwClient = google.sheets({ version: 'v4', auth });
    return rwClient;
  } catch (err) {
    console.error('Sheets RW client init failed:', err.message);
    return null;
  }
}

// ── CRUD Methods ───────────────────────────────────────────────────────────────

const HEADER_CACHE_TTL = 60 * 60 * 1000; // 60 min for headers

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

  const sheetName = entry.sheetName.includes(' ') ? `'${entry.sheetName}'` : entry.sheetName;
  const response = await client.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });

  const headers = (response.data.values && response.data.values[0]) || [];
  cache.set(cacheKey, { data: headers, timestamp: Date.now() });
  return headers;
}

async function fetchSheet(sheetKey) {
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

  try {
    const sheetName = entry.sheetName.includes(' ') ? `'${entry.sheetName}'` : entry.sheetName;
    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
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

  const sheetName = entry.sheetName.includes(' ') ? `'${entry.sheetName}'` : entry.sheetName;
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

  const sheetName = entry.sheetName.includes(' ') ? `'${entry.sheetName}'` : entry.sheetName;
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

module.exports = {
  // Existing
  getPipelineData, getStrategyCascade, isConfigured, clearCache,
  // New — registry
  SHEET_REGISTRY, SPREADSHEET_KEYS, isSpreadsheetConfigured, getSpreadsheetId,
  // New — CRUD
  fetchSheet, appendRow, updateRow, deleteRow, getSheetHeaders,
  // New — internal (for hydration service)
  parseRows,
};
