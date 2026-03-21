const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('Factory Service — exports', () => {
  it('exports the expected service methods', () => {
    const factoryService = require('../server/services/factory-service');
    assert.equal(typeof factoryService.getConfig, 'function');
    assert.equal(typeof factoryService.replaceConfig, 'function');
    assert.equal(typeof factoryService.addMachine, 'function');
    assert.equal(typeof factoryService.updateMachine, 'function');
    assert.equal(typeof factoryService.deleteMachine, 'function');
    assert.equal(typeof factoryService.updateZone, 'function');
    assert.equal(typeof factoryService.updateOperating, 'function');
    assert.equal(typeof factoryService.applyFormulaDefaults, 'function');
  });
});

describe('Factory Service — applyFormulaDefaults', () => {
  const { applyFormulaDefaults } = require('../server/services/factory-service');

  it('fills in default formula and rules when missing', () => {
    const machine = applyFormulaDefaults({ id: 'M1' });
    assert.equal(typeof machine.formula, 'string');
    assert.ok(Array.isArray(machine.rules));
  });

  it('throws for non-string formula', () => {
    assert.throws(() => applyFormulaDefaults({ formula: 123 }), /formula must be a string/);
  });

  it('throws for non-array rules', () => {
    assert.throws(() => applyFormulaDefaults({ rules: 'bad' }), /rules must be an array/);
  });
});
