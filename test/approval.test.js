const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createApproval, resolveApproval, getPendingApprovals } = require('../server/services/approval');

describe('Approval Gate', () => {
  it('creates a pending approval with unique ID', () => {
    const { id } = createApproval('write_file', { file_path: 'test.md' }, 'tool_1');
    assert.ok(id.startsWith('approval_'));
    const pending = getPendingApprovals();
    const found = pending.find(a => a.id === id);
    assert.ok(found);
    assert.equal(found.toolName, 'write_file');
    // Clean up
    resolveApproval(id, false);
  });

  it('resolves approval as approved', async () => {
    const { id, promise } = createApproval('notion_create_page', {}, 'tool_2');
    resolveApproval(id, true);
    const result = await promise;
    assert.equal(result, true);
  });

  it('resolves approval as rejected', async () => {
    const { id, promise } = createApproval('notion_update_page', {}, 'tool_3');
    resolveApproval(id, false);
    const result = await promise;
    assert.equal(result, false);
  });

  it('removes approval after resolution', () => {
    const { id } = createApproval('write_file', {}, 'tool_4');
    resolveApproval(id, true);
    const pending = getPendingApprovals();
    assert.ok(!pending.find(a => a.id === id));
  });

  it('returns false for unknown approval ID', () => {
    const result = resolveApproval('nonexistent_id', true);
    assert.equal(result, false);
  });
});
