#!/usr/bin/env node

/**
 * PostToolUse Hook — Smart Activity Logger
 *
 * Fires after Write or Edit succeeds.
 * Logs WHAT was written/edited with meaningful context:
 * - File path (what changed)
 * - Action type (create vs edit)
 * - Brief description derived from the file path
 *
 * Replaces the useless "file-write | unknown | —" entries.
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename, dirname, relative } from 'path';

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
}

const hookData = JSON.parse(input);
const cwd = hookData.cwd || process.cwd();
const toolName = hookData.tool_name || 'unknown';
const toolInput = hookData.tool_input || {};
const toolResult = hookData.tool_result || {};

// Only log Write and Edit operations
if (!['Write', 'Edit'].includes(toolName)) {
  process.exit(0);
}

// Extract meaningful context
const filePath = toolInput.file_path || toolInput.path || 'unknown';
const relPath = filePath.startsWith('/') ? relative(cwd, filePath) : filePath;
const fileName = basename(filePath);

// Determine action type
let action = toolName === 'Write' ? 'create' : 'edit';

// Check if it was an update (Write to existing file)
if (toolName === 'Write' && toolResult && !String(toolResult).includes('created')) {
  action = 'overwrite';
}

// Derive description from file path
let description = relPath;
const parts = relPath.split('/');
if (parts.includes('agents')) {
  description = `agent: ${fileName.replace('.md', '')}`;
} else if (parts.includes('skills')) {
  const skillName = parts[parts.indexOf('skills') + 1] || fileName;
  description = `skill: ${skillName}`;
} else if (parts.includes('hooks')) {
  description = `hook: ${fileName}`;
} else if (parts.includes('references')) {
  description = `reference: ${fileName.replace('.md', '')}`;
} else if (parts.includes('templates')) {
  description = `template: ${fileName}`;
} else if (fileName === 'CLAUDE.md') {
  description = 'CLAUDE.md';
} else if (fileName === 'settings.json') {
  description = 'settings.json';
} else if (fileName === 'MEMORY.md' || fileName === 'SHARED.md') {
  description = fileName;
} else if (parts.includes('memory')) {
  description = `memory: ${fileName.replace('.md', '')}`;
}

// Log the entry
const sessionDir = join(cwd, 'data', 'sessions');
if (!existsSync(sessionDir)) {
  mkdirSync(sessionDir, { recursive: true });
}

const logPath = join(sessionDir, 'activity-log.md');
const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

// Create header if file is new or empty
if (!existsSync(logPath)) {
  appendFileSync(logPath, '# Activity Log\n\n| Date | Action | Details | Outcome |\n|------|--------|---------|----------|\n');
}

appendFileSync(logPath, `| ${timestamp} | ${action} | ${description} | ${relPath} |\n`);

// Silent success — don't pollute conversation
process.exit(0);
