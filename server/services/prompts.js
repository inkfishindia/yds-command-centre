const fs = require('fs');
const path = require('path');
const config = require('../config');

let systemPromptCache = null;
let systemPromptDate = null; // Track the date the prompt was cached
const skillPromptCache = new Map();

/**
 * Load and concatenate the system prompt from CLAUDE.md + colin.md + notion-hub.md
 * Re-caches daily so the embedded date stays current.
 */
function loadSystemPrompt() {
  const today = new Date().toISOString().split('T')[0];
  if (systemPromptCache && systemPromptDate === today) return systemPromptCache;
  // Invalidate if date changed
  systemPromptCache = null;

  const parts = [];

  // Core persona and operating rules
  try {
    parts.push(fs.readFileSync(config.CLAUDE_MD, 'utf-8'));
  } catch (err) {
    console.error('Failed to read CLAUDE.md:', err.message);
  }

  // Agent-specific instructions
  try {
    parts.push('\n---\n\n# Agent Instructions\n\n' + fs.readFileSync(config.COLIN_MD, 'utf-8'));
  } catch (err) {
    console.error('Failed to read colin.md:', err.message);
  }

  // Notion reference (so the agent knows database IDs, schemas, etc.)
  try {
    parts.push('\n---\n\n# Notion Reference\n\n' + fs.readFileSync(config.NOTION_HUB, 'utf-8'));
  } catch (err) {
    console.error('Failed to read notion-hub.md:', err.message);
  }

  // Add web-specific instructions
  parts.push(`\n---\n
# Web Interface Context

You are running inside the YDS Command Centre web application. Dan is chatting with you through a browser interface.

When you need to write to Notion or save files, use the provided tools. Write operations will be shown to Dan for approval before executing.

Today's date is ${new Date().toISOString().split('T')[0]}.
`);

  systemPromptCache = parts.join('\n');
  systemPromptDate = today;
  return systemPromptCache;
}

/**
 * Load a skill prompt by name (brief, decide, dump, health, review, route)
 */
function loadSkillPrompt(skillName) {
  if (skillPromptCache.has(skillName)) return skillPromptCache.get(skillName);

  const promptPath = path.join(config.SKILLS_DIR, skillName, 'prompt.md');
  try {
    const content = fs.readFileSync(promptPath, 'utf-8');
    skillPromptCache.set(skillName, content);
    return content;
  } catch (err) {
    console.error(`Failed to read skill prompt "${skillName}":`, err.message);
    return null;
  }
}

/**
 * List all available skills
 */
function listSkills() {
  try {
    const entries = fs.readdirSync(config.SKILLS_DIR, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .filter(name => {
        return fs.existsSync(path.join(config.SKILLS_DIR, name, 'prompt.md'));
      });
  } catch (err) {
    console.error('Failed to list skills:', err.message);
    return [];
  }
}

/**
 * Clear cached prompts (useful if files change)
 */
function clearCache() {
  systemPromptCache = null;
  skillPromptCache.clear();
}

module.exports = { loadSystemPrompt, loadSkillPrompt, listSkills, clearCache };
