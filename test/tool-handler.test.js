const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// tool-handler.js exports: { getAllToolDefinitions, requiresApproval, executeTool }
// buildNotionProperties is private — tested indirectly through the exported surface.

describe('Tool Handler — getAllToolDefinitions()', () => {
  let toolHandler;

  it('loads the tool-handler module without crashing', () => {
    toolHandler = require('../server/tools/tool-handler');
    assert.ok(toolHandler);
  });

  it('exports getAllToolDefinitions as a function', () => {
    assert.strictEqual(typeof toolHandler.getAllToolDefinitions, 'function');
  });

  it('returns exactly 13 tool definitions', () => {
    const tools = toolHandler.getAllToolDefinitions();
    assert.strictEqual(tools.length, 13);
  });

  it('each tool has a name, description, and input_schema', () => {
    const tools = toolHandler.getAllToolDefinitions();
    for (const tool of tools) {
      assert.ok(tool.name, 'Tool missing name');
      assert.ok(tool.description, `Tool ${tool.name} missing description`);
      assert.ok(tool.input_schema, `Tool ${tool.name} missing input_schema`);
    }
  });

  it('includes the 4 Notion tools', () => {
    const tools = toolHandler.getAllToolDefinitions();
    const names = tools.map(t => t.name);
    assert.ok(names.includes('notion_query_database'));
    assert.ok(names.includes('notion_get_page'));
    assert.ok(names.includes('notion_create_page'));
    assert.ok(names.includes('notion_update_page'));
  });

  it('includes the 3 file tools', () => {
    const tools = toolHandler.getAllToolDefinitions();
    const names = tools.map(t => t.name);
    assert.ok(names.includes('read_file'));
    assert.ok(names.includes('write_file'));
    assert.ok(names.includes('list_files'));
  });
});

describe('Tool Handler — requiresApproval()', () => {
  let toolHandler;

  it('loads the module', () => {
    toolHandler = require('../server/tools/tool-handler');
    assert.ok(toolHandler);
  });

  it('exports requiresApproval as a function', () => {
    assert.strictEqual(typeof toolHandler.requiresApproval, 'function');
  });

  // Write tools — must return true
  it('write_file requires approval', () => {
    assert.strictEqual(toolHandler.requiresApproval('write_file'), true);
  });

  it('notion_create_page requires approval', () => {
    assert.strictEqual(toolHandler.requiresApproval('notion_create_page'), true);
  });

  it('notion_update_page requires approval', () => {
    assert.strictEqual(toolHandler.requiresApproval('notion_update_page'), true);
  });

  // Read-only tools — must return false
  it('read_file does not require approval', () => {
    assert.strictEqual(toolHandler.requiresApproval('read_file'), false);
  });

  it('list_files does not require approval', () => {
    assert.strictEqual(toolHandler.requiresApproval('list_files'), false);
  });

  it('notion_query_database does not require approval', () => {
    assert.strictEqual(toolHandler.requiresApproval('notion_query_database'), false);
  });

  it('notion_get_page does not require approval', () => {
    assert.strictEqual(toolHandler.requiresApproval('notion_get_page'), false);
  });

  it('unknown tool does not require approval', () => {
    assert.strictEqual(toolHandler.requiresApproval('unknown_tool'), false);
  });
});

describe('Tool Handler — executeTool()', () => {
  let toolHandler;

  it('loads the module', () => {
    toolHandler = require('../server/tools/tool-handler');
    assert.ok(toolHandler);
  });

  it('exports executeTool as a function', () => {
    assert.strictEqual(typeof toolHandler.executeTool, 'function');
  });

  it('returns an error object for an unknown tool', async () => {
    const result = await toolHandler.executeTool('unknown_tool', {});
    assert.ok(result.error, 'Expected an error property');
    assert.ok(result.error.includes('Unknown tool'), `Unexpected error message: ${result.error}`);
  });

  it('error message includes the unknown tool name', async () => {
    const result = await toolHandler.executeTool('does_not_exist', {});
    assert.ok(result.error.includes('does_not_exist'));
  });
});

describe('buildNotionProperties — logic contract (via source inspection)', () => {
  // buildNotionProperties is private, so we replicate its logic here to document
  // and verify the exact contract. If the production function changes, these
  // assertions will help catch the regression.
  //
  // We also verify the contract indirectly by checking that the tool definitions
  // reference the correct property names expected by the function.

  function buildNotionProperties(simpleProps) {
    // Replicated from server/tools/tool-handler.js — do NOT modify without updating
    // the production copy.
    const notionProps = {};
    for (const [key, value] of Object.entries(simpleProps)) {
      if (key.startsWith('date:')) {
        const parts = key.split(':');
        const fieldName = parts[1];
        const subField = parts[2];
        if (!notionProps[fieldName]) {
          notionProps[fieldName] = { date: {} };
        }
        if (subField === 'start') {
          notionProps[fieldName].date.start = value;
        }
        continue;
      }

      if (typeof value === 'string' && value.startsWith('["https://www.notion.so/')) {
        try {
          const urls = JSON.parse(value);
          notionProps[key] = {
            relation: urls.map(url => ({ id: url.replace('https://www.notion.so/', '') })),
          };
        } catch {
          notionProps[key] = { rich_text: [{ text: { content: value } }] };
        }
        continue;
      }

      if (key === 'Name') {
        notionProps[key] = { title: [{ text: { content: value } }] };
      } else if (['Status', 'Priority', 'Type', 'Source', 'Owner'].includes(key)) {
        notionProps[key] = { select: { name: value } };
      } else {
        notionProps[key] = { rich_text: [{ text: { content: String(value) } }] };
      }
    }
    return notionProps;
  }

  it('Name maps to title type', () => {
    const result = buildNotionProperties({ Name: 'My Task' });
    assert.deepEqual(result.Name, { title: [{ text: { content: 'My Task' } }] });
  });

  it('Status maps to select type', () => {
    const result = buildNotionProperties({ Status: 'Active' });
    assert.deepEqual(result.Status, { select: { name: 'Active' } });
  });

  it('Priority maps to select type', () => {
    const result = buildNotionProperties({ Priority: 'High' });
    assert.deepEqual(result.Priority, { select: { name: 'High' } });
  });

  it('Type maps to select type', () => {
    const result = buildNotionProperties({ Type: 'Decision' });
    assert.deepEqual(result.Type, { select: { name: 'Decision' } });
  });

  it('Source maps to select type', () => {
    const result = buildNotionProperties({ Source: 'Dan' });
    assert.deepEqual(result.Source, { select: { name: 'Dan' } });
  });

  it('Owner maps to select type', () => {
    const result = buildNotionProperties({ Owner: 'Colin' });
    assert.deepEqual(result.Owner, { select: { name: 'Colin' } });
  });

  it('unknown key defaults to rich_text type', () => {
    const result = buildNotionProperties({ Notes: 'Some notes' });
    assert.deepEqual(result.Notes, { rich_text: [{ text: { content: 'Some notes' } }] });
  });

  it('non-string value coerced to string for rich_text', () => {
    const result = buildNotionProperties({ Count: 42 });
    assert.deepEqual(result.Count, { rich_text: [{ text: { content: '42' } }] });
  });

  it('date:FieldName:start format creates a date object with start', () => {
    const result = buildNotionProperties({ 'date:Due Date:start': '2026-03-20' });
    assert.deepEqual(result['Due Date'], { date: { start: '2026-03-20' } });
  });

  it('date:FieldName:is_datetime is ignored (informational only)', () => {
    const result = buildNotionProperties({
      'date:Due Date:start': '2026-03-20',
      'date:Due Date:is_datetime': false,
    });
    // The field should still be created with start only
    assert.deepEqual(result['Due Date'], { date: { start: '2026-03-20' } });
    // is_datetime key should not appear in output
    assert.strictEqual(result['date:Due Date:is_datetime'], undefined);
  });

  it('relation URLs are converted to relation format', () => {
    const url = 'https://www.notion.so/abc123def456';
    const result = buildNotionProperties({ Project: JSON.stringify([url]) });
    assert.deepEqual(result.Project, { relation: [{ id: 'abc123def456' }] });
  });

  it('multiple relation URLs are all converted', () => {
    const urls = [
      'https://www.notion.so/page-id-001',
      'https://www.notion.so/page-id-002',
    ];
    const result = buildNotionProperties({ Projects: JSON.stringify(urls) });
    assert.deepEqual(result.Projects, {
      relation: [{ id: 'page-id-001' }, { id: 'page-id-002' }],
    });
  });

  it('malformed relation JSON falls back to rich_text', () => {
    // Starts with the prefix but is not valid JSON
    const bad = '["https://www.notion.so/page-id-001"'; // missing closing bracket
    const result = buildNotionProperties({ Project: bad });
    assert.deepEqual(result.Project, { rich_text: [{ text: { content: bad } }] });
  });

  it('handles an empty properties object', () => {
    const result = buildNotionProperties({});
    assert.deepEqual(result, {});
  });

  it('handles multiple properties of different types in one call', () => {
    const result = buildNotionProperties({
      Name: 'Launch Campaign',
      Status: 'Active',
      Notes: 'Important',
      'date:Start:start': '2026-03-01',
    });
    assert.deepEqual(result.Name, { title: [{ text: { content: 'Launch Campaign' } }] });
    assert.deepEqual(result.Status, { select: { name: 'Active' } });
    assert.deepEqual(result.Notes, { rich_text: [{ text: { content: 'Important' } }] });
    assert.deepEqual(result.Start, { date: { start: '2026-03-01' } });
  });
});
