'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const dashboardService = require('./dashboard-service');
const marketingOpsService = require('./marketing-ops-service');
const techTeamService = require('./tech-team-service');
const opsService = require('./ops-service');
const crmService = require('./crm-service');
const notionService = require('./notion');

const CACHE_TTL_MS = 2 * 60 * 1000;
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT_DIR, 'data', 'sessions');
const CLAUDE_DIR = path.join(ROOT_DIR, '.claude');
const OUTPUTS_DIR = path.join(ROOT_DIR, 'outputs');
const KNOWLEDGE_DIR = path.join(ROOT_DIR, 'knowledge');

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
      status: 'pending',
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
    },
    {
      id: 'colin',
      label: 'Colin',
      domain: 'Chief of Staff',
      metric: `${colinLoad?.activeCount || 0} active loops`,
      note: `${focusAreas.length} focus areas tracked`,
      tone: capacityTone(colinLoad?.capacity),
    },
    {
      id: 'marketing',
      label: 'Emily / Marketing',
      domain: 'Growth',
      metric: `${marketingStats.activeCampaigns || 0} active campaigns`,
      note: `${marketingStats.contentInPipeline || 0} content items`,
      tone: marketingStats.blockedCampaigns?.length ? 'warning' : 'healthy',
    },
    {
      id: 'crm',
      label: 'CRM / Pipeline',
      domain: 'Revenue',
      metric: `${pipeline.totalLeads || crmOverview?.leadStats?.totalLeads || 0} leads`,
      note: `${crmOverview?.pipeline?.stalledCount || 0} stalled`,
      tone: (crmOverview?.pipeline?.stalledCount || 0) > 0 ? 'warning' : 'healthy',
    },
    {
      id: 'tech',
      label: 'Arjun / Tech',
      domain: 'Execution',
      metric: `${techStats.inProgress || 0} in progress`,
      note: `${techStats.blocked || 0} blocked`,
      tone: (techStats.p0Bugs || 0) > 0 ? 'critical' : (techStats.blocked || 0) > 0 ? 'warning' : 'healthy',
    },
    {
      id: 'factory',
      label: 'Factory OS',
      domain: 'Operations',
      metric: `${stockSummary.lowStockCount || 0} low-stock alerts`,
      note: `${stockSummary.pendingPoCount || 0} pending POs`,
      tone: (stockSummary.criticalStockCount || 0) > 0 ? 'critical' : 'warning',
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
    opsService.getSummary().catch(() => null),
    crmService.getOverview().catch(() => null),
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

  const payload = {
    timestamp: new Date().toISOString(),
    meta: {
      mode: 'ceo-dashboard',
      availableOnSubdomain: true,
      preferredHostHint: 'ceo.<your-domain>',
    },
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
        })),
      },
      decisionsPendingRationale: {
        count: decisionsNeedingRationale.length,
        items: decisionsNeedingRationale.slice(0, 5),
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
      brainDumpInbox: [],
      decisionsToValidate: decisionsNeedingRationale.slice(0, 6),
      calendar: {
        available: false,
        message: 'Google Calendar is not wired into this separate CEO surface yet.',
        items: [],
      },
      delegationAlerts: actionQueue.dansQueue.slice(0, 5).map((item) => ({
        id: item.id,
        title: item.name,
        reason: item.status === 'Blocked' ? 'Blocked item waiting on Dan' : 'Executive queue item',
        suggestedOwner: item.assignedNames?.[0] || 'Dan',
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
      })),
      pendingOutputs: outputsSummary.pendingOutputs,
      memoryUpdates: chunkTextToBullets(memoryText, 6).map((item, index) => ({
        id: `memory-${index}`,
        text: item,
      })),
      sessionHandoff: {
        lastSession: parseSectionValue(handoffText, 'Last Session'),
        currentState: parseSectionBullets(handoffText, 'Current State'),
        keyDecisions: parseSectionBullets(handoffText, 'Key Decisions'),
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
          description: 'Generate a strategic memo into outputs when the forge backend is connected.',
          status: 'planned',
        },
        {
          id: 'write-pr-faq',
          title: 'Write PR/FAQ',
          description: 'Draft a launch-ready PR/FAQ using the shared output flow.',
          status: 'planned',
        },
        {
          id: 'brain-dump',
          title: 'Brain Dump',
          description: 'Capture raw inputs, then route them into decisions, commitments, or briefs.',
          status: 'next',
        },
        {
          id: 'decision-capture',
          title: 'Decision Capture',
          description: 'Record what changed, why it changed, and what risks stay open.',
          status: 'next',
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
  clearCache,
};
