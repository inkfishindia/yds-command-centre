const notionService = require('./notion');

const ACTION_QUEUE_CACHE_TTL = 30 * 1000;
const TEAM_WORKLOAD_CACHE_TTL = 60 * 1000;
const RECENT_ACTIVITY_CACHE_TTL = 60 * 1000;
const DAN_ID = '307247aa0d7b81318999e80042f45d6a';

let actionQueueResponseCache = null;
let teamWorkloadCache = null;
let recentActivityCache = null;

function getFreshCache(entry, ttlMs) {
  if (!entry) return null;
  if (Date.now() - entry.time > ttlMs) return null;
  return entry.data;
}

async function getMorningBrief() {
  return notionService.getMorningBrief();
}

function enrichActionQueueCommitments(allCommitments, people, focusAreas, today) {
  const peopleLookup = {};
  people.forEach((person) => { peopleLookup[person.id.replace(/-/g, '')] = person.Name; });

  const focusAreaLookup = {};
  focusAreas.forEach((focusArea) => { focusAreaLookup[focusArea.id.replace(/-/g, '')] = focusArea.Name; });

  return allCommitments
    .filter((commitment) => !['Done', 'Cancelled'].includes(commitment.Status)) // defensive guard
    .map((commitment) => {
      const assignedIds = Array.isArray(commitment['Assigned To']) ? commitment['Assigned To'] : [];
      const assignedNames = assignedIds.map((id) => peopleLookup[id.replace(/-/g, '')] || 'Unknown');
      const focusAreaIds = commitment['Focus Area'] || commitment['Focus Areas'] || commitment['Focus area'] || [];
      const focusAreaNames = (Array.isArray(focusAreaIds) ? focusAreaIds : [])
        .map((id) => focusAreaLookup[id.replace(/-/g, '')] || 'Unknown');
      const dueDate = typeof commitment['Due Date'] === 'object' ? commitment['Due Date']?.start : commitment['Due Date'];
      const isOverdue = !!(dueDate && dueDate < today);
      const daysOverdue = isOverdue
        ? Math.floor((new Date(today) - new Date(dueDate)) / 86400000)
        : 0;

      return {
        id: commitment.id,
        name: commitment.Name,
        status: commitment.Status,
        priority: commitment.Priority,
        type: commitment.Type,
        assignedNames,
        focusAreaNames,
        dueDate,
        isOverdue,
        daysOverdue,
        notes: commitment.Notes || '',
        assignedIds,
      };
    });
}

function buildActionQueues(enriched) {
  const dansQueue = enriched.filter((commitment) => {
    const notesLower = commitment.notes.toLowerCase();
    const isBlockedOnDan =
      commitment.status === 'Blocked' &&
      (notesLower.includes('dan') || commitment.assignedNames.some((name) => name === 'Dan'));
    const needsDecision =
      commitment.type === 'Decision Needed' ||
      notesLower.includes('needs decision') ||
      notesLower.includes('pending decision');
    const isAssignedToDan = commitment.assignedIds.some((id) => id.replace(/-/g, '') === DAN_ID);
    const isDanOverdue = isAssignedToDan && commitment.isOverdue;

    return isBlockedOnDan || needsDecision || isDanOverdue || commitment.status === 'Blocked';
  });

  const runnersQueue = enriched.filter((commitment) => {
    const isAssignedToDan = commitment.assignedIds.some((id) => id.replace(/-/g, '') === DAN_ID);
    return !isAssignedToDan && (commitment.isOverdue || commitment.status === 'Blocked');
  });

  const sortBySeverity = (a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return b.daysOverdue - a.daysOverdue;
  };

  dansQueue.sort(sortBySeverity);
  runnersQueue.sort(sortBySeverity);

  return { dansQueue, runnersQueue };
}

async function getActionQueuePayload() {
  const cached = getFreshCache(actionQueueResponseCache, ACTION_QUEUE_CACHE_TTL);
  if (cached) return cached;

  // Use getActiveCommitments() (excludes Done + Cancelled) — the action queue
  // only surfaces in-flight work, so fetching completed items is wasteful.
  const [allCommitments, people, focusAreas] = await Promise.all([
    notionService.getActiveCommitments(),
    notionService.getPeople(),
    notionService.getFocusAreas(),
  ]);

  const today = new Date().toISOString().split('T')[0];
  const enriched = enrichActionQueueCommitments(allCommitments, people, focusAreas, today);
  const { dansQueue, runnersQueue } = buildActionQueues(enriched);

  const payload = {
    dansQueue,
    runnersQueue,
    dansQueueCount: dansQueue.length,
    runnersQueueCount: runnersQueue.length,
    timestamp: new Date().toISOString(),
  };

  actionQueueResponseCache = { data: payload, time: Date.now() };
  return payload;
}

/**
 * Compute capacity label from active commitment count.
 * @param {number} count
 * @returns {'overloaded'|'moderate'|'light'}
 */
function capacityLabel(count) {
  if (count >= 8) return 'overloaded';
  if (count >= 5) return 'moderate';
  return 'light';
}

/**
 * Build team workload summary from people + active commitments.
 * Returns [{ id, name, activeCount, overdueCount, capacity }]
 */
async function getTeamWorkload() {
  const cached = getFreshCache(teamWorkloadCache, TEAM_WORKLOAD_CACHE_TTL);
  if (cached) return cached;

  const today = new Date().toISOString().split('T')[0];

  const [people, commitments] = await Promise.all([
    notionService.getPeople(),
    notionService.getActiveCommitments(),
  ]);

  // Build lookup: normalised ID (no dashes) → person
  const personMap = {};
  people.forEach((p) => {
    personMap[p.id.replace(/-/g, '')] = { id: p.id, name: p.Name, activeCount: 0, overdueCount: 0 };
  });

  for (const c of commitments) {
    const assignedIds = Array.isArray(c['Assigned To']) ? c['Assigned To'] : [];
    for (const rawId of assignedIds) {
      const nid = rawId.replace(/-/g, '');
      if (!personMap[nid]) continue;
      personMap[nid].activeCount++;
      const dueDate = typeof c['Due Date'] === 'object' ? c['Due Date']?.start : c['Due Date'];
      if (dueDate && dueDate < today) {
        personMap[nid].overdueCount++;
      }
    }
  }

  const result = Object.values(personMap).map((p) => ({
    id: p.id,
    name: p.name,
    activeCount: p.activeCount,
    overdueCount: p.overdueCount,
    capacity: capacityLabel(p.activeCount),
  }));

  teamWorkloadCache = { data: result, time: Date.now() };
  return result;
}

/**
 * Surface activity from the past 48 hours across commitments and decisions.
 * Returns { completions, newBlockers, recentDecisions } — max 10 items each, sorted by recency.
 */
async function getRecentActivity() {
  const cached = getFreshCache(recentActivityCache, RECENT_ACTIVITY_CACHE_TTL);
  if (cached) return cached;

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // getAllCommitments includes Done items (needed for completions); getActiveCommitments covers blockers.
  const [allCommitments, decisions] = await Promise.all([
    notionService.getAllCommitments(true), // include Done + Cancelled
    notionService.getRecentDecisions(2),   // past 2 days
  ]);

  const recentCommitments = allCommitments.filter(
    (c) => c.last_edited_time && c.last_edited_time >= cutoff,
  );

  const completions = recentCommitments
    .filter((c) => c.Status === 'Done')
    .sort((a, b) => (b.last_edited_time > a.last_edited_time ? 1 : -1))
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      name: c.Name,
      lastEdited: c.last_edited_time,
    }));

  const newBlockers = recentCommitments
    .filter((c) => c.Status === 'Blocked')
    .sort((a, b) => (b.last_edited_time > a.last_edited_time ? 1 : -1))
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      name: c.Name,
      lastEdited: c.last_edited_time,
    }));

  const recentDecisions = decisions
    .slice(0, 10)
    .map((d) => ({
      id: d.id,
      name: d.Name || d.Decision || d.Title || 'Untitled',
      date: typeof d.Date === 'object' ? d.Date?.start : d.Date,
    }));

  const result = { completions, newBlockers, recentDecisions };
  recentActivityCache = { data: result, time: Date.now() };
  return result;
}

async function getDashboardPayload() {
  const [summary, teamWorkload, recentActivity] = await Promise.all([
    notionService.getDashboardSummary(),
    getTeamWorkload(),
    getRecentActivity(),
  ]);
  return {
    ...summary,
    morningBrief: notionService.buildMorningBriefFromDashboard(summary),
    teamWorkload,
    recentActivity,
  };
}

function clearCache() {
  actionQueueResponseCache = null;
  teamWorkloadCache = null;
  recentActivityCache = null;
}

module.exports = {
  getMorningBrief,
  getDashboardPayload,
  getActionQueuePayload,
  getTeamWorkload,
  getRecentActivity,
  enrichActionQueueCommitments,
  buildActionQueues,
  clearCache,
  capacityLabel,
};
