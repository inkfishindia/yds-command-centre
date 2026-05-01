#!/usr/bin/env node
/**
 * keyword-detector.mjs — Deterministic skill routing via UserPromptSubmit
 *
 * Reads triggers from skill SKILL.md frontmatter and injects a hint into
 * context before Claude decides which skill to use. Turns ~70% probabilistic
 * skill matching into near-deterministic routing.
 *
 * Fires on: UserPromptSubmit
 * Exit 0: always (advisory injection only — never blocks)
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILLS_DIR = join(PROJECT_DIR, '.claude', 'skills');

// Skip informational queries — these should never trigger skill routing
const INFORMATIONAL_PATTERNS = [
  /^what is\b/i,
  /^what are\b/i,
  /^how does\b/i,
  /^how do\b/i,
  /^can you explain\b/i,
  /^explain\b/i,
  /^tell me about\b/i,
  /^describe\b/i,
];

function isInformational(prompt) {
  return INFORMATIONAL_PATTERNS.some(p => p.test(prompt.trim()));
}

function parseTriggersFromFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return [];

  const frontmatter = frontmatterMatch[1];

  // Parse YAML triggers array — handles both formats:
  // triggers: ["a", "b", "c"]
  // triggers:
  //   - a
  //   - b
  const inlineTriggers = frontmatter.match(/^triggers:\s*\[([^\]]*)\]/m);
  if (inlineTriggers) {
    return inlineTriggers[1]
      .split(',')
      .map(t => t.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  const blockTriggers = [];
  const blockMatch = frontmatter.match(/^triggers:\s*\n((?:\s+-\s+.+\n?)*)/m);
  if (blockMatch) {
    const lines = blockMatch[1].split('\n');
    for (const line of lines) {
      const m = line.match(/^\s+-\s+["']?(.+?)["']?\s*$/);
      if (m) blockTriggers.push(m[1]);
    }
  }

  return blockTriggers;
}

function parseNameFromFrontmatter(content) {
  const m = content.match(/^---\n[\s\S]*?^name:\s*(.+)$/m);
  return m ? m[1].trim() : null;
}

function loadSkillTriggers() {
  const skills = [];
  try {
    const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const dir of skillDirs) {
      const skillPath = join(SKILLS_DIR, dir, 'SKILL.md');
      try {
        const content = readFileSync(skillPath, 'utf8');
        const triggers = parseTriggersFromFrontmatter(content);
        const name = parseNameFromFrontmatter(content) || dir;
        if (triggers.length > 0) {
          skills.push({ name, triggers, dir });
        }
      } catch {
        // Skill missing SKILL.md — skip
      }
    }
  } catch {
    // Skills dir missing — skip
  }
  return skills;
}

function matchSkills(prompt, skills) {
  const promptLower = prompt.toLowerCase();
  const matched = [];

  for (const skill of skills) {
    for (const trigger of skill.triggers) {
      if (promptLower.includes(trigger.toLowerCase())) {
        matched.push(skill.name);
        break; // one match per skill is enough
      }
    }
  }

  return matched;
}

// Read event from stdin
let rawInput = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { rawInput += chunk; });
process.stdin.on('end', () => {
  let event = {};
  try {
    event = JSON.parse(rawInput);
  } catch {
    // Not valid JSON — pass through
    process.exit(0);
  }

  const prompt = event.prompt || event.message || '';
  if (!prompt || isInformational(prompt)) {
    process.exit(0);
  }

  const skills = loadSkillTriggers();
  if (skills.length === 0) {
    process.exit(0);
  }

  const matched = matchSkills(prompt, skills);
  if (matched.length === 0) {
    process.exit(0);
  }

  const hints = matched.map(name => `Hint: This request matches skill '${name}' — consider invoking via /${name} or the trigger phrase.`).join('\n');

  // Output JSON to inject hint into context
  const output = {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: hints
    }
  };

  process.stdout.write(JSON.stringify(output));
  process.exit(0);
});
