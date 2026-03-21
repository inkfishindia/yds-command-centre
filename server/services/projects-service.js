const notionService = require('./notion');

const PROJECTS_CACHE_TTL = 60 * 1000;

let projectsResponseCache = null;

function getFreshCache(entry, ttlMs) {
  if (!entry) return null;
  if (Date.now() - entry.time > ttlMs) return null;
  return entry.data;
}

function buildCommitmentsByProject(allCommitments, today) {
  const commitmentsByProject = {};

  for (const commitment of allCommitments) {
    const projectIds = commitment.Project || [];
    for (const projectId of (Array.isArray(projectIds) ? projectIds : [])) {
      const normalizedId = projectId.replace(/-/g, '');
      if (!commitmentsByProject[normalizedId]) {
        commitmentsByProject[normalizedId] = { open: [], done: [], overdue: [] };
      }

      const isDone = commitment.Status === 'Done';
      const dueRaw = commitment['Due Date'];
      const dueStart = dueRaw && typeof dueRaw === 'object' ? dueRaw.start : dueRaw;
      const isOverdue = !isDone && dueStart && dueStart < today;

      if (isDone) {
        commitmentsByProject[normalizedId].done.push(commitment);
      } else {
        commitmentsByProject[normalizedId].open.push(commitment);
        if (isOverdue) commitmentsByProject[normalizedId].overdue.push(commitment);
      }
    }
  }

  return commitmentsByProject;
}

function enrichProjects(projects, relationLookup, commitmentsByProject) {
  return projects.map((project) => {
    const resolved = { ...project };

    for (const key of ['Owner', 'Focus Area', 'Focus Areas', 'Focus area', 'AI Expert Panel']) {
      const value = resolved[key];
      if (!Array.isArray(value)) continue;
      resolved[key] = value.map((id) => relationLookup[id] || { id, name: id.slice(0, 8) });
    }

    const normalizedId = project.id.replace(/-/g, '');
    const stats = commitmentsByProject[normalizedId] || { open: [], done: [], overdue: [] };
    const openCount = stats.open.length;
    const doneCount = stats.done.length;
    const overdueCount = stats.overdue.length;
    const totalCount = openCount + doneCount;
    const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    const linkedCommitments = [
      ...stats.open.map((commitment) => ({
        id: commitment.id,
        name: commitment.Name || 'Untitled',
        status: commitment.Status || 'Not Started',
        dueDate: commitment['Due Date'] || null,
        priority: commitment.Priority || null,
      })),
      ...stats.done.map((commitment) => ({
        id: commitment.id,
        name: commitment.Name || 'Untitled',
        status: commitment.Status || 'Done',
        dueDate: commitment['Due Date'] || null,
        priority: commitment.Priority || null,
      })),
    ];

    const commitmentDates = [...stats.open, ...stats.done]
      .map((commitment) => commitment.last_edited_time)
      .filter(Boolean);
    const lastCommitmentActivity = commitmentDates.length > 0
      ? commitmentDates.sort().reverse()[0]
      : null;

    return {
      ...resolved,
      openCount,
      overdueCount,
      doneCount,
      totalCount,
      progressPercent,
      linkedCommitments,
      lastCommitmentActivity,
    };
  });
}

async function getProjectsPayload() {
  const cached = getFreshCache(projectsResponseCache, PROJECTS_CACHE_TTL);
  if (cached) return cached;

  const today = new Date().toISOString().split('T')[0];
  const [projects, allCommitments] = await Promise.all([
    notionService.getProjects(),
    notionService.getAllCommitments(false),
  ]);

  const relationIds = [];
  for (const project of projects) {
    const ownerIds = Array.isArray(project.Owner) ? project.Owner : [];
    const focusAreaIds = Array.isArray(project['Focus Area']) ? project['Focus Area']
      : Array.isArray(project['Focus Areas']) ? project['Focus Areas']
      : Array.isArray(project['Focus area']) ? project['Focus area']
      : [];
    const expertIds = Array.isArray(project['AI Expert Panel']) ? project['AI Expert Panel'] : [];
    relationIds.push(...ownerIds, ...focusAreaIds, ...expertIds);
  }

  const relationLookup = await notionService.resolveRelationIdsToNamedItems(relationIds);
  const commitmentsByProject = buildCommitmentsByProject(allCommitments, today);
  const payload = { projects: enrichProjects(projects, relationLookup, commitmentsByProject) };

  projectsResponseCache = { data: payload, time: Date.now() };
  return payload;
}

function clearCache() {
  projectsResponseCache = null;
}

module.exports = {
  getProjectsPayload,
  buildCommitmentsByProject,
  enrichProjects,
  clearCache,
};
