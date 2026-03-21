const notionService = require('./notion');

function buildPeopleLookup(people) {
  const peopleLookup = {};
  people.forEach((person) => { peopleLookup[person.id.replace(/-/g, '')] = person.Name; });
  return peopleLookup;
}

function buildFocusAreaLookup(focusAreas) {
  const focusAreaLookup = {};
  focusAreas.forEach((focusArea) => { focusAreaLookup[focusArea.id.replace(/-/g, '')] = focusArea.Name; });
  return focusAreaLookup;
}

function enrichFocusAreaCommitment(commitment, peopleLookup, today) {
  const assignedIds = commitment['Assigned To'] || [];
  const assignedNames = (Array.isArray(assignedIds) ? assignedIds : [])
    .map((id) => peopleLookup[id.replace(/-/g, '')] || 'Unknown');
  const dueDate = typeof commitment['Due Date'] === 'object' ? commitment['Due Date']?.start : commitment['Due Date'];
  const isOverdue = dueDate && dueDate < today && !['Done', 'Cancelled'].includes(commitment.Status);
  const daysOverdue = isOverdue ? Math.floor((new Date(today) - new Date(dueDate)) / 86400000) : 0;

  return { ...commitment, assignedNames, dueDate, isOverdue, daysOverdue };
}

function sortFocusAreaCommitments(commitments) {
  commitments.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    if (a.isOverdue && b.isOverdue) return b.daysOverdue - a.daysOverdue;
    return (a.dueDate || 'z') > (b.dueDate || 'z') ? 1 : -1;
  });
  return commitments;
}

function enrichPersonCommitment(commitment, focusAreaLookup, today) {
  const dueDate = typeof commitment['Due Date'] === 'object' ? commitment['Due Date']?.start : commitment['Due Date'];
  const isOverdue = dueDate && dueDate < today && !['Done', 'Cancelled'].includes(commitment.Status);
  const daysOverdue = isOverdue ? Math.floor((new Date(today) - new Date(dueDate)) / 86400000) : 0;
  const focusAreaIds = commitment['Focus Area'] || commitment['Focus Areas'] || commitment['Focus area'] || [];
  const focusAreaNames = (Array.isArray(focusAreaIds) ? focusAreaIds : [])
    .map((id) => focusAreaLookup[id.replace(/-/g, '')] || 'Unknown');

  return { ...commitment, dueDate, isOverdue, daysOverdue, focusAreaNames };
}

function sortPersonCommitments(commitments) {
  const statusOrder = { Blocked: 0, 'In Progress': 1, 'Not Started': 2, Done: 3, Cancelled: 4 };
  commitments.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    if (a.isOverdue && b.isOverdue) return b.daysOverdue - a.daysOverdue;
    return (statusOrder[a.Status] ?? 3) - (statusOrder[b.Status] ?? 3);
  });
  return commitments;
}

function computePersonMetrics(commitments) {
  const active = commitments.filter((commitment) => !['Done', 'Cancelled'].includes(commitment.Status));
  return {
    activeCount: active.length,
    overdueCount: commitments.filter((commitment) => commitment.isOverdue).length,
    blockedCount: commitments.filter((commitment) => commitment.Status === 'Blocked').length,
    doneCount: commitments.filter((commitment) => commitment.Status === 'Done').length,
    capacity: active.length > 8 ? 'overloaded' : active.length > 4 ? 'moderate' : 'light',
  };
}

async function getFocusAreaDetail(id) {
  const [focusArea, allCommitments, people, recentDecisions, allProjects] = await Promise.all([
    notionService.getPage(id),
    notionService.getAllCommitments(),
    notionService.getPeople(),
    notionService.getRecentDecisions(365),
    notionService.getProjects(),
  ]);

  if (!focusArea) return null;

  const peopleLookup = buildPeopleLookup(people);
  const normalizedId = id.replace(/-/g, '');
  const today = new Date().toISOString().split('T')[0];

  const focusAreaCommitments = allCommitments.filter((commitment) => {
    const focusAreaIds = commitment['Focus Area'] || commitment['Focus Areas'] || commitment['Focus area'] || [];
    return Array.isArray(focusAreaIds) && focusAreaIds.some((fid) => fid.replace(/-/g, '') === normalizedId);
  });

  const enrichedCommitments = sortFocusAreaCommitments(
    focusAreaCommitments.map((commitment) => enrichFocusAreaCommitment(commitment, peopleLookup, today))
  );

  const decisions = recentDecisions.filter((decision) => {
    const focusAreaIds = decision['Focus Area'] || decision['Focus Areas'] || [];
    return Array.isArray(focusAreaIds) && focusAreaIds.some((fid) => fid.replace(/-/g, '') === normalizedId);
  });

  const projects = allProjects.filter((project) => {
    const focusAreaIds = project['Focus Area'] || project['Focus Areas'] || project['Focus area'] || [];
    return Array.isArray(focusAreaIds) && focusAreaIds.some((fid) => fid.replace(/-/g, '') === normalizedId);
  });

  const openCount = enrichedCommitments.filter((commitment) => !['Done', 'Cancelled'].includes(commitment.Status)).length;
  const overdueCount = enrichedCommitments.filter((commitment) => commitment.isOverdue).length;
  const blockedCount = enrichedCommitments.filter((commitment) => commitment.Status === 'Blocked').length;

  return {
    focusArea,
    projects,
    commitments: enrichedCommitments,
    decisions,
    stats: { openCount, overdueCount, blockedCount, projectCount: projects.length },
  };
}

async function getPersonDetail(id) {
  const today = new Date().toISOString().split('T')[0];
  const normalizedId = id.replace(/-/g, '');
  const [person, allCommitments, focusAreas] = await Promise.all([
    notionService.getPage(id),
    notionService.getAllCommitments(),
    notionService.getFocusAreas(),
  ]);

  if (!person) return null;

  const focusAreaLookup = buildFocusAreaLookup(focusAreas);
  const personCommitments = allCommitments.filter((commitment) => {
    const assignedIds = commitment['Assigned To'] || [];
    return Array.isArray(assignedIds) && assignedIds.some((idValue) => idValue.replace(/-/g, '') === normalizedId);
  });

  const commitments = sortPersonCommitments(
    personCommitments.map((commitment) => enrichPersonCommitment(commitment, focusAreaLookup, today))
  );

  return {
    person,
    commitments,
    metrics: computePersonMetrics(commitments),
  };
}

module.exports = {
  getFocusAreaDetail,
  getPersonDetail,
  enrichFocusAreaCommitment,
  sortFocusAreaCommitments,
  enrichPersonCommitment,
  sortPersonCommitments,
  computePersonMetrics,
};
