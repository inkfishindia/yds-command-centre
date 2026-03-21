const fs = require('fs').promises;
const path = require('path');
const notionService = require('./notion');

const METRICS_PATH = path.join(__dirname, '..', 'data', 'metrics.json');

async function getSummary() {
  return notionService.getMarketingOpsSummary();
}

async function getCampaigns(filters = {}) {
  let campaigns = await notionService.getCampaigns();
  if (filters.stage) {
    campaigns = campaigns.filter((campaign) => campaign.Stage === filters.stage);
  }
  return { campaigns };
}

async function getContent(filters = {}) {
  let content = await notionService.getContentCalendar();
  if (filters.status) {
    content = content.filter((item) => item.Status === filters.status);
  }
  return { content };
}

async function getSequences(filters = {}) {
  let sequences = await notionService.getSequences();
  if (filters.journeyStage) {
    sequences = sequences.filter((sequence) => sequence['Journey Stage'] === filters.journeyStage);
  }
  return { sequences };
}

async function getSessions(days) {
  const sessions = await notionService.getSessionsLog(days);
  return { sessions };
}

async function updateCampaignProperty(pageId, property, value) {
  return notionService.updateCampaignProperty(pageId, property, value);
}

async function getCampaignCommitments(pageId) {
  const commitments = await notionService.getCampaignCommitments(pageId);
  return { commitments };
}

async function getMetrics() {
  const raw = await fs.readFile(METRICS_PATH, 'utf-8');
  return JSON.parse(raw);
}

module.exports = {
  getSummary,
  getCampaigns,
  getContent,
  getSequences,
  getSessions,
  updateCampaignProperty,
  getCampaignCommitments,
  getMetrics,
};
