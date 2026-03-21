const notionService = require('./notion');

const ACTION_QUEUE_CACHE_TTL = 30 * 1000;
const DAN_ID = '307247aa0d7b81318999e80042f45d6a';

let actionQueueResponseCache = null;

function getFreshCache(entry, ttlMs) {
  if (!entry) return null;
  if (Date.now() - entry.time > ttlMs) return null;
  return entry.data;
}

async function getMorningBrief() {
  return notionService.getMorningBrief();
}

async function getDashboardPayload() {
  const summary = await notionService.getDashboardSummary();
  return {
    ...summary,
    morningBrief: notionService.buildMorningBriefFromDashboard(summary),
  };
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

function clearCache() {
  actionQueueResponseCache = null;
}

module.exports = {
  getMorningBrief,
  getDashboardPayload,
  getActionQueuePayload,
  enrichActionQueueCommitments,
  buildActionQueues,
  clearCache,
};
