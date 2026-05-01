#!/usr/bin/env node
/**
 * verify-deliverables.mjs — SubagentStop deliverable verification
 *
 * Advisory only — checks that expected output sections are present in
 * subagent output. Writes warnings to stderr but never blocks (exit 0).
 *
 * Fires on: SubagentStop
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Map agent name → required output sections (advisory — all agents eventually pass)
const AGENT_EXPECTATIONS = {
  'code-reviewer': {
    required: ['APPROVE', 'BLOCK', 'REQUEST CHANGES'],
    matchAny: true, // at least one of these must appear
    hint: 'code-reviewer should output a verdict: APPROVE / REQUEST CHANGES / BLOCK',
  },
  'ux-auditor': {
    required: ['Visual consistency', 'CLEAN', 'NEEDS POLISH', 'INCONSISTENT'],
    matchAny: true,
    hint: 'ux-auditor should output a verdict and list visual consistency findings',
  },
  'tester': {
    required: ['Tests Written', 'Test Results', 'npm test'],
    matchAny: true,
    hint: 'tester should output Tests Written / Test Results sections',
  },
  'scribe': {
    required: ['Documentation Updated', 'Handoff'],
    matchAny: false, // all must appear
    hint: 'scribe should output Documentation Updated and Handoff sections',
  },
};

// These agents have no required output structure — pass through
const PASS_THROUGH_AGENTS = new Set([
  'backend-builder',
  'frontend-builder',
  'design-planner',
  'pixel',
  'devops-infra',
]);

// Read event from stdin
let rawInput = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { rawInput += chunk; });
process.stdin.on('end', () => {
  let event = {};
  try {
    event = JSON.parse(rawInput);
  } catch {
    process.exit(0);
  }

  // Extract agent name from event (SubagentStop payload)
  const agentName = event.agent_type || event.agent_name || event.subagent_type || '';
  const agentOutput = event.output || event.content || event.result || '';

  if (!agentName) {
    process.exit(0);
  }

  // Pass-through agents — no expectations
  if (PASS_THROUGH_AGENTS.has(agentName)) {
    process.exit(0);
  }

  const expectation = AGENT_EXPECTATIONS[agentName];
  if (!expectation) {
    // Unknown agent — pass through
    process.exit(0);
  }

  const outputText = typeof agentOutput === 'string' ? agentOutput : JSON.stringify(agentOutput);

  let missing = [];
  if (expectation.matchAny) {
    const anyFound = expectation.required.some(section => outputText.includes(section));
    if (!anyFound) {
      missing = expectation.required;
    }
  } else {
    missing = expectation.required.filter(section => !outputText.includes(section));
  }

  if (missing.length > 0) {
    const label = expectation.matchAny ? 'one of' : 'all of';
    process.stderr.write(
      `[verify-deliverables] WARNING: Agent '${agentName}' output missing ${label}: ${missing.join(', ')}\n` +
      `  Hint: ${expectation.hint}\n`
    );
  }

  // Advisory only — always exit 0 (never block)
  process.exit(0);
});
