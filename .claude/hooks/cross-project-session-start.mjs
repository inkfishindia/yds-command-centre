#!/usr/bin/env node

/**
 * Cross-Project SessionStart Hook
 *
 * Loads cross-project awareness on every session start:
 * 1. Own handoff.md (what this project was doing)
 * 2. shared/events.md filtered to events relevant to THIS project (last 7 days)
 * 3. Any briefs addressed to THIS project (shared/briefs/*-to-{team}-*.md)
 *
 * CONFIGURE: Set TEAM_NAME below to this project's team identifier.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, basename } from 'path';

// ============================================================
// CONFIGURE THIS PER PROJECT
const TEAM_NAME = 'all'; // 'marketing' | 'tech' | 'ops' | 'colin'
// ============================================================

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
}

const hookData = JSON.parse(input);
const cwd = hookData.cwd || process.cwd();
const parts = [];

// Resolve shared directory (market/shared/ — one level up from most projects)
// Adjust this path per project if needed
const sharedDir = join(cwd, '..', 'shared');

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

// 2. Load cross-project events (last 7 days, relevant to this team)
const eventsPath = join(sharedDir, 'events.md');
if (existsSync(eventsPath)) {
  try {
    const events = readFileSync(eventsPath, 'utf-8');
    const lines = events.split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('Date'));

    // Filter: events that mention this team in "To" column, or "all"
    const relevant = lines.filter(l => {
      const lower = l.toLowerCase();
      return lower.includes(TEAM_NAME) || lower.includes('all');
    });

    // Filter: last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const recent = relevant.filter(l => {
      const dateMatch = l.match(/\d{4}-\d{2}-\d{2}/);
      return dateMatch && dateMatch[0] >= sevenDaysAgo;
    });

    if (recent.length > 0) {
      parts.push('---');
      parts.push('## Cross-Team Events (affects ' + TEAM_NAME + ')');
      parts.push('| Date | From | To | Type | Event | Status |');
      parts.push('|------|------|----|------|-------|--------|');
      parts.push(recent.join('\n'));
    }
  } catch { /* non-critical */ }
}

// 3. Load briefs addressed to this team
const briefsDir = join(sharedDir, 'briefs');
if (existsSync(briefsDir)) {
  try {
    const briefFiles = readdirSync(briefsDir)
      .filter(f => f.includes(`-to-${TEAM_NAME}-`) && f.endsWith('.md'));

    if (briefFiles.length > 0) {
      // Only load briefs that aren't marked done
      const activeBriefs = [];
      for (const file of briefFiles) {
        const content = readFileSync(join(briefsDir, file), 'utf-8');
        if (!content.includes('Status | done')) {
          activeBriefs.push({ file, content: content.slice(0, 500) }); // First 500 chars
        }
      }

      if (activeBriefs.length > 0) {
        parts.push('---');
        parts.push(`## Active Briefs for ${TEAM_NAME} (${activeBriefs.length})`);
        for (const brief of activeBriefs) {
          parts.push(`\n### ${brief.file}`);
          parts.push(brief.content);
          if (brief.content.length >= 500) parts.push('... (read full brief for details)');
        }
      }
    }
  } catch { /* non-critical */ }
}

// 4. Load open loops (PRIORITY — surface first)
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

// Also check shared open loops for cross-team items
const sharedLoopsPath = join(sharedDir, 'open-loops.md');
if (existsSync(sharedLoopsPath)) {
  try {
    const loops = readFileSync(sharedLoopsPath, 'utf-8');
    const lines = loops.split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('Date') && !l.includes('Loop'));
    const relevant = lines.filter(l => {
      const lower = l.toLowerCase();
      return (lower.includes(TEAM_NAME) || lower.includes('all')) && (lower.includes('| open |') || lower.includes('| stale |'));
    });

    if (relevant.length > 0) {
      parts.push('---');
      parts.push(`## Cross-Team Open Loops (affecting ${TEAM_NAME})`);
      parts.push('| Date | Team | Loop | Context | Status | Age |');
      parts.push('|------|------|------|---------|--------|-----|');
      parts.push(relevant.join('\n'));
    }
  } catch { /* non-critical */ }
}

// 5. Load own recent activity (last 10 meaningful entries)
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

// Add cross-team reference pointer (always)
parts.push('---');
parts.push('**Cross-team work?** Read `../shared/team-capabilities.md` for what each team can do and who to ask.');
parts.push('**Brief template:** `../shared/brief-template.md`');

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
      additionalContext: '## Session Handoff\nNo previous session recorded yet.\nNo cross-team events or briefs pending.\n\n**Cross-team work?** Read `../shared/team-capabilities.md` for what each team can do and who to ask.'
    }
  }));
}
