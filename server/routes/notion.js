const express = require('express');
const router = express.Router();
const notionService = require('../services/notion');
const PROJECTS_CACHE_TTL = 60 * 1000;
const ACTION_QUEUE_CACHE_TTL = 30 * 1000;
let projectsResponseCache = null;
let actionQueueResponseCache = null;

function isValidNotionId(id) {
  return /^[a-f0-9]{32}$|^[a-f0-9-]{36}$/.test(id);
}

function getFreshCache(entry, ttlMs) {
  if (!entry) return null;
  if (Date.now() - entry.time > ttlMs) return null;
  return entry.data;
}

function clearRouteCaches() {
  projectsResponseCache = null;
  actionQueueResponseCache = null;
}

/**
 * GET /api/notion/morning-brief
 * Operational brief derived from dashboard data: overdue, today's items, top priorities, flags.
 */
router.get('/morning-brief', async (req, res) => {
  try {
    const brief = await notionService.getMorningBrief();
    res.json(brief);
  } catch (err) {
    console.error('Morning brief error:', err);
    res.status(500).json({ error: 'Failed to generate morning brief' });
  }
});

/**
 * GET /api/notion/dashboard
 * Full dashboard summary — focus areas, overdue commitments, recent decisions, people.
 */
router.get('/dashboard', async (req, res) => {
  try {
    const summary = await notionService.getDashboardSummary();
    res.json({
      ...summary,
      morningBrief: notionService.buildMorningBriefFromDashboard(summary),
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

/**
 * GET /api/notion/focus-areas
 */
router.get('/focus-areas', async (req, res) => {
  try {
    const areas = await notionService.getFocusAreas();
    res.json({ focusAreas: areas });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load focus areas' });
  }
});

/**
 * GET /api/notion/commitments/all
 * All commitments (excluding Cancelled) with resolved relations.
 * Filtering is performed client-side — this route returns the full unfiltered list.
 */
router.get('/commitments/all', async (req, res) => {
  try {
    const commitments = await notionService.getCommitmentsForKanban();
    res.json({ commitments });
  } catch (err) {
    console.error('Commitments all error:', err);
    res.status(500).json({ error: 'Failed to load commitments' });
  }
});

/**
 * GET /api/notion/commitments/overdue
 */
router.get('/commitments/overdue', async (req, res) => {
  try {
    const overdue = await notionService.getOverdueCommitments();
    res.json({ commitments: overdue });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load commitments' });
  }
});

/**
 * GET /api/notion/commitments/upcoming
 */
router.get('/commitments/upcoming', async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 90);
    const commitments = await notionService.getUpcomingCommitments(days);
    res.json({ commitments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load upcoming commitments' });
  }
});

/**
 * GET /api/notion/decisions
 */
router.get('/decisions', async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
    const decisions = await notionService.getRecentDecisions(days);
    res.json({ decisions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load decisions' });
  }
});

/**
 * GET /api/notion/people
 */
router.get('/people', async (req, res) => {
  try {
    const people = await notionService.getPeople();
    res.json({ people });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load people' });
  }
});

/**
 * GET /api/notion/projects
 * All projects with resolved relations (Owner, Focus Area, AI Expert Panel)
 * and commitment stats (openCount, overdueCount, doneCount, totalCount, progressPercent)
 */
router.get('/projects', async (req, res) => {
  try {
    const cached = getFreshCache(projectsResponseCache, PROJECTS_CACHE_TTL);
    if (cached) return res.json(cached);

    const today = new Date().toISOString().split('T')[0];

    // Fetch projects and all commitments in parallel
    const [projects, allCommitments] = await Promise.all([
      notionService.getProjects(),
      notionService.getAllCommitments(false), // excludes Cancelled
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

    // Build lookup: project ID (no dashes) → commitment stats
    const commitmentsByProject = {};
    for (const c of allCommitments) {
      const projectIds = c['Project'] || [];
      for (const pid of (Array.isArray(projectIds) ? projectIds : [])) {
        const nid = pid.replace(/-/g, '');
        if (!commitmentsByProject[nid]) {
          commitmentsByProject[nid] = { open: [], done: [], overdue: [] };
        }
        const isDone = c.Status === 'Done';
        const isActive = !isDone; // Cancelled already excluded from getAllCommitments
        const dueRaw = c['Due Date'];
        const dueStart = dueRaw && typeof dueRaw === 'object' ? dueRaw.start : dueRaw;
        const isOverdue = isActive && dueStart && dueStart < today;

        if (isDone) {
          commitmentsByProject[nid].done.push(c);
        } else {
          commitmentsByProject[nid].open.push(c);
          if (isOverdue) commitmentsByProject[nid].overdue.push(c);
        }
      }
    }

    // Resolve relations and attach commitment stats
    const resolvedProjects = projects.map((p) => {
        const resolved = { ...p };
        for (const key of ['Owner', 'Focus Area', 'Focus Areas', 'Focus area', 'AI Expert Panel']) {
          const value = resolved[key];
          if (!Array.isArray(value)) continue;
          resolved[key] = value.map(id => relationLookup[id] || { id, name: id.slice(0, 8) });
        }
        const nid = p.id.replace(/-/g, '');
        const stats = commitmentsByProject[nid] || { open: [], done: [], overdue: [] };
        const openCount = stats.open.length;
        const doneCount = stats.done.length;
        const overdueCount = stats.overdue.length;
        const totalCount = openCount + doneCount;
        const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

        // Attach slim commitment list for expanded view (name, status, due date)
        const linkedCommitments = [
          ...stats.open.map(c => ({
            id: c.id,
            name: c.Name || 'Untitled',
            status: c.Status || 'Not Started',
            dueDate: c['Due Date'] || null,
            priority: c.Priority || null,
          })),
          ...stats.done.map(c => ({
            id: c.id,
            name: c.Name || 'Untitled',
            status: c.Status || 'Done',
            dueDate: c['Due Date'] || null,
            priority: c.Priority || null,
          })),
        ];

        // Compute last activity across linked commitments for stale detection
        const commitmentDates = [...stats.open, ...stats.done]
          .map(c => c.last_edited_time)
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

    const payload = { projects: resolvedProjects };
    projectsResponseCache = { data: payload, time: Date.now() };
    res.json(payload);
  } catch (err) {
    console.error('Projects error:', err);
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

/**
 * GET /api/notion/databases
 * List all known databases
 */
router.get('/databases', (req, res) => {
  res.json({ databases: notionService.listDatabases() });
});

/**
 * GET /api/notion/databases/:id
 * Query a specific database
 */
router.get('/databases/:id', async (req, res) => {
  if (!isValidNotionId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  try {
    const dbId = req.params.id;
    const options = {};
    if (req.query.cursor) options.startCursor = req.query.cursor;
    if (req.query.pageSize) options.pageSize = Math.min(parseInt(req.query.pageSize) || 50, 100);

    const result = await notionService.queryDatabase(dbId, options);
    res.json(result);
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ error: 'Failed to query database' });
  }
});

/**
 * GET /api/notion/pages/:id
 * Get a page's properties
 */
router.get('/pages/:id', async (req, res) => {
  if (!isValidNotionId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  try {
    const page = await notionService.getPage(req.params.id);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json(page);
  } catch (err) {
    console.error('Page fetch error:', err);
    res.status(500).json({ error: 'Failed to load page' });
  }
});

/**
 * GET /api/notion/pages/:id/related
 * Resolve relation properties to page summaries
 */
router.get('/pages/:id/related', async (req, res) => {
  if (!isValidNotionId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  try {
    const related = await notionService.getRelatedPages(req.params.id);
    res.json({ related });
  } catch (err) {
    console.error('Related pages error:', err);
    res.status(500).json({ error: 'Failed to load related pages' });
  }
});

/**
 * GET /api/notion/pages/:id/content
 * Get a page's block content as markdown
 */
router.get('/pages/:id/content', async (req, res) => {
  if (!isValidNotionId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  try {
    const content = await notionService.getPageContent(req.params.id);
    res.json(content);
  } catch (err) {
    console.error('Page content error:', err);
    res.status(500).json({ error: 'Failed to load page content' });
  }
});

/**
 * GET /api/notion/key-pages
 * List key Notion pages
 */
router.get('/key-pages', (req, res) => {
  res.json({ pages: notionService.getKeyPages() });
});

/**
 * GET /api/notion/focus-areas/:id/detail
 * Full view of one focus area: properties, linked projects, commitments, decisions, stats.
 */
router.get('/focus-areas/:id/detail', async (req, res) => {
  if (!isValidNotionId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  try {
    const { id } = req.params;

    // Fetch in parallel — all calls are cached
    const [focusArea, allCommitments, people, recentDecisions, allProjects] = await Promise.all([
      notionService.getPage(id),
      notionService.getAllCommitments(),
      notionService.getPeople(),
      notionService.getRecentDecisions(365),
      notionService.getProjects(),
    ]);

    if (!focusArea) return res.status(404).json({ error: 'Focus area not found' });

    // Build people lookup: id (no dashes) → name
    const peopleLookup = {};
    people.forEach(p => { peopleLookup[p.id.replace(/-/g, '')] = p.Name; });

    const normId = id.replace(/-/g, '');
    const today = new Date().toISOString().split('T')[0];

    // Filter commitments linked to this focus area
    const faCommitments = allCommitments.filter(c => {
      const faIds = c['Focus Area'] || c['Focus Areas'] || c['Focus area'] || [];
      return Array.isArray(faIds) && faIds.some(fid => fid.replace(/-/g, '') === normId);
    });

    // Enrich commitments with owner names + overdue status
    const enrichedCommitments = faCommitments.map(c => {
      const assignedIds = c['Assigned To'] || [];
      const assignedNames = (Array.isArray(assignedIds) ? assignedIds : [])
        .map(aid => peopleLookup[aid.replace(/-/g, '')] || 'Unknown');
      const dueDate = typeof c['Due Date'] === 'object' ? c['Due Date']?.start : c['Due Date'];
      const isOverdue = dueDate && dueDate < today && !['Done', 'Cancelled'].includes(c.Status);
      const daysOverdue = isOverdue ? Math.floor((new Date(today) - new Date(dueDate)) / 86400000) : 0;

      return { ...c, assignedNames, dueDate, isOverdue, daysOverdue };
    });

    // Sort: overdue first (by days desc), then by due date asc
    enrichedCommitments.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.isOverdue && b.isOverdue) return b.daysOverdue - a.daysOverdue;
      return (a.dueDate || 'z') > (b.dueDate || 'z') ? 1 : -1;
    });

    // Filter decisions linked to this focus area
    const faDecisions = recentDecisions.filter(d => {
      const dFaIds = d['Focus Area'] || d['Focus Areas'] || [];
      return Array.isArray(dFaIds) && dFaIds.some(fid => fid.replace(/-/g, '') === normId);
    });

    // Filter projects linked to this focus area
    const faProjects = allProjects.filter(p => {
      const pFaIds = p['Focus Area'] || p['Focus Areas'] || p['Focus area'] || [];
      return Array.isArray(pFaIds) && pFaIds.some(fid => fid.replace(/-/g, '') === normId);
    });

    // Compute summary stats
    const openCount = enrichedCommitments.filter(c => !['Done', 'Cancelled'].includes(c.Status)).length;
    const overdueCount = enrichedCommitments.filter(c => c.isOverdue).length;
    const blockedCount = enrichedCommitments.filter(c => c.Status === 'Blocked').length;

    res.json({
      focusArea,
      projects: faProjects,
      commitments: enrichedCommitments,
      decisions: faDecisions,
      stats: { openCount, overdueCount, blockedCount, projectCount: faProjects.length },
    });
  } catch (err) {
    console.error('Focus area detail error:', err);
    res.status(500).json({ error: 'Failed to load focus area detail' });
  }
});

/**
 * GET /api/notion/people/:id/detail
 * Full view of one person: properties, commitments assigned to them, load metrics.
 */
router.get('/people/:id/detail', async (req, res) => {
  if (!isValidNotionId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  try {
    const { id } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const normId = id.replace(/-/g, '');

    // Fetch in parallel — all calls are cached
    const [person, allCommitments, focusAreas] = await Promise.all([
      notionService.getPage(id),
      notionService.getAllCommitments(),
      notionService.getFocusAreas(),
    ]);

    if (!person) return res.status(404).json({ error: 'Person not found' });

    // Build FA lookup: id (no dashes) → name
    const faLookup = {};
    focusAreas.forEach(fa => { faLookup[fa.id.replace(/-/g, '')] = fa.Name; });

    // Filter commitments assigned to this person
    const personCommitments = allCommitments.filter(c => {
      const assignedIds = c['Assigned To'] || [];
      return Array.isArray(assignedIds) && assignedIds.some(aid => aid.replace(/-/g, '') === normId);
    });

    // Enrich with overdue status + FA names
    const enriched = personCommitments.map(c => {
      const dueDate = typeof c['Due Date'] === 'object' ? c['Due Date']?.start : c['Due Date'];
      const isOverdue = dueDate && dueDate < today && !['Done', 'Cancelled'].includes(c.Status);
      const daysOverdue = isOverdue ? Math.floor((new Date(today) - new Date(dueDate)) / 86400000) : 0;
      const faIds = c['Focus Area'] || c['Focus Areas'] || c['Focus area'] || [];
      const focusAreaNames = (Array.isArray(faIds) ? faIds : [])
        .map(fid => faLookup[fid.replace(/-/g, '')] || 'Unknown');

      return { ...c, dueDate, isOverdue, daysOverdue, focusAreaNames };
    });

    // Sort: overdue first, then by status priority, then by due date
    const statusOrder = { 'Blocked': 0, 'In Progress': 1, 'Not Started': 2, 'Done': 3, 'Cancelled': 4 };
    enriched.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.isOverdue && b.isOverdue) return b.daysOverdue - a.daysOverdue;
      return (statusOrder[a.Status] ?? 3) - (statusOrder[b.Status] ?? 3);
    });

    // Compute load metrics
    const active = enriched.filter(c => !['Done', 'Cancelled'].includes(c.Status));
    const metrics = {
      activeCount: active.length,
      overdueCount: enriched.filter(c => c.isOverdue).length,
      blockedCount: enriched.filter(c => c.Status === 'Blocked').length,
      doneCount: enriched.filter(c => c.Status === 'Done').length,
      capacity: active.length > 8 ? 'overloaded' : active.length > 4 ? 'moderate' : 'light',
    };

    res.json({ person, commitments: enriched, metrics });
  } catch (err) {
    console.error('Person detail error:', err);
    res.status(500).json({ error: 'Failed to load person detail' });
  }
});

/**
 * GET /api/notion/action-queue
 * Returns Dan's action queue and Runner's queue computed from commitments.
 * Dan's queue: blocked items, decision-needed items, overdue items assigned to Dan.
 * Runner's queue: overdue or blocked items NOT assigned to Dan.
 * Both lists are sorted by severity (overdue first, then by days overdue desc).
 */
router.get('/action-queue', async (req, res) => {
  try {
    const cached = getFreshCache(actionQueueResponseCache, ACTION_QUEUE_CACHE_TTL);
    if (cached) return res.json(cached);

    const [allCommitments, people, focusAreas] = await Promise.all([
      notionService.getAllCommitments(),
      notionService.getPeople(),
      notionService.getFocusAreas(),
    ]);

    const today = new Date().toISOString().split('T')[0];

    // Build lookups: id (no dashes) → name
    const peopleLookup = {};
    people.forEach(p => { peopleLookup[p.id.replace(/-/g, '')] = p.Name; });
    const faLookup = {};
    focusAreas.forEach(fa => { faLookup[fa.id.replace(/-/g, '')] = fa.Name; });

    // Dan's Notion person ID (from notion-hub.md)
    const DAN_ID = '307247aa0d7b81318999e80042f45d6a';

    // Enrich active commitments with resolved names and overdue status
    const enriched = allCommitments
      .filter(c => !['Done', 'Cancelled'].includes(c.Status))
      .map(c => {
        const assignedIds = Array.isArray(c['Assigned To']) ? c['Assigned To'] : [];
        const assignedNames = assignedIds.map(id => peopleLookup[id.replace(/-/g, '')] || 'Unknown');
        const faIds = c['Focus Area'] || c['Focus Areas'] || c['Focus area'] || [];
        const focusAreaNames = (Array.isArray(faIds) ? faIds : [])
          .map(id => faLookup[id.replace(/-/g, '')] || 'Unknown');
        const dueDate = typeof c['Due Date'] === 'object' ? c['Due Date']?.start : c['Due Date'];
        const isOverdue = !!(dueDate && dueDate < today);
        const daysOverdue = isOverdue
          ? Math.floor((new Date(today) - new Date(dueDate)) / 86400000)
          : 0;

        return {
          id: c.id,
          name: c.Name,
          status: c.Status,
          priority: c.Priority,
          type: c.Type,
          assignedNames,
          focusAreaNames,
          dueDate,
          isOverdue,
          daysOverdue,
          notes: c.Notes || '',
          assignedIds,
        };
      });

    // Dan's Queue: blocked, decision-needed, or Dan's own overdue items
    const dansQueue = enriched.filter(c => {
      const notesLower = c.notes.toLowerCase();
      const isBlockedOnDan =
        c.status === 'Blocked' &&
        (notesLower.includes('dan') || c.assignedNames.some(n => n === 'Dan'));
      const needsDecision =
        c.type === 'Decision Needed' ||
        notesLower.includes('needs decision') ||
        notesLower.includes('pending decision');
      const isAssignedToDan = c.assignedIds.some(id => id.replace(/-/g, '') === DAN_ID);
      const isDanOverdue = isAssignedToDan && c.isOverdue;

      return isBlockedOnDan || needsDecision || isDanOverdue || c.status === 'Blocked';
    });

    // Runner's Queue: non-Dan items that are overdue or blocked
    const runnersQueue = enriched.filter(c => {
      const isAssignedToDan = c.assignedIds.some(id => id.replace(/-/g, '') === DAN_ID);
      return !isAssignedToDan && (c.isOverdue || c.status === 'Blocked');
    });

    // Sort both queues: overdue first, then by days overdue descending
    const sortBySeverity = (a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return b.daysOverdue - a.daysOverdue;
    };
    dansQueue.sort(sortBySeverity);
    runnersQueue.sort(sortBySeverity);

    const payload = {
      dansQueue,
      runnersQueue,
      dansQueueCount: dansQueue.length,
      runnersQueueCount: runnersQueue.length,
      timestamp: new Date().toISOString(),
    };
    actionQueueResponseCache = { data: payload, time: Date.now() };
    res.json(payload);
  } catch (err) {
    console.error('Action queue error:', err);
    res.status(500).json({ error: 'Failed to load action queue' });
  }
});

/**
 * POST /api/notion/cache/clear
 */
router.post('/cache/clear', (req, res) => {
  notionService.clearCache();
  clearRouteCaches();
  res.json({ status: 'ok', message: 'Notion cache cleared' });
});

module.exports = router;
