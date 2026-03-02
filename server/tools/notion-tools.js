/**
 * Tool definitions for Notion operations that the Claude agent can call.
 * These mirror the operations documented in notion-hub.md.
 */

const toolDefinitions = [
  {
    name: 'notion_query_database',
    description: 'Query a Notion database with optional filters. Use this to read Focus Areas, Commitments, Projects, Decisions, People, Platforms, or Audiences. Returns an array of page objects with their properties.',
    input_schema: {
      type: 'object',
      properties: {
        database_id: {
          type: 'string',
          description: 'The Notion database ID to query',
        },
        filter: {
          type: 'object',
          description: 'Optional Notion filter object. Example: {"property": "Status", "select": {"equals": "Active"}}',
        },
        sorts: {
          type: 'array',
          description: 'Optional sort array. Example: [{"property": "Due Date", "direction": "ascending"}]',
        },
        page_size: {
          type: 'number',
          description: 'Number of results to return (max 100, default 50)',
        },
      },
      required: ['database_id'],
    },
  },
  {
    name: 'notion_get_page',
    description: 'Retrieve a single Notion page by ID. Returns the page with all properties.',
    input_schema: {
      type: 'object',
      properties: {
        page_id: {
          type: 'string',
          description: 'The Notion page ID to retrieve',
        },
      },
      required: ['page_id'],
    },
  },
  {
    name: 'notion_create_page',
    description: 'Create a new page in a Notion database. REQUIRES USER APPROVAL. Use this to create Commitments, Decisions, or Projects.',
    input_schema: {
      type: 'object',
      properties: {
        database_id: {
          type: 'string',
          description: 'The database to create the page in',
        },
        properties: {
          type: 'object',
          description: 'Page properties matching the database schema. Use the property names and formats from notion-hub.md.',
        },
      },
      required: ['database_id', 'properties'],
    },
  },
  {
    name: 'notion_update_page',
    description: 'Update properties of an existing Notion page. REQUIRES USER APPROVAL.',
    input_schema: {
      type: 'object',
      properties: {
        page_id: {
          type: 'string',
          description: 'The page ID to update',
        },
        properties: {
          type: 'object',
          description: 'Properties to update',
        },
      },
      required: ['page_id', 'properties'],
    },
  },
];

// Tools that require user approval before execution
const WRITE_TOOLS = new Set(['notion_create_page', 'notion_update_page']);

function isWriteTool(toolName) {
  return WRITE_TOOLS.has(toolName);
}

module.exports = { toolDefinitions, isWriteTool };
