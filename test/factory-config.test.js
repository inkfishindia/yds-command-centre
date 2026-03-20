const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../server/data/factory-capacity.json');

// ── Route module ────────────────────────────────────────────────────────────

describe('Factory Route — module loading', () => {
  let factoryRoutes;

  it('loads the factory route module without crashing', () => {
    factoryRoutes = require('../server/routes/factory');
    assert.ok(factoryRoutes);
  });

  it('exports an express router', () => {
    assert.ok(typeof factoryRoutes === 'function' || factoryRoutes.stack);
  });
});

// ── Data file ────────────────────────────────────────────────────────────────

describe('Factory Config — data file integrity', () => {
  let config;

  before(() => {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    config = JSON.parse(raw);
  });

  it('data file parses as valid JSON', () => {
    assert.ok(config);
  });

  it('has a machines array', () => {
    assert.ok(Array.isArray(config.machines));
    assert.ok(config.machines.length > 0);
  });

  it('every machine has required fields: id, name, type, zone', () => {
    for (const m of config.machines) {
      assert.ok(m.id,   `machine missing id: ${JSON.stringify(m)}`);
      assert.ok(m.name, `machine "${m.id}" missing name`);
      assert.ok(m.type, `machine "${m.id}" missing type`);
      assert.ok(m.zone, `machine "${m.id}" missing zone`);
    }
  });

  it('machine ids are unique', () => {
    const ids = config.machines.map(m => m.id);
    const unique = new Set(ids);
    assert.equal(unique.size, ids.length, 'Duplicate machine ids found');
  });

  it('has a zones array', () => {
    assert.ok(Array.isArray(config.zones));
    assert.ok(config.zones.length > 0);
  });

  it('every zone has required fields: id, name, method, operators', () => {
    for (const z of config.zones) {
      assert.ok(z.id,      `zone missing id: ${JSON.stringify(z)}`);
      assert.ok(z.name,    `zone "${z.id}" missing name`);
      assert.ok(z.method,  `zone "${z.id}" missing method`);
      assert.ok(typeof z.operators === 'number', `zone "${z.id}" operators must be a number`);
    }
  });

  it('has an order_mix object with numeric values summing to 1', () => {
    assert.ok(config.order_mix && typeof config.order_mix === 'object');
    const total = Object.values(config.order_mix).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 1.0) < 0.001, `order_mix sums to ${total}, expected ~1.0`);
  });

  it('has an operating object with shift_hours and orders_per_day', () => {
    assert.ok(config.operating);
    assert.ok(typeof config.operating.shift_hours === 'number');
    assert.ok(typeof config.operating.orders_per_day === 'number');
  });

  it('has a formulas object', () => {
    assert.ok(config.formulas && typeof config.formulas === 'object');
    assert.ok(config.formulas.standard_zone, 'formulas.standard_zone missing');
    assert.ok(config.formulas.binding_constraint, 'formulas.binding_constraint missing');
    assert.ok(config.formulas.load_ratio, 'formulas.load_ratio missing');
  });

  it('contains CURER-01 as a sub-bottleneck', () => {
    const curer = config.machines.find(m => m.id === 'CURER-01');
    assert.ok(curer, 'CURER-01 not found');
    assert.equal(curer.is_sub_bottleneck, true);
  });

  it('fusing presses are marked shared', () => {
    const fusing = config.machines.filter(m => m.zone === 'FUSING');
    assert.ok(fusing.length > 0, 'no fusing machines found');
    for (const f of fusing) {
      assert.equal(f.is_shared, true, `${f.id} should be marked is_shared`);
      assert.ok(Array.isArray(f.shared_with), `${f.id} missing shared_with array`);
    }
  });

  // ── Formula and rules fields ────────────────────────────────────────────────

  it('every machine has a formula string', () => {
    for (const m of config.machines) {
      assert.ok(typeof m.formula === 'string' && m.formula.length > 0,
        `machine "${m.id}" missing or empty formula`);
    }
  });

  it('every machine has a rules array', () => {
    for (const m of config.machines) {
      assert.ok(Array.isArray(m.rules),
        `machine "${m.id}" missing rules array`);
    }
  });

  it('every zone has a formula string', () => {
    for (const z of config.zones) {
      assert.ok(typeof z.formula === 'string' && z.formula.length > 0,
        `zone "${z.id}" missing or empty formula`);
    }
  });

  it('every zone has a rules array', () => {
    for (const z of config.zones) {
      assert.ok(Array.isArray(z.rules),
        `zone "${z.id}" missing rules array`);
    }
  });

  it('CURER-01 has a caps_zone rule targeting DTG', () => {
    const curer = config.machines.find(m => m.id === 'CURER-01');
    assert.ok(curer, 'CURER-01 not found');
    const rule = curer.rules.find(r => r.type === 'caps_zone');
    assert.ok(rule, 'CURER-01 missing caps_zone rule');
    assert.equal(rule.target, 'DTG', 'caps_zone rule target must be DTG');
  });

  it('QC_PACK zone has a people_based rule', () => {
    const zone = config.zones.find(z => z.id === 'QC_PACK');
    assert.ok(zone, 'QC_PACK zone not found');
    const rule = zone.rules.find(r => r.type === 'people_based');
    assert.ok(rule, 'QC_PACK missing people_based rule');
  });

  it('DTG zone has a sub_bottleneck rule', () => {
    const zone = config.zones.find(z => z.id === 'DTG');
    assert.ok(zone, 'DTG zone not found');
    const rule = zone.rules.find(r => r.type === 'sub_bottleneck');
    assert.ok(rule, 'DTG zone missing sub_bottleneck rule');
    assert.equal(rule.bottleneck_machine, 'CURER-01', 'sub_bottleneck must name CURER-01');
  });

  it('fusing machines (FUSE-01..04) have shared_resource rules', () => {
    const fusing = config.machines.filter(m => m.id.startsWith('FUSE-'));
    assert.ok(fusing.length > 0, 'no FUSE- machines found');
    for (const f of fusing) {
      const rule = f.rules.find(r => r.type === 'shared_resource');
      assert.ok(rule, `${f.id} missing shared_resource rule`);
      assert.ok(Array.isArray(rule.target), `${f.id} shared_resource rule target must be an array`);
    }
  });
});

// ── Round-trip write test (uses tmp copy to avoid mutating real file) ────────

describe('Factory Config — safe round-trip write', () => {
  const TMP_FILE = path.join(__dirname, '../server/data/factory-capacity.test-tmp.json');

  before(() => {
    // Copy real file to tmp for mutation testing
    fs.copyFileSync(DATA_FILE, TMP_FILE);
  });

  after(() => {
    // Always clean up
    if (fs.existsSync(TMP_FILE)) fs.unlinkSync(TMP_FILE);
  });

  it('can read, mutate in memory, write, and re-read correctly', () => {
    const raw = fs.readFileSync(TMP_FILE, 'utf-8');
    const config = JSON.parse(raw);

    // Mutate a field in memory
    config.operating.shift_hours = 10;

    fs.writeFileSync(TMP_FILE, JSON.stringify(config, null, 2), 'utf-8');

    const reread = JSON.parse(fs.readFileSync(TMP_FILE, 'utf-8'));
    assert.equal(reread.operating.shift_hours, 10);
  });
});
