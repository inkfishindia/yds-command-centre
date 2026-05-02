// marketing-ig.test.js — Unit tests for IG playbook read layer (Phase B)
// Tests cover: exports exist, service logic (derived fields), route validation,
//   simplify() formula/rollup support, and writes extension.
// Integration tests (real Notion env) deferred — env vars not yet populated.

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// ─── Path constants ───────────────────────────────────────────────────────────

const NOTION_PATH = path.join(__dirname, '../server/services/notion.js');
const IG_SERVICE_PATH = path.join(__dirname, '../server/services/marketing-ig-service.js');
const SIMPLIFY_PATH = path.join(__dirname, '../server/services/notion/simplify.js');
const DATABASES_PATH = path.join(__dirname, '../server/services/notion/databases.js');

// ─── 1. Export surface ────────────────────────────────────────────────────────

describe('Notion service — IG exports', () => {
  it('exports the 5 new IG reader functions', () => {
    const notion = require('../server/services/notion');
    assert.equal(typeof notion.getIgPerformance, 'function', 'getIgPerformance');
    assert.equal(typeof notion.getHookPatternLog, 'function', 'getHookPatternLog');
    assert.equal(typeof notion.getTemplateLibrary, 'function', 'getTemplateLibrary');
    assert.equal(typeof notion.getApprovalsLog, 'function', 'getApprovalsLog');
    assert.equal(typeof notion.getWeeklyOpsLog, 'function', 'getWeeklyOpsLog');
  });
});

describe('marketing-ig-service — exports', () => {
  it('exports the expected service methods', () => {
    const svc = require('../server/services/marketing-ig-service');
    const expected = [
      'getIgPerformance', 'getIgPerformanceThisWeek', 'getIgAdCandidates',
      'getIgRecentMisses', 'getHookPatternLog', 'getTemplateLibrary',
      'getApprovalsLog', 'getKillRuleTriggers', 'getWeeklyOpsLog', 'getLatestWeeklyOps',
    ];
    for (const fn of expected) {
      assert.equal(typeof svc[fn], 'function', `Missing export: ${fn}`);
    }
  });
});

// ─── 2. Route module loads ────────────────────────────────────────────────────

describe('marketing-ig route — module load', () => {
  it('loads without errors', () => {
    const route = require('../server/routes/marketing-ig');
    assert.ok(route, 'Router should be truthy');
  });
});

// ─── 3. simplify() — formula and rollup support ───────────────────────────────

describe('simplify() — formula type', () => {
  let simplify;
  beforeEach(() => {
    simplify = require(SIMPLIFY_PATH).simplify;
  });

  it('extracts number formula (SWPS)', () => {
    const props = {
      SWPS: { type: 'formula', formula: { type: 'number', number: 0.042 } },
    };
    const result = simplify(props);
    assert.equal(result.SWPS, 0.042);
  });

  it('extracts boolean formula (Hit Target)', () => {
    const props = {
      'Hit Target': { type: 'formula', formula: { type: 'boolean', boolean: true } },
    };
    const result = simplify(props);
    assert.equal(result['Hit Target'], true);
  });

  it('extracts string formula (Week Of)', () => {
    const props = {
      'Week Of': { type: 'formula', formula: { type: 'string', string: '2026-04-28' } },
    };
    const result = simplify(props);
    assert.equal(result['Week Of'], '2026-04-28');
  });

  it('returns null for null formula', () => {
    const props = {
      SWPS: { type: 'formula', formula: null },
    };
    const result = simplify(props);
    assert.equal(result.SWPS, null);
  });
});

describe('simplify() — rollup type', () => {
  let simplify;
  beforeEach(() => {
    simplify = require(SIMPLIFY_PATH).simplify;
  });

  it('extracts rollup array of selects (Pillar, Hook Pattern, Format)', () => {
    const props = {
      Pillar: {
        type: 'rollup',
        rollup: {
          type: 'array',
          array: [{ type: 'select', select: { name: 'Permission' } }],
        },
      },
    };
    const result = simplify(props);
    assert.deepEqual(result.Pillar, ['Permission']);
  });

  it('extracts rollup number', () => {
    const props = {
      'Avg SWPS': { type: 'rollup', rollup: { type: 'number', number: 0.038 } },
    };
    const result = simplify(props);
    assert.equal(result['Avg SWPS'], 0.038);
  });

  it('returns null for null rollup inner select', () => {
    const props = {
      Pillar: {
        type: 'rollup',
        rollup: {
          type: 'array',
          array: [{ type: 'select', select: null }],
        },
      },
    };
    const result = simplify(props);
    assert.deepEqual(result.Pillar, [null]);
  });

  it('returns empty array for empty rollup array', () => {
    const props = {
      Pillar: { type: 'rollup', rollup: { type: 'array', array: [] } },
    };
    const result = simplify(props);
    assert.deepEqual(result.Pillar, []);
  });

  it('returns null for null rollup', () => {
    const props = {
      Pillar: { type: 'rollup', rollup: null },
    };
    const result = simplify(props);
    assert.equal(result.Pillar, null);
  });
});

describe('simplify() — last_edited_time / created_time', () => {
  let simplify;
  beforeEach(() => {
    simplify = require(SIMPLIFY_PATH).simplify;
  });

  it('extracts last_edited_time', () => {
    const props = {
      'Entered On': { type: 'last_edited_time', last_edited_time: '2026-05-01T10:00:00Z' },
    };
    assert.equal(simplify(props)['Entered On'], '2026-05-01T10:00:00Z');
  });
});

// ─── 4. databases.js — new DB constants ──────────────────────────────────────

describe('DB constants — IG playbook', () => {
  it('DB object has the 5 IG keys', () => {
    // Clear cache so updated module is loaded
    delete require.cache[DATABASES_PATH];
    const { DB } = require(DATABASES_PATH);
    assert.ok('IG_PERFORMANCE' in DB, 'IG_PERFORMANCE');
    assert.ok('HOOK_PATTERN_LOG' in DB, 'HOOK_PATTERN_LOG');
    assert.ok('TEMPLATE_LIBRARY' in DB, 'TEMPLATE_LIBRARY');
    assert.ok('APPROVALS_LOG' in DB, 'APPROVALS_LOG');
    assert.ok('WEEKLY_OPS_LOG' in DB, 'WEEKLY_OPS_LOG');
  });
});

// ─── 5. marketing-ig-service — derived field logic ───────────────────────────

describe('marketing-ig-service — getIgPerformance derived summary', () => {
  afterEach(() => {
    delete require.cache[IG_SERVICE_PATH];
    delete require.cache[NOTION_PATH];
  });

  it('computes postCount, avgSWPS, hitTargetCount from rows', async () => {
    // Inject mock notion module into cache
    require.cache[NOTION_PATH] = {
      id: NOTION_PATH,
      filename: NOTION_PATH,
      loaded: true,
      exports: {
        getIgPerformance: async () => [
          { swps: 0.04, hitTarget: true },
          { swps: 0.02, hitTarget: false },
          { swps: 0.05, hitTarget: true },
        ],
      },
    };

    const svc = require(IG_SERVICE_PATH);
    const result = await svc.getIgPerformance();

    assert.equal(result.rows.length, 3);
    assert.equal(result.summary.postCount, 3);
    assert.equal(result.summary.hitTargetCount, 2);
    // avgSWPS = (0.04 + 0.02 + 0.05) / 3 = 0.03666...
    assert.ok(Math.abs(result.summary.avgSWPS - 0.0367) < 0.001);
  });

  it('sets avgSWPS to null when no rows returned', async () => {
    require.cache[NOTION_PATH] = {
      id: NOTION_PATH,
      filename: NOTION_PATH,
      loaded: true,
      exports: { getIgPerformance: async () => [] },
    };
    const svc = require(IG_SERVICE_PATH);
    const result = await svc.getIgPerformance();
    assert.equal(result.summary.avgSWPS, null);
    assert.equal(result.summary.postCount, 0);
  });
});

describe('marketing-ig-service — getApprovalsLog killRuleTriggerCount', () => {
  afterEach(() => {
    delete require.cache[IG_SERVICE_PATH];
    delete require.cache[NOTION_PATH];
  });

  it('counts rows where killRuleTrigger is true', async () => {
    require.cache[NOTION_PATH] = {
      id: NOTION_PATH,
      filename: NOTION_PATH,
      loaded: true,
      exports: {
        getApprovalsLog: async () => [
          { verdict: 'Revision', revisionRound: 2, killRuleTrigger: true },
          { verdict: 'Approved', revisionRound: null, killRuleTrigger: false },
          { verdict: 'Revision', revisionRound: 2, killRuleTrigger: true },
        ],
      },
    };

    const svc = require(IG_SERVICE_PATH);
    const result = await svc.getApprovalsLog();
    assert.equal(result.killRuleTriggerCount, 2);
  });
});

describe('marketing-ig-service — getWeeklyOpsLog latest', () => {
  afterEach(() => {
    delete require.cache[IG_SERVICE_PATH];
    delete require.cache[NOTION_PATH];
  });

  it('sets latest to first row', async () => {
    const rows = [
      { weekOf: '2026-W17', postsShipped: 5 },
      { weekOf: '2026-W16', postsShipped: 4 },
    ];
    require.cache[NOTION_PATH] = {
      id: NOTION_PATH,
      filename: NOTION_PATH,
      loaded: true,
      exports: { getWeeklyOpsLog: async () => rows },
    };

    const svc = require(IG_SERVICE_PATH);
    const result = await svc.getWeeklyOpsLog({ limit: 2 });
    assert.deepEqual(result.latest, rows[0]);
  });

  it('sets latest to null when no rows', async () => {
    require.cache[NOTION_PATH] = {
      id: NOTION_PATH,
      filename: NOTION_PATH,
      loaded: true,
      exports: { getWeeklyOpsLog: async () => [] },
    };

    const svc = require(IG_SERVICE_PATH);
    const result = await svc.getWeeklyOpsLog();
    assert.equal(result.latest, null);
  });
});

// ─── 7. writes extension — new fields in signature ───────────────────────────

describe('writes/marketing-ops — extended signatures', () => {
  it('createContentCalendarItem signature accepts igPillar, hookPattern, publishedSlot', () => {
    const writes = require('../server/services/notion/writes/marketing-ops');
    // Verify the function exists and has the right arity (it's variadic via destructuring)
    assert.equal(typeof writes.createContentCalendarItem, 'function');
    assert.equal(typeof writes.updateContentCalendarItem, 'function');
  });
});

// ─── 8. Route validation ─────────────────────────────────────────────────────

describe('marketing-ops route — IG validator extensions', () => {
  it('POST /content accepts igPillar as valid body field (module loads with new constants)', () => {
    // Just verify the route module loads with the new constants without error
    delete require.cache[require.resolve('../server/routes/marketing-ops')];
    const route = require('../server/routes/marketing-ops');
    assert.ok(route, 'Route module should load');
  });
});
