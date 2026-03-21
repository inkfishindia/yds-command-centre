const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const config = require('../config');
const notionService = require('./notion');
const githubService = require('./github');
const sheetsService = require('./sheets');

async function getSummary() {
  return notionService.getTechTeamSummary();
}

async function getSprintItems(filters = {}) {
  let items = await notionService.getSprintItems();
  if (filters.status) items = items.filter((item) => item.Status === filters.status);
  if (filters.system) items = items.filter((item) => item.System === filters.system);
  if (filters.priority) items = items.filter((item) => item.Priority === filters.priority);
  if (filters.type) items = items.filter((item) => item.Type === filters.type);
  return { items };
}

async function getBugs() {
  const items = await notionService.getSprintItems();
  const bugs = items.filter((item) => item.Type === 'Bug' && item.Status !== 'Cancelled');
  const stats = {
    total: bugs.length,
    open: bugs.filter((bug) => bug.Status !== 'Done').length,
    byPriority: {},
    bySystem: {},
  };

  bugs
    .filter((bug) => bug.Status !== 'Done')
    .forEach((bug) => {
      const priority = bug.Priority || 'Unset';
      const system = bug.System || 'Unset';
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
      stats.bySystem[system] = (stats.bySystem[system] || 0) + 1;
    });

  return { bugs, stats };
}

async function getSpecs(filters = {}) {
  let specs = await notionService.getSpecLibrary();
  if (filters.status) specs = specs.filter((spec) => spec.Status === filters.status);
  return { specs };
}

async function getDecisions() {
  const decisions = await notionService.getTechDecisions();
  return { decisions };
}

async function getVelocity() {
  const archive = await notionService.getSprintArchive();
  return { sprints: archive };
}

async function getAgentsCatalog() {
  const agentsDir = path.join(__dirname, '../../.claude/agents');
  const skillsDir = path.join(__dirname, '../../.claude/skills');
  const agents = [];

  if (fsSync.existsSync(agentsDir)) {
    const files = (await fs.readdir(agentsDir)).filter((file) => file.endsWith('.md'));
    for (const file of files) {
      const content = await fs.readFile(path.join(agentsDir, file), 'utf8');
      const nameMatch = content.match(/^#\s+(.+)/m);
      const modelMatch = content.match(/model[:\s]+(\S+)/im) || content.match(/uses?\s+(sonnet|opus|haiku)/im);
      const descMatch = content.match(/(?:description|purpose)[:\s]+(.+)/im);
      agents.push({
        id: file.replace('.md', ''),
        name: nameMatch ? nameMatch[1].trim() : file.replace('.md', ''),
        model: modelMatch ? modelMatch[1].trim() : 'Unknown',
        description: descMatch ? descMatch[1].trim() : '',
        file,
      });
    }
  }

  const skills = [];
  if (fsSync.existsSync(skillsDir)) {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const indexPath = path.join(skillsDir, entry.name, 'index.md');
      const promptPath = path.join(skillsDir, entry.name, 'prompt.md');
      const readmePath = path.join(skillsDir, entry.name, 'README.md');
      let description = '';

      for (const filePath of [indexPath, promptPath, readmePath]) {
        if (!fsSync.existsSync(filePath)) continue;
        const content = await fs.readFile(filePath, 'utf8');
        const descLine = content.match(/(?:description|purpose)[:\s]+(.+)/im);
        if (descLine) description = descLine[1].trim();
        break;
      }

      skills.push({ id: entry.name, name: entry.name, description });
    }
  }

  return { agents, skills };
}

async function getStrategy() {
  return sheetsService.getStrategyCascade();
}

async function getGithubActivity() {
  return githubService.getRepoActivity(config.GITHUB_REPO_OWNER, config.GITHUB_REPO_NAME);
}

async function updateSprintItemProperty(pageId, property, value) {
  return notionService.updateSprintItemProperty(pageId, property, value);
}

module.exports = {
  getSummary,
  getSprintItems,
  getBugs,
  getSpecs,
  getDecisions,
  getVelocity,
  getAgentsCatalog,
  getStrategy,
  getGithubActivity,
  updateSprintItemProperty,
};
