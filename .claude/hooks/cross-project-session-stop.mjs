#!/usr/bin/env node

/**
 * Stop Hook
 *
 * On session end:
 * 1. Checks if handoff.md was updated recently (allows stop if yes)
 * 2. If not: blocks stop, prompts Claude to update handoff.md, decisions.md, and open-loops.md
 */

import { readFileSync, statSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
}

const hookData = JSON.parse(input);
const cwd = hookData.cwd || process.cwd();

// Ensure session directory exists
const sessionDir = join(cwd, 'data', 'sessions');
if (!existsSync(sessionDir)) {
  mkdirSync(sessionDir, { recursive: true });
}

// Check if handoff was updated recently (within last 5 minutes)
const handoffPath = join(sessionDir, 'handoff.md');
let handoffFresh = false;

if (existsSync(handoffPath)) {
  try {
    const stats = statSync(handoffPath);
    const ageMs = Date.now() - stats.mtimeMs;
    const fiveMinutes = 5 * 60 * 1000;
    const content = readFileSync(handoffPath, 'utf-8');
    const isBlank = content.includes('No previous session recorded yet');
    handoffFresh = (ageMs < fiveMinutes) && !isBlank;
  } catch { /* treat as stale */ }
}

if (handoffFresh) {
  // Handoff is current — allow stop
  console.log(JSON.stringify({}));
} else {
  // Handoff is stale — block and prompt update
  let reason = `Before stopping, complete these steps:\n\n`;
  reason += `**1. Update data/sessions/handoff.md** with:\n`;
  reason += `   - What Was Accomplished this session\n`;
  reason += `   - Key Decisions made and why\n`;
  reason += `   - What To Do Next\n\n`;
  reason += `**2. Update data/sessions/decisions.md** if any decisions were made (append rows).\n\n`;
  reason += `**3. Open loops check:** List any work STARTED but NOT COMPLETED this session:\n`;
  reason += `   - Append to data/sessions/open-loops.md: | [date] | [what was started] | [context/status] | open | 0d |\n`;
  reason += `   - Mark any previously open loops that were COMPLETED this session as "done"\n\n`;
  reason += `Then you may stop.`;

  console.log(JSON.stringify({
    decision: "block",
    reason
  }));
}
