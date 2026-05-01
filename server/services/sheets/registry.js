'use strict';

// registry.js — spreadsheet key constants + SHEET_REGISTRY map
// Owns: SPREADSHEET_KEYS, SHEET_REGISTRY, getSpreadsheetId, isSpreadsheetConfigured
// Depends on: ../config (required lazily inside each function — honours test mock injection)
// DO NOT add: client init, cache, CRUD ops, tab-meta logic

// Note: config is NOT captured at module top. getSpreadsheetId and isSpreadsheetConfigured
// do require('../../config') at call time so that test harness injections into
// require.cache[CONFIG_PATH] are picked up even when this module stays cached
// between test runs (same lazy-require contract, Decision #73).

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
  DAILY_SALES: 'DAILY_SALES',
  GOOGLE_ADS: 'GOOGLE_ADS',
};

// Maps spreadsheet keys to config env var values
function getSpreadsheetId(spreadsheetKey) {
  const config = require('../../config');
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
    DAILY_SALES: config.DAILY_SALES_SPREADSHEET_ID,
    GOOGLE_ADS: config.GOOGLE_ADS_SPREADSHEET_ID,
  };
  return map[spreadsheetKey] || '';
}

function isSpreadsheetConfigured(spreadsheetKey) {
  const config = require('../../config');
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
  // Daily Sales (YDC - sales report workbook)
  //
  // SALES_YTD resolves to the Indian FY end-year tab (e.g. FY Apr 2026–Mar 2027 → tab "2027").
  // Indian FY starts April 1: months April–December belong to FY ending next year;
  // months January–March belong to FY ending current year.
  // Rotates automatically at midnight IST on April 1 (caller passes IST-shifted Date).
  // gid varies by FY tab — null means "let API resolve by name".
  //
  // SALES_LAST_FY resolves to the prior FY end-year tab (e.g. "2026" when current is "2027").
  // Used for like-for-like YTD comparisons.
  SALES_YTD: {
    spreadsheetKey: 'DAILY_SALES',
    sheetName: (now) => {
      const d = now instanceof Date ? now : new Date(now ?? Date.now());
      // caller passes IST-shifted Date, so getUTCMonth/getUTCFullYear = IST calendar values
      const m = d.getUTCMonth(); // April = 3
      const y = d.getUTCFullYear();
      return String(m >= 3 ? y + 1 : y); // April–Dec → FY ends next year; Jan–Mar → FY ends this year
    },
    gid: null,
  },
  SALES_LAST_FY: {
    spreadsheetKey: 'DAILY_SALES',
    sheetName: (now) => {
      const d = now instanceof Date ? now : new Date(now ?? Date.now());
      const m = d.getUTCMonth();
      const y = d.getUTCFullYear();
      const currentFYEndYear = m >= 3 ? y + 1 : y;
      return String(currentFYEndYear - 1);
    },
    gid: null,
  },
  SALES_CURRENT_MONTH: {
    spreadsheetKey: 'DAILY_SALES',
    // Dynamic: resolves to "<Month name> YYYY" at request time (e.g. "April 2026").
    // When called from daily-sales-service, `now` is an IST-shifted Date so
    // getUTCMonth/getUTCFullYear read the correct Indian calendar month even when
    // the server runs in UTC and it's after 18:30 UTC on the last day of a month.
    sheetName: (now) => {
      const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      const month = MONTH_NAMES[now.getUTCMonth()];
      const year = now.getUTCFullYear();
      return `${month} ${year}`;
    },
    gid: null,
  },
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
  // Google Ads
  GOOGLE_ADS_DASHBOARD: { spreadsheetKey: 'GOOGLE_ADS', sheetName: 'Dashboard', gid: '1627554479' },
  GOOGLE_ADS_CRUNCHING: { spreadsheetKey: 'GOOGLE_ADS', sheetName: 'Data_Crunching', gid: '1608352041' },
  GOOGLE_ADS_RAW: { spreadsheetKey: 'GOOGLE_ADS', sheetName: 'Raw_Data', gid: '592899582' },
  GOOGLE_ADS_SEARCH_TERMS: { spreadsheetKey: 'GOOGLE_ADS', sheetName: 'Raw_Search_Terms', gid: '620800794' },
};

module.exports = { SPREADSHEET_KEYS, SHEET_REGISTRY, getSpreadsheetId, isSpreadsheetConfigured };
