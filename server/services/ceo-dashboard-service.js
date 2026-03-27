'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const config = require('../config');
const dashboardService = require('./dashboard-service');
const marketingOpsService = require('./marketing-ops-service');
const techTeamService = require('./tech-team-service');
const opsService = require('./ops-service');
const crmService = require('./crm-service');
const notionService = require('./notion');
const calendarService = require('./google-calendar');

const CACHE_TTL_MS = 2 * 60 * 1000;
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT_DIR, 'data', 'sessions');
const CLAUDE_DIR = path.join(ROOT_DIR, '.claude');
const OUTPUTS_DIR = path.join(ROOT_DIR, 'outputs');
const KNOWLEDGE_DIR = path.join(ROOT_DIR, 'knowledge');
const REVIEW_STATE_PATH = path.join(DATA_DIR, 'ceo-review-state.json');

let ceoDashboardCache = null;

function getFreshCache() {
  if (!ceoDashboardCache) return null;
  if (Date.now() - ceoDashboardCache.time > CACHE_TTL_MS) return null;
  return ceoDashboardCache.data;
}

function safeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleFromFilename(filePath) {
  return path.basename(filePath, path.extname(filePath))
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeHealthTone(health) {
  const raw = String(health || '').toLowerCase();
  if (raw.includes('off track') || raw.includes('critical')) return 'critical';
  if (raw.includes('risk') || raw.includes('attention') || raw.includes('warning')) return 'warning';
  return 'healthy';
}

function capacityTone(capacity) {
  if (capacity === 'overloaded') return 'critical';
  if (capacity === 'moderate') return 'warning';
  return 'healthy';
}

async function readTextFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

async function statSafe(filePath) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

async function fileExists(filePath) {
  return !!(await statSafe(filePath));
}

async function listFilesIfPresent(dirPath, matcher = () => true) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && matcher(entry.name))
      .map((entry) => path.join(dirPath, entry.name))
      .sort();
  } catch {
    return [];
  }
}

function parseMarkdownTable(text) {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const tableLines = lines.filter((line) => line.startsWith('|') && line.endsWith('|'));
  if (tableLines.length < 2) return [];

  const headers = tableLines[0]
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());

  return tableLines
    .slice(2)
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length === headers.length)
    .map((cells) => {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = cells[index] || '';
      });
      return row;
    });
}

function parseSectionBullets(text, heading) {
  const lines = String(text || '').split('\n');
  const results = [];
  let active = false;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      active = line.trim() === `## ${heading}`;
      continue;
    }
    if (active) {
      const match = line.match(/^\s*-\s+(.*)$/);
      if (match) {
        results.push(match[1].trim());
        continue;
      }
      if (results.length && line.trim() === '') break;
    }
  }

  return results;
}

function parseSectionValue(text, heading) {
  const lines = String(text || '').split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() === `## ${heading}`) {
      for (let offset = index + 1; offset < lines.length; offset += 1) {
        const value = lines[offset].trim();
        if (value) return value.replace(/^-+\s*/, '');
      }
    }
  }
  return '';
}

function chunkTextToBullets(text, maxItems = 5) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .slice(0, maxItems);
}

function parseDecisionsNeedingRationale(decisions) {
  return (Array.isArray(decisions) ? decisions : [])
    .filter((decision) => {
      const rationale = String(decision.Rationale || '').trim().toLowerCase();
      return !rationale || rationale === 'tbd';
    })
    .map((decision) => ({
      id: decision.id,
      title: decision.Name || decision.Decision || decision.Title || 'Untitled decision',
      rationale: decision.Rationale || 'TBD',
      alternatives: decision.Alternatives || '',
      risks: decision.Risks || '',
      date: typeof decision.Date === 'object' ? decision.Date?.start : decision.Date,
      url: decision.url || '',
    }));
}

function buildCadenceWindow(now) {
  const hour = now.getHours();
  const minute = now.getMinutes();
  const decimalHour = hour + minute / 60;

  if (decimalHour >= 8 && decimalHour < 10) {
    return {
      label: 'CEO Sprint',
      window: '08:00-10:00',
      description: 'Protect high-leverage decision and thinking time.',
    };
  }
  if (decimalHour >= 10 && decimalHour < 11) {
    return {
      label: 'Brief Window',
      window: '10:00-11:00',
      description: 'Review briefs, queues, and escalations before delegating.',
    };
  }
  if (decimalHour >= 17 && decimalHour < 18.5) {
    return {
      label: 'Evening Prep',
      window: '17:00-18:30',
      description: 'Close loops, shape tomorrow, and clear approvals.',
    };
  }
  return {
    label: 'Brain Dump',
    window: 'Open capture',
    description: 'Capture new inputs, route decisions, and keep the system moving.',
  };
}

function buildSystemHealth({ activityRows, handoffStat, activityStat, overdueCount }) {
  const latestActivity = activityRows[0] || null;
  const latestActivityDate = latestActivity ? new Date(String(latestActivity.Date).replace(' ', 'T')) : null;
  const now = Date.now();
  const lastSessionAgeHours = latestActivityDate ? Math.max(0, Math.round((now - latestActivityDate.getTime()) / 36e5)) : null;
  const handoffAgeHours = handoffStat ? Math.max(0, Math.round((now - handoffStat.mtimeMs) / 36e5)) : null;

  let status = 'healthy';
  let message = 'Session state is fresh and the executive system is current.';

  if ((lastSessionAgeHours !== null && lastSessionAgeHours > 48) || (handoffAgeHours !== null && handoffAgeHours > 48)) {
    status = 'warning';
    message = 'Session memory is aging. Refresh the handoff before the next operating cycle.';
  }
  if (overdueCount > 8 || (lastSessionAgeHours !== null && lastSessionAgeHours > 96)) {
    status = 'critical';
    message = 'Execution freshness is slipping. Reset the session state and clear overdue drag.';
  }
  if (!latestActivity || !handoffStat || !activityStat) {
    status = 'warning';
    message = 'Some local operating-state files are missing, so system health is partial.';
  }

  return {
    status,
    message,
    lastSessionAgeHours,
    handoffAgeHours,
  };
}

function summarizeMorningBrief(brief) {
  if (!brief || typeof brief !== 'object') {
    return {
      headline: 'Morning brief unavailable',
      sections: [],
      generatedAt: null,
      source: 'Notion dashboard',
    };
  }

  const sections = [];
  const queue = Array.isArray(brief.priorityActions) ? brief.priorityActions : [];
  if (queue.length) {
    sections.push({
      title: 'Top Priorities',
      items: queue.slice(0, 4).map((item) => item.name || item.Name || String(item)),
    });
  }

  const decisions = Array.isArray(brief.decisions) ? brief.decisions : [];
  if (decisions.length) {
    sections.push({
      title: 'Decision Pressure',
      items: decisions.slice(0, 3).map((item) => item.name || item.Name || String(item)),
    });
  }

  const blockers = Array.isArray(brief.blockers) ? brief.blockers : [];
  if (blockers.length) {
    sections.push({
      title: 'Blockers',
      items: blockers.slice(0, 3).map((item) => item.name || item.Name || String(item)),
    });
  }

  return {
    headline: brief.headline || 'Morning brief',
    sections,
    generatedAt: brief.generatedAt || null,
    source: 'Notion dashboard',
  };
}

async function getOutputsSummary() {
  const reviewState = await getReviewState();
  const exists = await fileExists(OUTPUTS_DIR);
  if (!exists) {
    return {
      available: false,
      reviewQueue: [],
      pendingOutputs: [],
      strategicDocs: [],
      handoffs: [],
    };
  }

  const allFiles = await listFilesIfPresent(OUTPUTS_DIR, (name) => name.endsWith('.md'));
  const stats = await Promise.all(allFiles.map(async (filePath) => ({ filePath, stat: await statSafe(filePath) })));
  const ordered = stats
    .filter((item) => item.stat)
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  const allItems = ordered.map(({ filePath, stat }) => {
    const name = path.basename(filePath);
    const type = name.includes('handoff')
      ? 'handoff'
      : name.includes('sop')
        ? 'sop'
        : name.includes('roadmap')
          ? 'roadmap'
          : name.includes('audit')
            ? 'audit'
            : name.includes('spec')
              ? 'spec'
              : 'doc';

    return {
      title: titleFromFilename(filePath),
      type,
      createdAt: stat ? stat.mtime.toISOString() : null,
      path: path.relative(ROOT_DIR, filePath),
      status: reviewState[path.relative(ROOT_DIR, filePath)]?.status || 'pending',
      reviewerNote: reviewState[path.relative(ROOT_DIR, filePath)]?.note || '',
      reviewedAt: reviewState[path.relative(ROOT_DIR, filePath)]?.reviewedAt || null,
    };
  });

  return {
    available: true,
    reviewQueue: allItems.slice(0, 6),
    pendingOutputs: allItems.slice(0, 8),
    strategicDocs: allItems.filter((item) => ['roadmap', 'audit', 'doc'].includes(item.type)).slice(0, 8),
    handoffs: allItems.filter((item) => item.type === 'handoff').slice(0, 5),
  };
}

async function getReviewState() {
  try {
    return JSON.parse(await fs.readFile(REVIEW_STATE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

async function setReviewStatus({ path: itemPath, status, note = '' }) {
  const current = await getReviewState();
  const previous = current[itemPath] || {};
  const entry = {
    status,
    note,
    reviewedAt: new Date().toISOString(),
  };
  const history = Array.isArray(previous.history) ? previous.history.slice() : [];
  history.unshift({
    status,
    note,
    reviewedAt: entry.reviewedAt,
  });
  entry.history = history.slice(0, 20);
  current[itemPath] = entry;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(REVIEW_STATE_PATH, JSON.stringify(current, null, 2), 'utf8');
  clearCache();
  return entry;
}

function sanitizeFilenamePart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'untitled';
}

function buildForgeDraftContent({ toolId, title, topic, notes }) {
  const now = new Date().toISOString();
  const heading = title || topic || 'Untitled Draft';

  if (toolId === 'brain-dump') {
    return `# Brain Dump\n\n## Captured\n${notes || topic || 'Add raw notes here.'}\n\n## Next Step\n- Triage into commitment, decision, or brief.\n\n## Metadata\n- Created: ${now}\n- Surface: CEO Dashboard\n`;
  }

  if (toolId === 'decision-capture') {
    return `# Decision Draft\n\n## Decision\n${heading}\n\n## Why Now\n${notes || 'Add the rationale and decision pressure.'}\n\n## Alternatives\n- Option A\n- Option B\n\n## Risks\n- Risk 1\n- Risk 2\n\n## Metadata\n- Created: ${now}\n- Surface: CEO Dashboard\n`;
  }

  if (toolId === 'write-pr-faq') {
    return `# PR/FAQ Draft\n\n## Topic\n${heading}\n\n## Press Release\n${notes || 'Draft the announcement narrative here.'}\n\n## FAQs\n1. Question\n   Answer\n\n## Metadata\n- Created: ${now}\n- Surface: CEO Dashboard\n`;
  }

  return `# 6-Pager Draft\n\n## Topic\n${heading}\n\n## Context\n${notes || topic || 'Add executive context here.'}\n\n## Problem\n- Define the current issue\n\n## Proposal\n- Outline the proposed move\n\n## Open Questions\n- Question 1\n- Question 2\n\n## Metadata\n- Created: ${now}\n- Surface: CEO Dashboard\n`;
}

async function createForgeDraft({ toolId, title, topic, notes }) {
  await fs.mkdir(OUTPUTS_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const slug = sanitizeFilenamePart(title || topic || toolId);
  const baseName = toolId === 'decision-capture'
    ? `${timestamp}-${slug}-decision.md`
    : toolId === 'brain-dump'
      ? `${timestamp}-${slug}-brain-dump.md`
      : toolId === 'write-pr-faq'
        ? `${timestamp}-${slug}-pr-faq.md`
        : `${timestamp}-${slug}-6-pager.md`;
  const filePath = path.join(OUTPUTS_DIR, baseName);
  const content = buildForgeDraftContent({ toolId, title, topic, notes });

  await fs.writeFile(filePath, content, 'utf8');
  clearCache();

  return {
    ok: true,
    path: path.relative(ROOT_DIR, filePath),
    title: title || topic || titleFromFilename(filePath),
    toolId,
  };
}

async function createExecutiveBrief() {
  const payload = await getCeoDashboardPayload();
  await fs.mkdir(OUTPUTS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(OUTPUTS_DIR, `${timestamp}-ceo-daily-brief.md`);

  const content = [
    '# CEO Daily Brief',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Attention Rail',
    ...(payload.attentionRail || []).map((item) => `- ${item.title}: ${item.detail}`),
    '',
    '## Dan Today',
    ...(payload.today?.decisionsToValidate || []).slice(0, 5).map((item) => `- Decision: ${item.title}`),
    ...(payload.today?.delegationAlerts || []).slice(0, 5).map((item) => `- Delegation: ${item.title}`),
    '',
    '## Strategic Signals',
    ...(payload.strategic?.sections || []).slice(0, 3).map((section) => `- ${section.title}`),
    '',
    '## Velocity',
    `- Avg days overdue: ${payload.velocity?.avgDaysOverdue || 0}`,
    `- Review queue: ${payload.forge?.reviewQueueCount || 0}`,
    '',
  ].join('\n');

  await fs.writeFile(filePath, content, 'utf8');
  clearCache();
  return {
    ok: true,
    path: path.relative(ROOT_DIR, filePath),
    title: 'CEO Daily Brief',
  };
}

async function getKnowledgeFiles() {
  const exists = await fileExists(KNOWLEDGE_DIR);
  if (exists) {
    return listFilesIfPresent(KNOWLEDGE_DIR, (name) => name.endsWith('.md'));
  }
  return listFilesIfPresent(path.join(CLAUDE_DIR, 'docs'), (name) => name.endsWith('.md'));
}

async function getStrategicDocs(outputsSummary) {
  const fallbackPaths = [
    path.join(CLAUDE_DIR, 'docs', 'app-reference.md'),
    path.join(CLAUDE_DIR, 'docs', 'notion-hub.md'),
    path.join(CLAUDE_DIR, 'docs', 'tech-brief.md'),
    path.join(ROOT_DIR, 'design-system', 'yds-command-centre', 'MASTER.md'),
  ];

  const outputItems = outputsSummary.strategicDocs.map((item) => ({
    id: safeSlug(item.title),
    title: item.title,
    path: item.path,
  }));

  const fallbackItems = [];
  for (const filePath of fallbackPaths) {
    if (await fileExists(filePath)) {
      fallbackItems.push({
        id: safeSlug(filePath),
        title: titleFromFilename(filePath),
        path: path.relative(ROOT_DIR, filePath),
      });
    }
  }

  const items = [...outputItems, ...fallbackItems].slice(0, 6);
  const sections = [];

  for (const item of items) {
    const absolutePath = path.join(ROOT_DIR, item.path);
    const text = await readTextFile(absolutePath);
    sections.push({
      id: item.id,
      title: item.title,
      path: item.path,
      bullets: chunkTextToBullets(text, 5),
    });
  }

  return sections;
}

async function getAgentDefinitions() {
  const files = await listFilesIfPresent(path.join(CLAUDE_DIR, 'agents'), (name) => name.endsWith('.md'));
  const results = [];

  for (const filePath of files) {
    const text = await readTextFile(filePath);
    const stat = await statSafe(filePath);
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const summary = lines.find((line) => !line.startsWith('#')) || 'Agent definition available';
    results.push({
      name: titleFromFilename(filePath),
      summary,
      path: path.relative(ROOT_DIR, filePath),
      status: 'Defined',
      updatedAt: stat ? stat.mtime.toISOString() : null,
    });
  }

  return results;
}

async function getKnowledgeStaleness() {
  const files = await getKnowledgeFiles();
  const now = Date.now();
  const results = [];

  for (const filePath of files) {
    const stat = await statSafe(filePath);
    if (!stat) continue;
    const ageDays = Math.round((now - stat.mtimeMs) / 86400000);
    results.push({
      title: titleFromFilename(filePath),
      path: path.relative(ROOT_DIR, filePath),
      ageDays,
      status: ageDays > 14 ? 'stale' : ageDays > 7 ? 'aging' : 'fresh',
    });
  }

  return results.sort((a, b) => b.ageDays - a.ageDays).slice(0, 8);
}

function buildSystemMap({ dashboard, teamWorkload, marketingSummary, techSummary, opsSummary, crmOverview }) {
  const focusAreas = Array.isArray(dashboard?.focusAreas) ? dashboard.focusAreas : [];
  const marketingStats = marketingSummary?.stats || {};
  const techStats = techSummary?.stats || {};
  const stockSummary = opsSummary?.summary || {};
  const pipeline = crmOverview?.pipeline || {};

  const danLoad = teamWorkload.find((person) => String(person.name || '').toLowerCase() === 'dan') || null;
  const colinLoad = teamWorkload.find((person) => String(person.name || '').toLowerCase() === 'colin') || null;

  const nodes = [
    {
      id: 'dan',
      label: 'Dan',
      domain: 'CEO',
      metric: `${danLoad?.activeCount || 0} open`,
      note: `${danLoad?.overdueCount || 0} overdue`,
      tone: capacityTone(danLoad?.capacity),
      targetView: 'team',
      owner: 'Dan',
    },
    {
      id: 'colin',
      label: 'Colin',
      domain: 'Chief of Staff',
      metric: `${colinLoad?.activeCount || 0} active loops`,
      note: `${focusAreas.length} focus areas tracked`,
      tone: capacityTone(colinLoad?.capacity),
      targetView: 'team',
      owner: 'Colin',
    },
    {
      id: 'marketing',
      label: 'Emily / Marketing',
      domain: 'Growth',
      metric: `${marketingStats.activeCampaigns || 0} active campaigns`,
      note: `${marketingStats.contentInPipeline || 0} content items`,
      tone: marketingStats.blockedCampaigns?.length ? 'warning' : 'healthy',
      targetView: 'marketingOps',
    },
    {
      id: 'crm',
      label: 'CRM / Pipeline',
      domain: 'Revenue',
      metric: `${pipeline.totalLeads || crmOverview?.leadStats?.totalLeads || 0} leads`,
      note: `${crmOverview?.pipeline?.stalledCount || 0} stalled`,
      tone: (crmOverview?.pipeline?.stalledCount || 0) > 0 ? 'warning' : 'healthy',
      targetView: 'crm',
    },
    {
      id: 'tech',
      label: 'Arjun / Tech',
      domain: 'Execution',
      metric: `${techStats.inProgress || 0} in progress`,
      note: `${techStats.blocked || 0} blocked`,
      tone: (techStats.p0Bugs || 0) > 0 ? 'critical' : (techStats.blocked || 0) > 0 ? 'warning' : 'healthy',
      targetView: 'techTeam',
    },
    {
      id: 'factory',
      label: 'Factory OS',
      domain: 'Operations',
      metric: `${stockSummary.lowStockCount || 0} low-stock alerts`,
      note: `${stockSummary.pendingPoCount || 0} pending POs`,
      tone: (stockSummary.criticalStockCount || 0) > 0 ? 'critical' : 'warning',
      targetView: 'ops',
    },
  ];

  const edges = [
    { from: 'dan', to: 'colin', label: 'Decision routing' },
    { from: 'colin', to: 'marketing', label: 'Launch coordination' },
    { from: 'colin', to: 'crm', label: 'Pipeline follow-up' },
    { from: 'colin', to: 'tech', label: 'Specs and blockers' },
    { from: 'colin', to: 'factory', label: 'Ops escalation' },
  ];

  return {
    nodes,
    edges,
    focusAreas: focusAreas.slice(0, 7).map((item) => ({
      id: item.id,
      name: item.Name,
      health: item.Health || item.Status || 'Unknown',
      tone: normalizeHealthTone(item.Health || item.Status),
      targetView: 'projects',
      focusArea: item.Name,
    })),
    routingNotes: [
      'Marketing escalations route through the growth operating layer first.',
      'Tech bottlenecks should be turned into explicit decisions when they block launches.',
      'Ops pressure should surface as stock or supplier risk before it reaches Dan.',
    ],
  };
}

function buildVelocity({ dashboard, decisionsNeedingRationale, teamWorkload, knowledgeStaleness, outputsSummary, activityRows }) {
  const overdue = Array.isArray(dashboard?.overdue) ? dashboard.overdue : [];
  const decisions = Array.isArray(dashboard?.recentDecisions) ? dashboard.recentDecisions : [];
  const createdVsClosed = {
    created: overdue.length + (Array.isArray(dashboard?.upcoming) ? dashboard.upcoming.length : 0),
    closed: Array.isArray(dashboard?.recentActivity?.completions) ? dashboard.recentActivity.completions.length : 0,
  };

  const danLoad = teamWorkload.find((person) => String(person.name || '').toLowerCase() === 'dan');
  const teamAssigned = teamWorkload
    .filter((person) => String(person.name || '').toLowerCase() !== 'dan')
    .reduce((sum, person) => sum + (person.activeCount || 0), 0);

  const avgDaysOverdue = overdue.length
    ? Math.round(
      overdue.reduce((sum, item) => {
        const dueDate = item['Due Date'] && typeof item['Due Date'] === 'object'
          ? item['Due Date'].start
          : item['Due Date'];
        if (!dueDate) return sum;
        return sum + Math.max(0, Math.round((Date.now() - new Date(dueDate).getTime()) / 86400000));
      }, 0) / overdue.length,
    )
    : 0;

  return {
    decisionsPerWeek: {
      value: decisions.length,
      spark: decisions.slice(0, 7).map((_, index) => Math.max(1, decisions.length - index)),
    },
    commitmentsFlow: createdVsClosed,
    avgDaysOverdue,
    delegationRatio: {
      toTeam: teamAssigned,
      toDan: danLoad?.activeCount || 0,
    },
    sessionFrequency: {
      count: activityRows.length,
      timeline: activityRows.slice(0, 7).reverse().map((row) => row.Date || ''),
    },
    knowledgeFreshness: knowledgeStaleness.slice(0, 6),
    handoffCompleteness: {
      delivered: outputsSummary.handoffs.length,
      pending: decisionsNeedingRationale.length,
    },
  };
}

function buildAttentionRail({ actionQueue, dashboard, outputsSummary, knowledgeStaleness, decisionsNeedingRationale }) {
  const items = [];
  const overdueCount = Array.isArray(dashboard?.overdue) ? dashboard.overdue.length : 0;

  if ((actionQueue?.dansQueueCount || 0) > 0) {
    items.push({
      id: 'waiting-on-dan',
      title: 'Waiting on Dan',
      detail: `${actionQueue.dansQueueCount} executive items need a call`,
      tone: 'warning',
      targetView: 'actionQueue',
      mode: 'today',
    });
  }
  if (overdueCount > 0) {
    items.push({
      id: 'overdue',
      title: 'Overdue Commitments',
      detail: `${overdueCount} items are dragging the system`,
      tone: overdueCount > 5 ? 'critical' : 'warning',
      targetView: 'commitments',
      mode: 'risk',
    });
  }
  if ((outputsSummary.reviewQueue || []).length > 0) {
    items.push({
      id: 'review-queue',
      title: 'Review Queue',
      detail: `${outputsSummary.reviewQueue.length} drafts are waiting for review`,
      tone: 'warning',
      targetView: 'docs',
      mode: 'review',
    });
  }
  if (decisionsNeedingRationale.length > 0) {
    items.push({
      id: 'decision-pressure',
      title: 'Decision Pressure',
      detail: `${decisionsNeedingRationale.length} decisions still need rationale`,
      tone: 'warning',
      targetView: 'decisions',
      mode: 'today',
    });
  }
  const stalest = (knowledgeStaleness || []).find((item) => item.status === 'stale');
  if (stalest) {
    items.push({
      id: 'knowledge-stale',
      title: 'Knowledge Stale',
      detail: `${stalest.title} is ${stalest.ageDays} days old`,
      tone: 'warning',
      targetView: 'dashboard',
      mode: 'strategy',
    });
  }
  return items.slice(0, 5);
}

async function getCeoDashboardPayload() {
  const cached = getFreshCache();
  if (cached) return cached;

  const activityPath = path.join(DATA_DIR, 'activity-log.md');
  const handoffPath = path.join(DATA_DIR, 'handoff.md');
  const decisionsPath = path.join(DATA_DIR, 'decisions.md');
  const memoryPath = path.join(ROOT_DIR, 'MEMORY.md');

  const [
    dashboardResult,
    actionQueueResult,
    teamWorkloadResult,
    morningBriefResult,
    recentDecisionsResult,
    focusAreasResult,
    peopleResult,
    projectsResult,
    marketingSummaryResult,
    techSummaryResult,
    opsSummaryResult,
    crmOverviewResult,
    calendarResult,
    activityText,
    handoffText,
    decisionsText,
    claudeText,
    outputsSummary,
    activeAgents,
    knowledgeStaleness,
    activityStat,
    handoffStat,
    memoryText,
  ] = await Promise.all([
    dashboardService.getDashboardPayload().catch(() => null),
    dashboardService.getActionQueuePayload().catch(() => null),
    dashboardService.getTeamWorkload().catch(() => []),
    dashboardService.getMorningBrief().catch(() => null),
    notionService.getRecentDecisions(14).catch(() => []),
    notionService.getFocusAreas().catch(() => []),
    notionService.getPeople().catch(() => []),
    notionService.getProjects().catch(() => []),
    marketingOpsService.getSummary().catch(() => null),
    techTeamService.getSummary().catch(() => null),
    opsService.getOverview().catch(() => null),
    crmService.getOverview().catch(() => null),
    calendarService.getTodaysEvents().catch(() => ({ available: false, items: [] })),
    readTextFile(activityPath),
    readTextFile(handoffPath),
    readTextFile(decisionsPath),
    readTextFile(path.join(ROOT_DIR, 'CLAUDE.md')),
    getOutputsSummary(),
    getAgentDefinitions(),
    getKnowledgeStaleness(),
    statSafe(activityPath),
    statSafe(handoffPath),
    readTextFile(memoryPath),
  ]);

  const now = new Date();
  const dashboard = dashboardResult || {};
  const actionQueue = actionQueueResult || { dansQueue: [], runnersQueue: [], dansQueueCount: 0, runnersQueueCount: 0 };
  const teamWorkload = Array.isArray(teamWorkloadResult) ? teamWorkloadResult : [];
  const focusAreas = Array.isArray(focusAreasResult) && focusAreasResult.length
    ? focusAreasResult
    : Array.isArray(dashboard.focusAreas) ? dashboard.focusAreas : [];
  const decisionsNeedingRationale = parseDecisionsNeedingRationale(recentDecisionsResult);
  const activityRows = parseMarkdownTable(activityText);
  const decisionLogRows = parseMarkdownTable(decisionsText);
  const cadence = buildCadenceWindow(now);
  const systemHealth = buildSystemHealth({
    activityRows,
    handoffStat,
    activityStat,
    overdueCount: Array.isArray(dashboard.overdue) ? dashboard.overdue.length : 0,
  });
  const strategicSections = await getStrategicDocs(outputsSummary);
  const marketingSummary = marketingSummaryResult || {};
  const handoffNextSteps = parseSectionBullets(handoffText, 'Next Steps');
  const handoffKeyDecisions = parseSectionBullets(handoffText, 'Key Decisions');
  const fallbackCalendarItems = [
    ...((marketingSummary.sessions || []).slice(0, 4).map((item) => ({
      id: item.id,
      title: item.Name || item.Title || 'Session',
      start: item.Date && typeof item.Date === 'object' ? item.Date.start : item.Date,
      end: item.Date && typeof item.Date === 'object' ? item.Date.end : '',
      source: 'sessions',
    }))),
    ...((marketingSummary.content || []).filter((item) => item['Publish Date']).slice(0, 4).map((item) => ({
      id: item.id,
      title: item.Name || 'Content slot',
      start: item['Publish Date'] && typeof item['Publish Date'] === 'object' ? item['Publish Date'].start : item['Publish Date'],
      end: '',
      source: 'content-calendar',
    }))),
  ];
  const calendarItems = calendarResult?.available
    ? calendarResult.items
    : fallbackCalendarItems;

  const payload = {
    timestamp: new Date().toISOString(),
    meta: {
      mode: 'ceo-dashboard',
      availableOnSubdomain: true,
      preferredHostHint: 'ceo.<your-domain>',
    },
    modes: [
      { id: 'all', label: 'All Systems', description: 'Full executive surface' },
      { id: 'today', label: 'Run Today', description: 'Decisions, calendar, and delegations' },
      { id: 'risk', label: 'Review Risks', description: 'Overdue work, stale knowledge, system drag' },
      { id: 'review', label: 'Clear Review', description: 'Outputs and approvals waiting on you' },
      { id: 'strategy', label: 'Strategic Layer', description: 'Long-range context and synthesis' },
    ],
    heroMetrics: [
      { id: 'waiting', label: 'Waiting on Dan', value: actionQueue.dansQueueCount || 0, tone: (actionQueue.dansQueueCount || 0) > 0 ? 'warning' : 'healthy' },
      { id: 'review', label: 'Review Queue', value: outputsSummary.reviewQueue.length, tone: outputsSummary.reviewQueue.length > 0 ? 'warning' : 'healthy' },
      { id: 'decisions', label: 'Decisions Pending', value: decisionsNeedingRationale.length, tone: decisionsNeedingRationale.length > 0 ? 'warning' : 'healthy' },
      { id: 'focus', label: 'Focus Areas', value: focusAreas.length, tone: 'healthy' },
    ],
    attentionRail: buildAttentionRail({
      actionQueue,
      dashboard,
      outputsSummary,
      knowledgeStaleness,
      decisionsNeedingRationale,
    }),
    pulseBar: {
      focusAreaHealth: focusAreas.slice(0, 7).map((item) => ({
        id: item.id,
        name: item.Name,
        health: item.Health || item.Status || 'Unknown',
        tone: normalizeHealthTone(item.Health || item.Status),
      })),
      overdueBadge: {
        count: Array.isArray(dashboard.overdue) ? dashboard.overdue.length : 0,
        items: (dashboard.overdue || []).slice(0, 6).map((item) => ({
          id: item.id,
          title: item.Name,
          dueDate: item['Due Date'] && typeof item['Due Date'] === 'object' ? item['Due Date'].start : item['Due Date'],
          owner: Array.isArray(item.assignedNames) ? item.assignedNames.join(', ') : '',
          targetView: 'commitments',
        })),
      },
      decisionsPendingRationale: {
        count: decisionsNeedingRationale.length,
        items: decisionsNeedingRationale.slice(0, 5).map((item) => ({
          ...item,
          targetView: 'decisions',
        })),
      },
      teamLoad: {
        people: teamWorkload.slice(0, 8).map((person) => ({
          id: person.id,
          name: person.name,
          openCount: person.activeCount || 0,
          overdueCount: person.overdueCount || 0,
          capacity: person.capacity,
          tone: capacityTone(person.capacity),
        })),
      },
      systemHealth,
      cadence,
    },
    today: {
      morningBrief: summarizeMorningBrief(morningBriefResult || dashboard.morningBrief),
      reviewQueue: outputsSummary.reviewQueue,
      brainDumpInbox: handoffNextSteps.slice(0, 4).map((item, index) => ({
        id: `brain-dump-${index}`,
        text: item,
        targetView: 'dashboard',
      })),
      decisionsToValidate: decisionsNeedingRationale.slice(0, 6).map((item) => ({
        ...item,
        targetView: 'decisions',
      })),
      calendar: {
        available: !!calendarResult?.available || calendarItems.length > 0,
        message: calendarResult?.available
          ? `Live from Google Calendar${config.GOOGLE_CALENDAR_ID ? '' : ' (default calendar)'}.`
          : calendarItems.length
            ? 'Using fallback operating timeline from sessions and content calendar.'
            : 'Calendar is not configured yet for this surface.',
        items: calendarItems.slice(0, 8).map((item) => ({
          ...item,
          targetView: item.source === 'content-calendar' || item.source === 'sessions' ? 'marketingOps' : 'dashboard',
        })),
      },
      delegationAlerts: actionQueue.dansQueue.slice(0, 5).map((item) => ({
        id: item.id,
        title: item.name,
        reason: item.status === 'Blocked' ? 'Blocked item waiting on Dan' : 'Executive queue item',
        suggestedOwner: item.assignedNames?.[0] || 'Dan',
        targetView: 'actionQueue',
      })),
    },
    workspace: {
      activeAgents: activeAgents.slice(0, 8),
      recentActions: activityRows.slice(0, 8).map((row, index) => ({
        id: `${row.Date || 'row'}-${index}`,
        timestamp: row.Date || '',
        agent: row.Agent || 'unknown',
        action: row.Action || 'Update',
        details: row.Details || '',
        pending: row.Pending || '',
        targetView: 'dashboard',
      })),
      pendingOutputs: outputsSummary.pendingOutputs,
      memoryUpdates: chunkTextToBullets(memoryText, 6).map((item, index) => ({
        id: `memory-${index}`,
        text: item,
      })),
      sessionHandoff: {
        lastSession: parseSectionValue(handoffText, 'Last Session'),
        currentState: parseSectionBullets(handoffText, 'Current State'),
        keyDecisions: handoffKeyDecisions,
        nextSteps: parseSectionBullets(handoffText, 'Next Steps'),
      },
      knowledgeStaleness,
      aboutColin: {
        title: 'About Colin',
        bullets: chunkTextToBullets(claudeText, 6),
        path: 'CLAUDE.md',
      },
    },
    systemMap: buildSystemMap({
      dashboard,
      teamWorkload,
      marketingSummary: marketingSummaryResult,
      techSummary: techSummaryResult,
      opsSummary: opsSummaryResult,
      crmOverview: crmOverviewResult,
      people: peopleResult,
      projects: projectsResult,
    }),
    strategic: {
      sections: strategicSections,
      decisionRegister: decisionLogRows.slice(0, 6).map((row, index) => ({
        id: `decision-${index + 1}`,
        date: row.Date || '',
        decision: row.Decision || '',
        rationale: row.Rationale || '',
        status: row.Status || '',
      })),
    },
    velocity: buildVelocity({
      dashboard,
      decisionsNeedingRationale,
      teamWorkload,
      knowledgeStaleness,
      outputsSummary,
      activityRows,
    }),
    forge: {
      tools: [
        {
          id: 'write-6-pager',
          title: 'Write 6-Pager',
          description: 'Create a local 6-pager draft in outputs/ and push it into the review queue.',
          status: 'live',
        },
        {
          id: 'write-pr-faq',
          title: 'Write PR/FAQ',
          description: 'Generate a PR/FAQ markdown draft in outputs/ for CEO review.',
          status: 'live',
        },
        {
          id: 'brain-dump',
          title: 'Brain Dump',
          description: 'Capture raw input as a structured local draft so it enters the review queue immediately.',
          status: 'live',
        },
        {
          id: 'decision-capture',
          title: 'Decision Capture',
          description: 'Create a decision draft with rationale, alternatives, and risks.',
          status: 'live',
        },
      ],
      outputsAvailable: outputsSummary.available,
      reviewQueueCount: outputsSummary.reviewQueue.length,
    },
  };

  ceoDashboardCache = { data: payload, time: Date.now() };
  return payload;
}

function clearCache() {
  ceoDashboardCache = null;
}

module.exports = {
  getCeoDashboardPayload,
  createForgeDraft,
  createExecutiveBrief,
  setReviewStatus,
  clearCache,
};
