const path = require('path');
const config = require('../config');

/**
 * Tool definitions for file operations within the workspace.
 */

const toolDefinitions = [
  {
    name: 'read_file',
    description: 'Read a file from the workspace. Can read briefings, decisions, weekly reviews, and other workspace files.',
    input_schema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Relative path from workspace root. Example: "briefings/2026-03-02-team-update.md"',
        },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file in the workspace. REQUIRES USER APPROVAL. Used for saving briefings, decisions, and weekly reviews.',
    input_schema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Relative path from workspace root. Example: "briefings/2026-03-02-team-update.md"',
        },
        content: {
          type: 'string',
          description: 'The content to write to the file',
        },
      },
      required: ['file_path', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'List files in a workspace directory. Use for browsing briefings, decisions, or weekly reviews.',
    input_schema: {
      type: 'object',
      properties: {
        directory: {
          type: 'string',
          description: 'Relative directory path from workspace root. Example: "briefings" or "decisions"',
        },
      },
      required: ['directory'],
    },
  },
];

const WRITE_TOOLS = new Set(['write_file']);

function isWriteTool(toolName) {
  return WRITE_TOOLS.has(toolName);
}

/**
 * Resolve a relative path to an absolute path, ensuring it stays within the workspace.
 * Returns null if the path escapes the workspace.
 */
function resolveWorkspacePath(relativePath) {
  const resolved = path.resolve(config.COLIN_WORKSPACE, relativePath);
  if (!resolved.startsWith(config.COLIN_WORKSPACE)) {
    return null; // Path traversal attempt
  }
  return resolved;
}

module.exports = { toolDefinitions, isWriteTool, resolveWorkspacePath };
