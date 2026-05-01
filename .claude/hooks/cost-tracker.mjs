#!/usr/bin/env node
/**
 * cost-tracker.mjs — Append session token usage to data/sessions/cost-log.md
 *
 * Reads $CLAUDE_USAGE env var (set by Claude Code on Stop events).
 * Appends a table row to data/sessions/cost-log.md.
 * Creates the file with header row if it doesn't exist or is empty.
 *
 * Fires on: Stop (async, non-blocking)
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const COST_LOG = join(PROJECT_DIR, 'data', 'sessions', 'cost-log.md');
const HEADER = '| Timestamp | Session | Input Tokens | Output Tokens | Cache Reads | Model |\n|---|---|---|---|---|---|\n';

function getNow() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseUsage() {
  const raw = process.env.CLAUDE_USAGE;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const usage = parseUsage();
const inputTokens = usage?.input_tokens ?? 'n/a';
const outputTokens = usage?.output_tokens ?? 'n/a';
const cacheReads = usage?.cache_read_input_tokens ?? 'n/a';

// Get model from CLAUDE_MODEL env var (set by Claude Code) or usage payload
const model = process.env.CLAUDE_MODEL || usage?.model || 'unknown';

// Session ID — first 8 chars if available
const rawSessionId = process.env.CLAUDE_SESSION_ID || '';
const sessionId = rawSessionId ? rawSessionId.substring(0, 8) : 'n/a';

const row = `| ${getNow()} | ${sessionId} | ${inputTokens} | ${outputTokens} | ${cacheReads} | ${model} |\n`;

try {
  const fileExists = existsSync(COST_LOG);
  if (!fileExists) {
    writeFileSync(COST_LOG, HEADER + row, 'utf8');
  } else {
    const existing = readFileSync(COST_LOG, 'utf8');
    if (existing.trim().length === 0) {
      writeFileSync(COST_LOG, HEADER + row, 'utf8');
    } else {
      appendFileSync(COST_LOG, row, 'utf8');
    }
  }
} catch (err) {
  process.stderr.write(`[cost-tracker] Failed to write cost log: ${err.message}\n`);
  process.exit(1);
}

process.exit(0);
