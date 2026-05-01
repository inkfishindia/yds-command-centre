#!/usr/bin/env node

/**
 * SessionStart Hook
 *
 * Loads local session context on every session start:
 * 1. Own handoff.md (what this project was doing)
 * 2. Own open-loops.md (unfinished work)
 * 3. Recent activity-log entries (last 10 meaningful entries)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
}

const hookData = JSON.parse(input);
const cwd = hookData.cwd || process.cwd();
const parts = [];

// 1. Load own handoff
const handoffPath = join(cwd, 'data', 'sessions', 'handoff.md');
if (existsSync(handoffPath)) {
  try {
    const handoff = readFileSync(handoffPath, 'utf-8').trim();
    if (handoff && !handoff.includes('No previous session recorded yet')) {
      parts.push('## Session Handoff');
      parts.push(handoff);
    }
  } catch { /* non-critical */ }
}

// 2. Load open loops (PRIORITY — surface first)
const openLoopsPath = join(cwd, 'data', 'sessions', 'open-loops.md');
if (existsSync(openLoopsPath)) {
  try {
    const loops = readFileSync(openLoopsPath, 'utf-8');
    const lines = loops.split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('Date') && !l.includes('Loop'));
    const openItems = lines.filter(l => l.includes('| open |') || l.includes('| stale |'));

    if (openItems.length > 0) {
      // Calculate age for each loop
      const withAge = openItems.map(l => {
        const dateMatch = l.match(/\d{4}-\d{2}-\d{2}/);
        if (dateMatch) {
          const age = Math.floor((Date.now() - new Date(dateMatch[0]).getTime()) / (24*60*60*1000));
          return l.replace(/\| \d+d \|$/, `| ${age}d |`);
        }
        return l;
      });

      parts.unshift(''); // blank line after
      parts.unshift(withAge.join('\n'));
      parts.unshift('|------|------|---------|--------|');
      parts.unshift('| Date | Loop | Context | Status |');
      parts.unshift(`## ⚠ Open Loops (${openItems.length} unfinished)`);
    }
  } catch { /* non-critical */ }
}

// 3. Load own recent activity (last 10 meaningful entries)
const activityPath = join(cwd, 'data', 'sessions', 'activity-log.md');
if (existsSync(activityPath)) {
  try {
    const log = readFileSync(activityPath, 'utf-8');
    const lines = log.split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('Date'));
    const meaningful = lines.filter(l => !l.includes('| unknown |'));
    const recent = meaningful.slice(-10);
    if (recent.length > 0) {
      parts.push('---');
      parts.push('## Recent Activity');
      parts.push('| Date | Action | Details | Outcome |');
      parts.push('|------|--------|---------|---------|');
      parts.push(recent.join('\n'));
    }
  } catch { /* non-critical */ }
}

// Output
if (parts.length > 0) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      additionalContext: parts.join('\n')
    }
  }));
} else {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      additionalContext: '## Session Handoff\nNo previous session recorded yet.'
    }
  }));
}
