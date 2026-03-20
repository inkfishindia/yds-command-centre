const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('Commitments Write Routes', () => {
  let commitmentRoutes;

  it('loads the commitments route module without crashing', () => {
    commitmentRoutes = require('../server/routes/commitments');
    assert.ok(commitmentRoutes);
  });

  it('exports an express router', () => {
    assert.ok(typeof commitmentRoutes === 'function' || commitmentRoutes.stack);
  });
});

describe('Notion Service — Write Functions', () => {
  let notionService;

  it('exports updateCommitmentStatus', () => {
    notionService = require('../server/services/notion');
    assert.equal(typeof notionService.updateCommitmentStatus, 'function');
  });

  it('exports updateCommitmentPriority', () => {
    assert.equal(typeof notionService.updateCommitmentPriority, 'function');
  });

  it('exports updateCommitmentDueDate', () => {
    assert.equal(typeof notionService.updateCommitmentDueDate, 'function');
  });

  it('exports updateCommitmentAssignee', () => {
    assert.equal(typeof notionService.updateCommitmentAssignee, 'function');
  });

  it('exports appendCommitmentNote', () => {
    assert.equal(typeof notionService.appendCommitmentNote, 'function');
  });

  it('exports invalidateCommitmentCaches', () => {
    assert.equal(typeof notionService.invalidateCommitmentCaches, 'function');
  });

  it('invalidateCommitmentCaches does not throw', () => {
    assert.doesNotThrow(() => notionService.invalidateCommitmentCaches());
  });
});
