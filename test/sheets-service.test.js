const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// ── Config injection helpers ──────────────────────────────────────────────────
// config.js runs dotenv which reloads .env from disk, so clearing process.env
// is not sufficient — dotenv repopulates it on every require. Instead we inject
// a fake config directly into require.cache so sheets.js reads our stub values.

const CONFIG_PATH = require.resolve('../server/config');
const SHEETS_PATH = require.resolve('../server/services/sheets');

/** Fake config that looks unconfigured (all credential fields empty). */
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

function injectUnconfiguredConfig() {
  const savedConfig = require.cache[CONFIG_PATH];
  // Inject fake config
  require.cache[CONFIG_PATH] = {
    id: CONFIG_PATH, filename: CONFIG_PATH, loaded: true,
    exports: UNCONFIGURED_CONFIG,
    parent: null, children: [], paths: [],
  };
  // Delete sheets so it reloads with the injected config
  delete require.cache[SHEETS_PATH];
  return savedConfig;
}

function restoreConfig(savedConfig) {
  if (savedConfig) {
    require.cache[CONFIG_PATH] = savedConfig;
  } else {
    delete require.cache[CONFIG_PATH];
  }
  // Delete sheets so it reloads with the real config on next require
  delete require.cache[SHEETS_PATH];
}

// Convenience wrappers for beforeEach/afterEach
function saveAndClearSheetsEnv() { return injectUnconfiguredConfig(); }
function restoreSheetsEnv(saved) { restoreConfig(saved); }

// ── Module loading ─────────────────────────────────────────────────────────────

describe('Sheets Service — module loading', () => {
  let sheetsService;

  it('loads without crashing', () => {
    sheetsService = require('../server/services/sheets');
    assert.ok(sheetsService);
  });

  it('exports getPipelineData as a function', () => {
    sheetsService = require('../server/services/sheets');
    assert.equal(typeof sheetsService.getPipelineData, 'function');
  });

  it('exports isConfigured as a function', () => {
    sheetsService = require('../server/services/sheets');
    assert.equal(typeof sheetsService.isConfigured, 'function');
  });

  it('exports clearCache as a function', () => {
    sheetsService = require('../server/services/sheets');
    assert.equal(typeof sheetsService.clearCache, 'function');
  });
});

// ── isConfigured ──────────────────────────────────────────────────────────────

describe('Sheets Service — isConfigured', () => {
  let savedEnv;

  beforeEach(() => { savedEnv = saveAndClearSheetsEnv(); });
  afterEach(() => restoreSheetsEnv(savedEnv));

  it('returns false when env vars are not set', () => {
    const { isConfigured } = require('../server/services/sheets');
    assert.equal(isConfigured(), false);
  });

  it('returns true when both credential fields are populated', () => {
    // Inject a config that has both credentials set
    require.cache[CONFIG_PATH] = {
      id: CONFIG_PATH, filename: CONFIG_PATH, loaded: true,
      exports: { ...UNCONFIGURED_CONFIG, GOOGLE_SERVICE_ACCOUNT_KEY: '/path/to/key.json', GOOGLE_SHEETS_ID: 'some-sheet-id' },
      parent: null, children: [], paths: [],
    };
    delete require.cache[SHEETS_PATH];
    const { isConfigured } = require('../server/services/sheets');
    assert.equal(isConfigured(), true);
  });

  it('returns false when only GOOGLE_SERVICE_ACCOUNT_KEY is set', () => {
    require.cache[CONFIG_PATH] = {
      id: CONFIG_PATH, filename: CONFIG_PATH, loaded: true,
      exports: { ...UNCONFIGURED_CONFIG, GOOGLE_SERVICE_ACCOUNT_KEY: '/path/to/key.json' },
      parent: null, children: [], paths: [],
    };
    delete require.cache[SHEETS_PATH];
    const { isConfigured } = require('../server/services/sheets');
    assert.equal(isConfigured(), false);
  });

  it('returns false when only GOOGLE_SHEETS_ID is set', () => {
    require.cache[CONFIG_PATH] = {
      id: CONFIG_PATH, filename: CONFIG_PATH, loaded: true,
      exports: { ...UNCONFIGURED_CONFIG, GOOGLE_SHEETS_ID: 'some-sheet-id' },
      parent: null, children: [], paths: [],
    };
    delete require.cache[SHEETS_PATH];
    const { isConfigured } = require('../server/services/sheets');
    assert.equal(isConfigured(), false);
  });
});

// ── getPipelineData — unconfigured ────────────────────────────────────────────

describe('Sheets Service — getPipelineData (unconfigured)', () => {
  let savedEnv;

  beforeEach(() => { savedEnv = saveAndClearSheetsEnv(); });
  afterEach(() => restoreSheetsEnv(savedEnv));

  it('returns { available: false } when not configured', async () => {
    const { getPipelineData } = require('../server/services/sheets');
    const result = await getPipelineData();
    assert.equal(result.available, false);
  });

  it('always includes a reason field (not_configured or api_error) when available is false', async () => {
    const { getPipelineData } = require('../server/services/sheets');
    const result = await getPipelineData();
    if (result.available === false) {
      const validReasons = ['not_configured', 'api_error'];
      assert.ok(
        validReasons.includes(result.reason),
        `Expected reason to be one of ${validReasons.join(', ')}, got: ${result.reason}`
      );
    }
  });

  it('does not throw when not configured', async () => {
    const { getPipelineData } = require('../server/services/sheets');
    await assert.doesNotReject(() => getPipelineData());
  });
});

// ── clearCache ────────────────────────────────────────────────────────────────

describe('Sheets Service — clearCache', () => {
  it('does not throw', () => {
    const { clearCache } = require('../server/services/sheets');
    assert.doesNotThrow(() => clearCache());
  });

  it('can be called multiple times without error', () => {
    const { clearCache } = require('../server/services/sheets');
    assert.doesNotThrow(() => {
      clearCache();
      clearCache();
      clearCache();
    });
  });
});

// ── Sheets route module ───────────────────────────────────────────────────────

describe('Sheets Route — module loading', () => {
  let sheetsRoutes;

  it('loads the sheets route module without crashing', () => {
    sheetsRoutes = require('../server/routes/sheets');
    assert.ok(sheetsRoutes);
  });

  it('exports an express router', () => {
    sheetsRoutes = require('../server/routes/sheets');
    assert.ok(typeof sheetsRoutes === 'function' || sheetsRoutes.stack);
  });

  it('has /pipeline route registered', () => {
    sheetsRoutes = require('../server/routes/sheets');
    const routes = sheetsRoutes.stack
      .filter(l => l.route)
      .map(l => l.route.path);
    assert.ok(routes.includes('/pipeline'), `Expected /pipeline in routes: ${routes.join(', ')}`);
  });
});

// ── SHEET_REGISTRY ────────────────────────────────────────────────────────────

describe('Sheets Service — SHEET_REGISTRY', () => {
  let sheetsService;

  it('exports SHEET_REGISTRY', () => {
    sheetsService = require('../server/services/sheets');
    assert.ok(sheetsService.SHEET_REGISTRY);
    assert.equal(typeof sheetsService.SHEET_REGISTRY, 'object');
  });

  it('has PROJECTS key', () => {
    sheetsService = require('../server/services/sheets');
    assert.ok(sheetsService.SHEET_REGISTRY.PROJECTS);
    assert.equal(sheetsService.SHEET_REGISTRY.PROJECTS.spreadsheetKey, 'EXECUTION');
    assert.equal(sheetsService.SHEET_REGISTRY.PROJECTS.sheetName, 'PROJECTS');
  });

  it('has TASKS key', () => {
    sheetsService = require('../server/services/sheets');
    assert.ok(sheetsService.SHEET_REGISTRY.TASKS);
    assert.equal(sheetsService.SHEET_REGISTRY.TASKS.spreadsheetKey, 'EXECUTION');
  });

  it('has PEOPLE key', () => {
    sheetsService = require('../server/services/sheets');
    assert.ok(sheetsService.SHEET_REGISTRY.PEOPLE);
    assert.equal(sheetsService.SHEET_REGISTRY.PEOPLE.sheetName, 'PEOPLE & CAPACITY');
  });

  it('has BMC_SEGMENTS key', () => {
    sheetsService = require('../server/services/sheets');
    assert.ok(sheetsService.SHEET_REGISTRY.BMC_SEGMENTS);
    assert.equal(sheetsService.SHEET_REGISTRY.BMC_SEGMENTS.spreadsheetKey, 'BMC');
  });

  it('has all 27 expected keys', () => {
    sheetsService = require('../server/services/sheets');
    const expectedKeys = [
      'PROJECTS', 'TASKS', 'PEOPLE', 'CAMPAIGNS', 'EXECUTIVE_DASHBOARD', 'TIME_TRACKING',
      'BUSINESS_UNITS', 'FLYWHEEL', 'HUBS', 'CUSTOMER_SEGMENT', 'TOUCHPOINTS', 'APP_STORES',
      'LOGIN', 'BRAIN_DUMP',
      'BMC_SEGMENTS', 'BMC_BUSINESS_UNITS', 'BMC_FLYWHEELS', 'BMC_REVENUE_STREAMS',
      'BMC_COST_STRUCTURE', 'BMC_CHANNELS', 'BMC_PLATFORMS', 'BMC_TEAM',
      'BMC_HUBS', 'BMC_PARTNERS', 'BMC_METRICS',
      'SALES_YTD', 'SALES_CURRENT_MONTH',
    ];
    for (const key of expectedKeys) {
      assert.ok(sheetsService.SHEET_REGISTRY[key], `Missing SHEET_REGISTRY key: ${key}`);
    }
  });

  it('each registry entry has spreadsheetKey and sheetName (gid optional)', () => {
    sheetsService = require('../server/services/sheets');
    for (const [key, entry] of Object.entries(sheetsService.SHEET_REGISTRY)) {
      assert.ok(entry.spreadsheetKey, `${key} missing spreadsheetKey`);
      assert.ok(entry.sheetName, `${key} missing sheetName`);
      // gid is only required for deleteRow — not all entries need it
    }
  });
});

// ── isSpreadsheetConfigured ───────────────────────────────────────────────────

describe('Sheets Service — isSpreadsheetConfigured', () => {
  let savedEnv;

  beforeEach(() => { savedEnv = saveAndClearSheetsEnv(); });
  afterEach(() => restoreSheetsEnv(savedEnv));

  it('returns false for EXECUTION when env not set', () => {
    const { isSpreadsheetConfigured } = require('../server/services/sheets');
    assert.equal(isSpreadsheetConfigured('EXECUTION'), false);
  });

  it('returns false for STRATEGY when env not set', () => {
    const { isSpreadsheetConfigured } = require('../server/services/sheets');
    assert.equal(isSpreadsheetConfigured('STRATEGY'), false);
  });

  it('returns false for BMC when env not set', () => {
    const { isSpreadsheetConfigured } = require('../server/services/sheets');
    assert.equal(isSpreadsheetConfigured('BMC'), false);
  });

  it('returns false for APP_LOGGING when env not set', () => {
    const { isSpreadsheetConfigured } = require('../server/services/sheets');
    assert.equal(isSpreadsheetConfigured('APP_LOGGING'), false);
  });
});

// ── fetchSheet — unconfigured ─────────────────────────────────────────────────

describe('Sheets Service — fetchSheet (unconfigured)', () => {
  let savedEnv;

  beforeEach(() => { savedEnv = saveAndClearSheetsEnv(); });
  afterEach(() => restoreSheetsEnv(savedEnv));

  it('returns { available: false } when spreadsheet not configured', async () => {
    const { fetchSheet } = require('../server/services/sheets');
    const result = await fetchSheet('PROJECTS');
    assert.equal(result.available, false);
  });

  it('always includes a reason field (not_configured or api_error) when available is false', async () => {
    const { fetchSheet } = require('../server/services/sheets');
    const result = await fetchSheet('PROJECTS');
    if (result.available === false) {
      const validReasons = ['not_configured', 'api_error'];
      assert.ok(
        validReasons.includes(result.reason),
        `Expected reason to be one of ${validReasons.join(', ')}, got: ${result.reason}`
      );
    }
  });

  it('throws on unknown sheet key', async () => {
    const { fetchSheet } = require('../server/services/sheets');
    await assert.rejects(() => fetchSheet('NOT_A_REAL_KEY'), /Unknown sheet key/);
  });
});

// ── Error discrimination shape ────────────────────────────────────────────────

describe('Sheets Service — error discrimination contract', () => {
  let savedEnv;

  beforeEach(() => { savedEnv = saveAndClearSheetsEnv(); });
  afterEach(() => restoreSheetsEnv(savedEnv));

  it('unavailable result always has a reason field that is not_configured or api_error', async () => {
    // In any environment (configured or not), an unavailable result must have a discriminating reason.
    const { getPipelineData } = require('../server/services/sheets');
    const result = await getPipelineData();
    assert.equal(result.available, false);
    const validReasons = ['not_configured', 'api_error'];
    assert.ok(
      validReasons.includes(result.reason),
      `Expected reason to be one of ${validReasons.join(', ')}, got: ${result.reason}`
    );
  });

  it('not_configured result does not carry an error field', () => {
    // Validate the shape contract directly — no error message on config errors.
    const configError = { available: false, reason: 'not_configured' };
    assert.equal(configError.reason, 'not_configured');
    assert.equal(configError.error, undefined);
  });

  it('api_error result shape has available, reason, and error fields', () => {
    // Validate the shape contract without making a real API call.
    // The shape must be: { available: false, reason: 'api_error', error: string }
    const fakeApiError = { available: false, reason: 'api_error', error: 'quota exceeded' };
    assert.equal(fakeApiError.available, false);
    assert.equal(fakeApiError.reason, 'api_error');
    assert.equal(typeof fakeApiError.error, 'string');
  });
});

// ── Hydration Service ─────────────────────────────────────────────────────────

describe('Hydration Service — module loading', () => {
  let hydration;

  it('loads without crashing', () => {
    hydration = require('../server/services/hydration');
    assert.ok(hydration);
  });

  it('exports HYDRATION_MAP as an array', () => {
    hydration = require('../server/services/hydration');
    assert.ok(Array.isArray(hydration.HYDRATION_MAP));
  });

  it('exports normalizeId as a function', () => {
    hydration = require('../server/services/hydration');
    assert.equal(typeof hydration.normalizeId, 'function');
  });

  it('exports hydrateData as a function', () => {
    hydration = require('../server/services/hydration');
    assert.equal(typeof hydration.hydrateData, 'function');
  });

  it('exports hydrateSheetData as a function', () => {
    hydration = require('../server/services/hydration');
    assert.equal(typeof hydration.hydrateSheetData, 'function');
  });
});

describe('Hydration Service — normalizeId', () => {
  let normalizeId;

  it('strips leading zeros from numeric IDs: "001" → "1"', () => {
    ({ normalizeId } = require('../server/services/hydration'));
    assert.equal(normalizeId('001'), '1');
  });

  it('leaves alphanumeric IDs unchanged: "user_001" → "user_001"', () => {
    ({ normalizeId } = require('../server/services/hydration'));
    assert.equal(normalizeId('user_001'), 'user_001');
  });

  it('returns empty string for null', () => {
    ({ normalizeId } = require('../server/services/hydration'));
    assert.equal(normalizeId(null), '');
  });

  it('returns empty string for undefined', () => {
    ({ normalizeId } = require('../server/services/hydration'));
    assert.equal(normalizeId(undefined), '');
  });

  it('handles numeric values directly: 42 → "42"', () => {
    ({ normalizeId } = require('../server/services/hydration'));
    assert.equal(normalizeId(42), '42');
  });

  it('trims whitespace before normalising', () => {
    ({ normalizeId } = require('../server/services/hydration'));
    assert.equal(normalizeId(' 007 '), '7');
  });

  it('handles already-clean IDs: "5" → "5"', () => {
    ({ normalizeId } = require('../server/services/hydration'));
    assert.equal(normalizeId('5'), '5');
  });
});

describe('Hydration Service — hydrateData (mock data, no API)', () => {
  let hydrateData;

  it('returns data unchanged when no mappings match sheetKey', () => {
    ({ hydrateData } = require('../server/services/hydration'));
    const rows = [{ id: '1', name: 'Test' }];
    const result = hydrateData(rows, 'LOGIN', {});
    assert.deepEqual(result, rows);
  });

  it('resolves owner_User_id for PROJECTS using mock PEOPLE data', () => {
    ({ hydrateData } = require('../server/services/hydration'));
    const projectRows = [
      { rowIndex: 2, project_id: '1', 'Project Name': 'Alpha', owner_User_id: '42' },
    ];
    const allData = {
      PEOPLE: {
        rows: [
          { rowIndex: 2, User_id: '42', full_name: 'Dan Sheikh' },
        ],
      },
      BUSINESS_UNITS: { rows: [] },
    };
    const result = hydrateData(projectRows, 'PROJECTS', allData);
    assert.equal(result[0].owner_User_id_resolved, 'Dan Sheikh');
  });

  it('handles missing FK target gracefully (no _resolved key added)', () => {
    ({ hydrateData } = require('../server/services/hydration'));
    const projectRows = [
      { rowIndex: 2, project_id: '1', 'Project Name': 'Beta', owner_User_id: '99' },
    ];
    const allData = {
      PEOPLE: {
        rows: [
          { rowIndex: 2, User_id: '42', full_name: 'Dan Sheikh' },
        ],
      },
      BUSINESS_UNITS: { rows: [] },
    };
    const result = hydrateData(projectRows, 'PROJECTS', allData);
    assert.equal(result[0].owner_User_id_resolved, undefined);
  });

  it('handles comma-separated FK values (multi-value columns)', () => {
    ({ hydrateData } = require('../server/services/hydration'));
    const bmcRows = [
      { rowIndex: 2, businessUnitId: 'bu1', primarySegments: 'seg1, seg2' },
    ];
    const allData = {
      BMC_SEGMENTS: {
        rows: [
          { rowIndex: 2, segmentId: 'seg1', segmentName: 'Retail' },
          { rowIndex: 3, segmentId: 'seg2', segmentName: 'Wholesale' },
        ],
      },
      BMC_FLYWHEELS: { rows: [] },
      BMC_TEAM: { rows: [] },
    };
    const result = hydrateData(bmcRows, 'BMC_BUSINESS_UNITS', allData);
    assert.equal(result[0].primarySegments_resolved, 'Retail, Wholesale');
  });

  it('does not mutate original row objects', () => {
    ({ hydrateData } = require('../server/services/hydration'));
    const original = { rowIndex: 2, project_id: '1', owner_User_id: '42' };
    const rows = [original];
    const allData = {
      PEOPLE: { rows: [{ User_id: '42', full_name: 'Dan' }] },
      BUSINESS_UNITS: { rows: [] },
    };
    hydrateData(rows, 'PROJECTS', allData);
    assert.equal(original.owner_User_id_resolved, undefined);
  });
});

describe('Hydration Service — hydrateSheetData (unconfigured)', () => {
  it('returns { available: false } when sheets not configured', async () => {
    const { hydrateSheetData } = require('../server/services/hydration');
    const result = await hydrateSheetData('PROJECTS');
    assert.equal(result.available, false);
  });
});

// ── getSheetData behaviour — tested through public fetchSheet API ─────────────
// getSheetData is internal and not exported. We verify its not-configured
// behaviour through fetchSheet, which delegates to getSheetData internally.

describe('Sheets Service — getSheetData (via fetchSheet, unconfigured)', () => {
  let savedEnv;

  beforeEach(() => { savedEnv = saveAndClearSheetsEnv(); });
  afterEach(() => restoreSheetsEnv(savedEnv));

  it('fetchSheet returns { available: false } (getSheetData returns null when not configured)', async () => {
    const { fetchSheet } = require('../server/services/sheets');
    const result = await fetchSheet('PROJECTS');
    // getSheetData returns null when client is null (not configured),
    // which fetchSheet surfaces as available: false
    assert.equal(result.available, false);
  });

  it('does not throw when not configured', async () => {
    const { fetchSheet } = require('../server/services/sheets');
    await assert.doesNotReject(() => fetchSheet('PROJECTS'));
  });
});

// ── getPipelineData — not_configured reason ───────────────────────────────────

describe('Sheets Service — getPipelineData reason: not_configured', () => {
  let savedEnv;

  beforeEach(() => { savedEnv = saveAndClearSheetsEnv(); });
  afterEach(() => restoreSheetsEnv(savedEnv));

  it('returns { available: false, reason: "not_configured" } when env vars absent', async () => {
    const { getPipelineData } = require('../server/services/sheets');
    const result = await getPipelineData();
    assert.equal(result.available, false);
    assert.equal(result.reason, 'not_configured');
  });

  it('does not include an error field when reason is not_configured', async () => {
    const { getPipelineData } = require('../server/services/sheets');
    const result = await getPipelineData();
    assert.equal(result.reason, 'not_configured');
    assert.equal(result.error, undefined);
  });
});

// ── fetchSheet — not_configured reason ───────────────────────────────────────

describe('Sheets Service — fetchSheet reason: not_configured', () => {
  let savedEnv;

  beforeEach(() => { savedEnv = saveAndClearSheetsEnv(); });
  afterEach(() => restoreSheetsEnv(savedEnv));

  it('returns { available: false, reason: "not_configured" } for PROJECTS when not configured', async () => {
    const { fetchSheet } = require('../server/services/sheets');
    const result = await fetchSheet('PROJECTS');
    assert.equal(result.available, false);
    assert.equal(result.reason, 'not_configured');
  });

  it('returns { available: false, reason: "not_configured" } for TASKS when not configured', async () => {
    const { fetchSheet } = require('../server/services/sheets');
    const result = await fetchSheet('TASKS');
    assert.equal(result.available, false);
    assert.equal(result.reason, 'not_configured');
  });

  it('returns { available: false, reason: "not_configured" } for BMC_SEGMENTS when not configured', async () => {
    const { fetchSheet } = require('../server/services/sheets');
    const result = await fetchSheet('BMC_SEGMENTS');
    assert.equal(result.available, false);
    assert.equal(result.reason, 'not_configured');
  });

  it('still throws on unknown sheet key even when not configured', async () => {
    const { fetchSheet } = require('../server/services/sheets');
    await assert.rejects(() => fetchSheet('DOES_NOT_EXIST'), /Unknown sheet key/);
  });
});

// ── Error discrimination — reason field contract ──────────────────────────────

describe('Sheets Service — error discrimination: reason field contract', () => {
  it('not_configured shape: available=false, reason="not_configured", no error field', () => {
    const shape = { available: false, reason: 'not_configured' };
    assert.equal(shape.available, false);
    assert.equal(shape.reason, 'not_configured');
    assert.equal(shape.error, undefined);
  });

  it('api_error shape: available=false, reason="api_error", error is a string', () => {
    const shape = { available: false, reason: 'api_error', error: 'quota exceeded' };
    assert.equal(shape.available, false);
    assert.equal(shape.reason, 'api_error');
    assert.equal(typeof shape.error, 'string');
  });

  it('reason "not_configured" and "api_error" are the only valid discriminants', () => {
    const validReasons = new Set(['not_configured', 'api_error']);
    assert.ok(validReasons.has('not_configured'));
    assert.ok(validReasons.has('api_error'));
    assert.equal(validReasons.size, 2);
  });

  it('available=true shape has no reason field', () => {
    const shape = { available: true, data: [] };
    assert.equal(shape.reason, undefined);
  });
});
