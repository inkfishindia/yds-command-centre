const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Colin's workspace — the business operating system with CLAUDE.md, skills, output dirs.
// Defaults to ../dan (sibling folder). Override via COLIN_WORKSPACE env var for deployment.
const COLIN_WORKSPACE = process.env.COLIN_WORKSPACE
  ? path.resolve(process.env.COLIN_WORKSPACE)
  : path.resolve(__dirname, '..', '..', 'dan');

module.exports = {
  PORT: process.env.PORT || 3000,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  NOTION_TOKEN: process.env.NOTION_TOKEN,
  MODEL: 'claude-opus-4-20250514',
  GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',
  GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID || '',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  GITHUB_REPO_OWNER: process.env.GITHUB_REPO_OWNER || 'inkfishindia',
  GITHUB_REPO_NAME: process.env.GITHUB_REPO_NAME || 'YD-CRM',
  STRATEGY_SHEETS_ID: process.env.STRATEGY_SHEETS_ID || '',
  STRATEGY_SPREADSHEET_ID: process.env.STRATEGY_SPREADSHEET_ID || '',
  EXECUTION_SPREADSHEET_ID: process.env.EXECUTION_SPREADSHEET_ID || '',
  APP_LOGGING_SPREADSHEET_ID: process.env.APP_LOGGING_SPREADSHEET_ID || '',
  BMC_SPREADSHEET_ID: process.env.BMC_SPREADSHEET_ID || '',

  // Colin's workspace paths
  COLIN_WORKSPACE,
  CLAUDE_MD: path.join(COLIN_WORKSPACE, 'CLAUDE.md'),
  COLIN_MD: path.join(COLIN_WORKSPACE, '.claude', 'agents', 'colin.md'),
  NOTION_HUB: path.join(COLIN_WORKSPACE, '.claude', 'notion-hub.md'),
  SKILLS_DIR: path.join(COLIN_WORKSPACE, '.claude', 'skills'),
  BRIEFINGS_DIR: path.join(COLIN_WORKSPACE, 'briefings'),
  DECISIONS_DIR: path.join(COLIN_WORKSPACE, 'decisions'),
  WEEKLY_REVIEWS_DIR: path.join(COLIN_WORKSPACE, 'weekly-reviews'),
  SESSIONS_DIR: path.join(__dirname, '..', '.sessions'),
};
