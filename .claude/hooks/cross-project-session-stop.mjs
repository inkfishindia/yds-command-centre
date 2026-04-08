#!/usr/bin/env node

/**
 * Cross-Project Stop Hook
 *
 * On session end:
 * 1. Checks if handoff.md was updated recently (allows stop if yes)
 * 2. If not: blocks stop, prompts Claude to:
 *    a. Update own handoff.md
 *    b. Update own decisions.md
 *    c. Log cross-team events to shared/events.md if applicable
 *    d. Create briefs for other teams if applicable
 *
 * CONFIGURE: Set TEAM_NAME below to this project's team identifier.
 */

import { readFileSync, appendFileSync, statSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ============================================================
// CONFIGURE THIS PER PROJECT
const TEAM_NAME = 'command-centre'; // 'marketing' | 'tech' | 'ops' | 'colin'
// ============================================================

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

// Log cost data
const costLogPath = join(sessionDir, 'cost-log.md');
const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

if (!existsSync(costLogPath)) {
  appendFileSync(costLogPath, '# Cost Log\n\n| Date | Session | Tokens | Turns |\n|------|---------|--------|-------|\n');
}
appendFileSync(costLogPath, `| ${timestamp} | ${hookData.session_id || 'unknown'} | — | — |\n`);

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
  const sharedEventsPath = join(cwd, '..', 'shared', 'events.md');
  const sharedBriefsDir = join(cwd, '..', 'shared', 'briefs');
  const sharedEventsExists = existsSync(sharedEventsPath);
  const sharedBriefsExists = existsSync(sharedBriefsDir);

  let reason = `Before stopping, complete these steps:\n\n`;
  reason += `**1. Update data/sessions/handoff.md** with:\n`;
  reason += `   - What Was Accomplished this session\n`;
  reason += `   - Key Decisions made and why\n`;
  reason += `   - What To Do Next\n\n`;
  reason += `**2. Update data/sessions/decisions.md** if any decisions were made (append rows).\n\n`;

  if (sharedEventsExists) {
    reason += `**3. Cross-team impact check:** If anything decided/built/changed affects other teams (marketing, tech, ops):\n`;
    reason += `   - Append a row to ../shared/events.md: | date | ${TEAM_NAME} | [affected teams] | [type] | [event] | new |\n`;
    reason += `   - Also create the event in Notion "Cross-Team Events" database if Notion MCP is available.\n\n`;
  }

  if (sharedBriefsExists) {
    reason += `**4. Brief check:** If you need work from another team:\n`;
    reason += `   - Create a brief at ../shared/briefs/${TEAM_NAME}-to-[team]-[number].md using the brief-template.md format.\n\n`;
  }

  reason += `**5. Open loops check:** List any work STARTED but NOT COMPLETED this session:\n`;
  reason += `   - Append to data/sessions/open-loops.md: | [date] | [what was started] | [context/status] | open | 0d |\n`;
  reason += `   - Mark any previously open loops that were COMPLETED this session as "done"\n`;
  reason += `   - If an open loop affects other teams, also append to ../shared/open-loops.md: | [date] | ${TEAM_NAME} | [loop] | [context] | open | 0d |\n\n`;

  reason += `Then you may stop.`;

  console.log(JSON.stringify({
    decision: "block",
    reason
  }));
}
