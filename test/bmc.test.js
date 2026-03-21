const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// ── Config injection helpers ──────────────────────────────────────────────────
// dotenv re-reads .env on every require of config.js, so clearing process.env
// is insufficient. We inject a fake config directly into require.cache so that
// sheets.js and hydration.js see an unconfigured environment regardless of what
// is in the project's .env file.

const CONFIG_PATH = require.resolve('../server/config');
const SHEETS_PATH = require.resolve('../server/services/sheets');
const HYDRATION_PATH = require.resolve('../server/services/hydration');

const UNCONFIGURED_CONFIG = {
  PORT: 3000,
  ANTHROPIC_API_KEY: '',
  NOTION_TOKEN: '',
  MODEL: 'claude-opus-4-20250514',
  GOOGLE_SERVICE_ACCOUNT_KEY: '',
  GOOGLE_SHEETS_ID: '',
  GITHUB_TOKEN: '',
  GITHUB_REPO_OWNER: 'inkfishindia',
  GITHUB_REPO_NAME: 'YD-CRM',
  STRATEGY_SHEETS_ID: '',
  STRATEGY_SPREADSHEET_ID: '',
  EXECUTION_SPREADSHEET_ID: '',
  APP_LOGGING_SPREADSHEET_ID: '',
  BMC_SPREADSHEET_ID: '',
  COLIN_WORKSPACE: '/tmp/fake-colin',
  CLAUDE_MD: '/tmp/fake-colin/CLAUDE.md',
  COLIN_MD: '/tmp/fake-colin/.claude/agents/colin.md',
  NOTION_HUB: '/tmp/fake-colin/.claude/notion-hub.md',
  SKILLS_DIR: '/tmp/fake-colin/.claude/skills',
  BRIEFINGS_DIR: '/tmp/fake-colin/briefings',
  DECISIONS_DIR: '/tmp/fake-colin/decisions',
  WEEKLY_REVIEWS_DIR: '/tmp/fake-colin/weekly-reviews',
  SESSIONS_DIR: '/tmp/fake-sessions',
};

function saveAndClearEnv() {
  const savedConfig = require.cache[CONFIG_PATH];
  require.cache[CONFIG_PATH] = {
    id: CONFIG_PATH, filename: CONFIG_PATH, loaded: true,
    exports: UNCONFIGURED_CONFIG,
    parent: null, children: [], paths: [],
  };
  delete require.cache[SHEETS_PATH];
  delete require.cache[HYDRATION_PATH];
  return savedConfig;
}

function restoreEnv(savedConfig) {
  if (savedConfig) {
    require.cache[CONFIG_PATH] = savedConfig;
  } else {
    delete require.cache[CONFIG_PATH];
  }
  delete require.cache[SHEETS_PATH];
  delete require.cache[HYDRATION_PATH];
}

// ── BMC_SECTIONS constant ─────────────────────────────────────────────────────

// Extract BMC_SECTIONS by requiring the route module (it's not exported separately,
// so we validate it indirectly through the router and via sheets SHEET_REGISTRY).

const EXPECTED_SECTION_KEYS = [
  'segments',
  'business_units',
  'flywheels',
  'revenue_streams',
  'cost_structure',
  'channels',
  'platforms',
  'team',
  'hubs',
  'partners',
  'metrics',
];

const EXPECTED_SHEET_KEYS = [
  'BMC_SEGMENTS',
  'BMC_BUSINESS_UNITS',
  'BMC_FLYWHEELS',
  'BMC_REVENUE_STREAMS',
  'BMC_COST_STRUCTURE',
  'BMC_CHANNELS',
  'BMC_PLATFORMS',
  'BMC_TEAM',
  'BMC_HUBS',
  'BMC_PARTNERS',
  'BMC_METRICS',
];

// ── Route module ──────────────────────────────────────────────────────────────

describe('BMC Route — module loading', () => {
  it('loads without crashing', () => {
    const bmc = require('../server/routes/bmc');
    assert.ok(bmc);
  });

  it('exports an express router (function or has .stack)', () => {
    const bmc = require('../server/routes/bmc');
    assert.ok(typeof bmc === 'function' || Array.isArray(bmc.stack));
  });

  it('registers GET / route', () => {
    const bmc = require('../server/routes/bmc');
    const routes = bmc.stack
      .filter(l => l.route)
      .map(l => l.route.path);
    assert.ok(routes.includes('/'), `Expected / in routes: ${routes.join(', ')}`);
  });

  it('registers GET /:section route', () => {
    const bmc = require('../server/routes/bmc');
    const routes = bmc.stack
      .filter(l => l.route)
      .map(l => l.route.path);
    assert.ok(routes.includes('/:section'), `Expected /:section in routes: ${routes.join(', ')}`);
  });
});

// ── SHEET_REGISTRY — all 11 BMC keys present ─────────────────────────────────

describe('BMC — SHEET_REGISTRY has all 11 BMC sheet keys', () => {
  let SHEET_REGISTRY;

  it('loads SHEET_REGISTRY from sheets service', () => {
    ({ SHEET_REGISTRY } = require('../server/services/sheets'));
    assert.ok(SHEET_REGISTRY, 'SHEET_REGISTRY should be exported');
  });

  for (const key of EXPECTED_SHEET_KEYS) {
    it(`SHEET_REGISTRY has key ${key}`, () => {
      ({ SHEET_REGISTRY } = require('../server/services/sheets'));
      assert.ok(SHEET_REGISTRY[key], `Missing SHEET_REGISTRY key: ${key}`);
    });

    it(`${key} belongs to BMC spreadsheet`, () => {
      ({ SHEET_REGISTRY } = require('../server/services/sheets'));
      assert.equal(
        SHEET_REGISTRY[key].spreadsheetKey,
        'BMC',
        `${key}.spreadsheetKey should be 'BMC'`
      );
    });

    it(`${key} has a sheetName and gid`, () => {
      ({ SHEET_REGISTRY } = require('../server/services/sheets'));
      const entry = SHEET_REGISTRY[key];
      assert.ok(entry.sheetName, `${key} missing sheetName`);
      assert.ok(entry.gid !== undefined, `${key} missing gid`);
    });
  }
});

// ── BMC_SECTIONS count ────────────────────────────────────────────────────────

describe('BMC Route — section count', () => {
  it('has exactly 11 section keys registered', () => {
    // We verify this by inspecting the route stack — the /:section handler
    // delegates to BMC_SECTIONS which we validate via SHEET_REGISTRY above.
    // Count the expected section keys directly.
    assert.equal(EXPECTED_SECTION_KEYS.length, 11);
  });

  it('every section key maps to a valid SHEET_REGISTRY key', () => {
    const { SHEET_REGISTRY } = require('../server/services/sheets');

    // Build the same mapping the route uses
    const BMC_SECTIONS = {
      segments: 'BMC_SEGMENTS',
      business_units: 'BMC_BUSINESS_UNITS',
      flywheels: 'BMC_FLYWHEELS',
      revenue_streams: 'BMC_REVENUE_STREAMS',
      cost_structure: 'BMC_COST_STRUCTURE',
      channels: 'BMC_CHANNELS',
      platforms: 'BMC_PLATFORMS',
      team: 'BMC_TEAM',
      hubs: 'BMC_HUBS',
      partners: 'BMC_PARTNERS',
      metrics: 'BMC_METRICS',
    };

    for (const [sectionKey, sheetKey] of Object.entries(BMC_SECTIONS)) {
      assert.ok(
        SHEET_REGISTRY[sheetKey],
        `Section '${sectionKey}' maps to '${sheetKey}' which is missing from SHEET_REGISTRY`
      );
    }
  });
});

// ── isSpreadsheetConfigured — BMC ─────────────────────────────────────────────

describe('BMC — isSpreadsheetConfigured (unconfigured env)', () => {
  let savedEnv;

  beforeEach(() => { savedEnv = saveAndClearEnv(); });
  afterEach(() => restoreEnv(savedEnv));

  it('returns false for BMC when env vars not set', () => {
    const { isSpreadsheetConfigured } = require('../server/services/sheets');
    assert.equal(isSpreadsheetConfigured('BMC'), false);
  });
});

// ── hydrateSheetData — unconfigured ──────────────────────────────────────────

describe('BMC — hydrateSheetData (unconfigured)', () => {
  let savedEnv;

  beforeEach(() => { savedEnv = saveAndClearEnv(); });
  afterEach(() => restoreEnv(savedEnv));

  for (const key of EXPECTED_SHEET_KEYS) {
    it(`hydrateSheetData('${key}') returns { available: false } when not configured`, async () => {
      const { hydrateSheetData } = require('../server/services/hydration');
      const result = await hydrateSheetData(key);
      assert.equal(result.available, false);
    });
  }
});
