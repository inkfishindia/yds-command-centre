const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const notionTools = require('../server/tools/notion-tools');
const fileTools = require('../server/tools/file-tools');
const { getAllToolDefinitions, requiresApproval } = require('../server/tools/tool-handler');

describe('Tool Definitions', () => {
  it('exports 7 total tool definitions', () => {
    const tools = getAllToolDefinitions();
    assert.equal(tools.length, 7);
  });

  it('every tool has name, description, and input_schema', () => {
    const tools = getAllToolDefinitions();
    for (const tool of tools) {
      assert.ok(tool.name, `Tool missing name`);
      assert.ok(tool.description, `${tool.name} missing description`);
      assert.ok(tool.input_schema, `${tool.name} missing input_schema`);
      assert.equal(tool.input_schema.type, 'object');
    }
  });

  it('every tool has required fields', () => {
    const tools = getAllToolDefinitions();
    for (const tool of tools) {
      assert.ok(Array.isArray(tool.input_schema.required), `${tool.name} missing required array`);
      assert.ok(tool.input_schema.required.length > 0, `${tool.name} has no required fields`);
    }
  });
});

describe('Approval Gate Classification', () => {
  it('write_file requires approval', () => {
    assert.equal(requiresApproval('write_file'), true);
  });

  it('notion_create_page requires approval', () => {
    assert.equal(requiresApproval('notion_create_page'), true);
  });

  it('notion_update_page requires approval', () => {
    assert.equal(requiresApproval('notion_update_page'), true);
  });

  it('read_file does NOT require approval', () => {
    assert.equal(requiresApproval('read_file'), false);
  });

  it('notion_query_database does NOT require approval', () => {
    assert.equal(requiresApproval('notion_query_database'), false);
  });

  it('notion_get_page does NOT require approval', () => {
    assert.equal(requiresApproval('notion_get_page'), false);
  });

  it('list_files does NOT require approval', () => {
    assert.equal(requiresApproval('list_files'), false);
  });

  it('unknown tool does NOT require approval', () => {
    assert.equal(requiresApproval('totally_fake_tool'), false);
  });
});

describe('Path Traversal Prevention', () => {
  it('allows valid workspace path', () => {
    const result = fileTools.resolveWorkspacePath('briefings/test.md');
    assert.ok(result);
    assert.ok(result.includes('briefings'));
  });

  it('blocks path traversal with ../', () => {
    const result = fileTools.resolveWorkspacePath('../../etc/passwd');
    assert.equal(result, null);
  });

  it('blocks absolute path outside workspace', () => {
    const result = fileTools.resolveWorkspacePath('/etc/passwd');
    assert.equal(result, null);
  });
});

describe('Notion Write Tools Set', () => {
  it('notion_create_page is a write tool', () => {
    assert.equal(notionTools.isWriteTool('notion_create_page'), true);
  });

  it('notion_update_page is a write tool', () => {
    assert.equal(notionTools.isWriteTool('notion_update_page'), true);
  });

  it('notion_query_database is NOT a write tool', () => {
    assert.equal(notionTools.isWriteTool('notion_query_database'), false);
  });
});
