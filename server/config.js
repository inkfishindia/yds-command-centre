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
  MODEL: process.env.MODEL || 'claude-opus-4-20250514',
  PROVIDER: process.env.PROVIDER || 'anthropic', // 'anthropic' or 'deepseek'
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
  DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || 'deepseek-ai/deepseek-v3-2',
  GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',
  GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID || '',
  GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID || '',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  GITHUB_REPO_OWNER: process.env.GITHUB_REPO_OWNER || 'inkfishindia',
  GITHUB_REPO_NAME: process.env.GITHUB_REPO_NAME || 'YD-CRM',
  STRATEGY_SHEETS_ID: process.env.STRATEGY_SHEETS_ID || '',
  STRATEGY_SPREADSHEET_ID: process.env.STRATEGY_SPREADSHEET_ID || '',
  EXECUTION_SPREADSHEET_ID: process.env.EXECUTION_SPREADSHEET_ID || '',
  APP_LOGGING_SPREADSHEET_ID: process.env.APP_LOGGING_SPREADSHEET_ID || '',
  BMC_SPREADSHEET_ID: process.env.BMC_SPREADSHEET_ID || '',
  CRM_CONFIG_SPREADSHEET_ID: process.env.CRM_CONFIG_SPREADSHEET_ID || '',
  CRM_FLOWS_SPREADSHEET_ID: process.env.CRM_FLOWS_SPREADSHEET_ID || '',
  OPS_INVENTORY_SPREADSHEET_ID: process.env.OPS_INVENTORY_SPREADSHEET_ID || '',
  OPS_SALES_SPREADSHEET_ID: process.env.OPS_SALES_SPREADSHEET_ID || '',
  OPS_PRODUCTS_SPREADSHEET_ID: process.env.OPS_PRODUCTS_SPREADSHEET_ID || '',
  OPS_WAREHOUSE_SPREADSHEET_ID: process.env.OPS_WAREHOUSE_SPREADSHEET_ID || '',
  COMPETITOR_INTEL_SPREADSHEET_ID: process.env.COMPETITOR_INTEL_SPREADSHEET_ID || '',
  DAILY_SALES_SPREADSHEET_ID: process.env.DAILY_SALES_SPREADSHEET_ID || '',
  READ_MODEL_SYNC_ENABLED: process.env.READ_MODEL_SYNC_ENABLED !== 'false',
  READ_MODEL_SYNC_INTERVAL_MS: Number(process.env.READ_MODEL_SYNC_INTERVAL_MS || 15 * 60 * 1000),
  READ_MODEL_SYNC_STARTUP_DELAY_MS: Number(process.env.READ_MODEL_SYNC_STARTUP_DELAY_MS || 5 * 1000),
  DATABASE_URL: process.env.DATABASE_URL || '',
  DATABASE_SSL: process.env.DATABASE_SSL === 'true',

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
