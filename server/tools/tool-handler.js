const fs = require('fs');
const path = require('path');
const notionTools = require('./notion-tools');
const fileTools = require('./file-tools');
const { getClient: getNotionClient, simplify: simplifyProperties } = require('../services/notion');

/**
 * Get all tool definitions for the Claude API
 */
function getAllToolDefinitions() {
  return [
    ...notionTools.toolDefinitions,
    ...fileTools.toolDefinitions,
  ];
}

/**
 * Check if a tool call requires user approval
 */
function requiresApproval(toolName) {
  return notionTools.isWriteTool(toolName) || fileTools.isWriteTool(toolName);
}

/**
 * Execute a tool call and return the result
 */
async function executeTool(toolName, toolInput) {
  switch (toolName) {
    // --- Notion tools ---
    case 'notion_query_database':
      return await executeNotionQuery(toolInput);
    case 'notion_get_page':
      return await executeNotionGetPage(toolInput);
    case 'notion_create_page':
      return await executeNotionCreatePage(toolInput);
    case 'notion_update_page':
      return await executeNotionUpdatePage(toolInput);

    // --- File tools ---
    case 'read_file':
      return executeReadFile(toolInput);
    case 'write_file':
      return executeWriteFile(toolInput);
    case 'list_files':
      return executeListFiles(toolInput);

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// --- Notion implementations ---

async function executeNotionQuery({ database_id, filter, sorts, page_size }) {
  try {
    const notion = getNotionClient();
    const params = { database_id, page_size: page_size || 50 };
    if (filter) params.filter = filter;
    if (sorts) params.sorts = sorts;

    const response = await notion.databases.query(params);
    // Simplify the response -- extract property values
    const pages = response.results.map(page => ({
      id: page.id,
      url: page.url,
      properties: simplifyProperties(page.properties),
    }));
    return { results: pages, has_more: response.has_more };
  } catch (err) {
    return { error: `Notion query failed: ${err.message}` };
  }
}

async function executeNotionGetPage({ page_id }) {
  try {
    const notion = getNotionClient();
    const page = await notion.pages.retrieve({ page_id });
    return {
      id: page.id,
      url: page.url,
      properties: simplifyProperties(page.properties),
    };
  } catch (err) {
    return { error: `Notion get page failed: ${err.message}` };
  }
}

async function executeNotionCreatePage({ database_id, properties }) {
  try {
    const notion = getNotionClient();
    const notionProps = buildNotionProperties(properties);
    const page = await notion.pages.create({
      parent: { database_id },
      properties: notionProps,
    });
    return {
      id: page.id,
      url: page.url,
      message: 'Page created successfully',
    };
  } catch (err) {
    return { error: `Notion create failed: ${err.message}` };
  }
}

async function executeNotionUpdatePage({ page_id, properties }) {
  try {
    const notion = getNotionClient();
    const notionProps = buildNotionProperties(properties);
    const page = await notion.pages.update({
      page_id,
      properties: notionProps,
    });
    return {
      id: page.id,
      url: page.url,
      message: 'Page updated successfully',
    };
  } catch (err) {
    return { error: `Notion update failed: ${err.message}` };
  }
}

/**
 * Convert simplified property values back to Notion API format.
 * Handles the common patterns used in notion-hub.md.
 */
function buildNotionProperties(simpleProps) {
  const notionProps = {};
  for (const [key, value] of Object.entries(simpleProps)) {
    // Handle date format from notion-hub.md: "date:Field:start" and "date:Field:is_datetime"
    if (key.startsWith('date:')) {
      const parts = key.split(':');
      const fieldName = parts[1];
      const subField = parts[2]; // "start" or "is_datetime"
      if (!notionProps[fieldName]) {
        notionProps[fieldName] = { date: {} };
      }
      if (subField === 'start') {
        notionProps[fieldName].date.start = value;
      }
      // is_datetime is informational, Notion infers from format
      continue;
    }

    // Detect relation format: JSON array string of URLs
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

    // Common property types by convention
    if (key === 'Name') {
      notionProps[key] = { title: [{ text: { content: value } }] };
    } else if (['Status', 'Priority', 'Type', 'Source', 'Owner'].includes(key)) {
      notionProps[key] = { select: { name: value } };
    } else {
      // Default to rich_text
      notionProps[key] = { rich_text: [{ text: { content: String(value) } }] };
    }
  }
  return notionProps;
}

// --- File implementations ---

function executeReadFile({ file_path }) {
  const resolved = fileTools.resolveWorkspacePath(file_path);
  if (!resolved) return { error: 'Path outside workspace boundary' };

  try {
    const content = fs.readFileSync(resolved, 'utf-8');
    return { content, path: file_path };
  } catch (err) {
    return { error: `File read failed: ${err.message}` };
  }
}

function executeWriteFile({ file_path, content }) {
  const resolved = fileTools.resolveWorkspacePath(file_path);
  if (!resolved) return { error: 'Path outside workspace boundary' };

  // Ensure parent directory exists
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    fs.writeFileSync(resolved, content, 'utf-8');
    return { message: `File saved: ${file_path}`, path: file_path };
  } catch (err) {
    return { error: `File write failed: ${err.message}` };
  }
}

function executeListFiles({ directory }) {
  const resolved = fileTools.resolveWorkspacePath(directory);
  if (!resolved) return { error: 'Path outside workspace boundary' };

  try {
    if (!fs.existsSync(resolved)) {
      return { files: [], message: 'Directory does not exist' };
    }
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const files = entries
      .filter(e => e.isFile() && !e.name.startsWith('.'))
      .map(e => ({
        name: e.name,
        path: path.join(directory, e.name),
      }))
      .sort((a, b) => b.name.localeCompare(a.name)); // Newest first (date-prefixed names)
    return { files };
  } catch (err) {
    return { error: `Directory listing failed: ${err.message}` };
  }
}

module.exports = { getAllToolDefinitions, requiresApproval, executeTool };
