const express = require('express');
const router = express.Router();
const notionService = require('../services/notion');
const dashboardService = require('../services/dashboard-service');
const projectsService = require('../services/projects-service');
const notionDetailService = require('../services/notion-detail-service');

function isValidNotionId(id) {
  return /^[a-f0-9]{32}$|^[a-f0-9-]{36}$/.test(id);
}

function clearRouteCaches() {
  projectsService.clearCache();
  dashboardService.clearCache();
}

/**
 * GET /api/notion/morning-brief
 * Operational brief derived from dashboard data: overdue, today's items, top priorities, flags.
 */
router.get('/morning-brief', async (req, res) => {
  try {
    res.json(await dashboardService.getMorningBrief());
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
    res.json(await dashboardService.getDashboardPayload());
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
    res.json(await projectsService.getProjectsPayload());
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
    const detail = await notionDetailService.getFocusAreaDetail(req.params.id);
    if (!detail) return res.status(404).json({ error: 'Focus area not found' });
    res.json(detail);
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
    const detail = await notionDetailService.getPersonDetail(req.params.id);
    if (!detail) return res.status(404).json({ error: 'Person not found' });
    res.json(detail);
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
    res.json(await dashboardService.getActionQueuePayload());
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
