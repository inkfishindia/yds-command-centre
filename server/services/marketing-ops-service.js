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

function normalizeContentItem(item) {
  const pubDate = item['Publish Date'];
  const dateStr = pubDate && typeof pubDate === 'object' ? pubDate.start : pubDate;
  return {
    id: item.id,
    url: item.url,
    name: item.Title || item.Name || '',
    status: item.Status || null,
    contentType: item['Content Type'] || null,
    contentPillar: item['Content Pillar'] || null,
    channels: item.Channel || [],
    audienceSegment: item['Audience Segment'] || [],
    productFocus: item['Product Focus'] || [],
    publishDate: dateStr ? dateStr.slice(0, 10) : null,
    owner: item.Owner || null,
    campaignName: item.campaignName || null,
    hook: item.Hook || '',
    caption: item['Caption / Copy'] || '',
    visualBrief: item['Visual Brief'] || '',
    notes: item.Notes || item.Hook || '',
  };
}

async function getContentForMonth(month) {
  // month format: 'YYYY-MM'
  const [year, mo] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  const lastDay = new Date(year, mo, 0).getDate(); // day 0 of next month = last day of this month
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  const [rawDated, rawUnscheduled] = await Promise.all([
    notionService.getContentCalendarByMonth(startDate, endDate),
    notionService.getUnscheduledContent(),
  ]);

  const items = rawDated.map(normalizeContentItem);
  const unscheduled = rawUnscheduled.map(normalizeContentItem);

  const byDate = {};
  for (const item of items) {
    if (!item.publishDate) continue;
    if (!byDate[item.publishDate]) byDate[item.publishDate] = [];
    byDate[item.publishDate].push(item);
  }

  return { month, items, byDate, unscheduled };
}

async function createContent(data) {
  return notionService.createContentCalendarItem(data);
}

async function updateContent(pageId, data) {
  return notionService.updateContentCalendarItem(pageId, data);
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

async function getMarketingTasks(filters = {}) {
  const tasks = await notionService.getMarketingTasks(filters);
  return { tasks };
}

async function getMarketingTasksSummary() {
  const tasks = await notionService.getMarketingTasks();
  const byStatus = {};
  const byPriority = {};
  const byChannel = {};

  for (const task of tasks) {
    const status = task.Status || 'Unset';
    const priority = task.Priority || 'Unset';
    const channel = task.Channel || 'Unset';
    byStatus[status] = (byStatus[status] || 0) + 1;
    byPriority[priority] = (byPriority[priority] || 0) + 1;
    byChannel[channel] = (byChannel[channel] || 0) + 1;
  }

  const today = new Date().toISOString().split('T')[0];
  const overdue = tasks.filter(t => {
    const due = t['Due Date'] && t['Due Date'].start ? t['Due Date'].start : null;
    return due && due < today && t.Status !== 'Done' && t.Status !== 'Cancelled';
  });
  const urgent = tasks.filter(t => t.Priority === 'Urgent' && t.Status !== 'Done' && t.Status !== 'Cancelled');
  const inProgress = tasks.filter(t => t.Status === 'In Progress');
  const blocked = tasks.filter(t => t.Status === 'Blocked');

  return {
    total: tasks.length,
    byStatus,
    byPriority,
    byChannel,
    overdue: overdue.length,
    urgent: urgent.length,
    inProgress: inProgress.length,
    blocked: blocked.length,
  };
}

module.exports = {
  getSummary,
  getCampaigns,
  getContent,
  getContentForMonth,
  createContent,
  updateContent,
  getSequences,
  getSessions,
  updateCampaignProperty,
  getCampaignCommitments,
  getMetrics,
  getMarketingTasks,
  getMarketingTasksSummary,
};
