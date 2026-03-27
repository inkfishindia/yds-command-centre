const express = require('express');
const router = express.Router();
const fs = require('fs/promises');
const path = require('path');
const config = require('../config');
const ceoDashboardService = require('../services/ceo-dashboard-service');
const notionService = require('../services/notion');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const OUTPUTS_DIR = path.join(ROOT_DIR, 'outputs');
const REVIEW_STATE_PATH = path.join(ROOT_DIR, 'data', 'sessions', 'ceo-review-state.json');

const DOCUMENT_DIRS = {
  outputs: OUTPUTS_DIR,
  briefings: config.BRIEFINGS_DIR,
  decisions: config.DECISIONS_DIR,
  'weekly-reviews': config.WEEKLY_REVIEWS_DIR,
};
const LIST_CACHE_TTL = 15 * 1000;
const CONTENT_CACHE_TTL = 15 * 1000;
const ENTITY_CATALOG_TTL = 60 * 1000;
const listCache = new Map();
const contentCache = new Map();
let entityCatalogCache = null;

/**
 * GET /api/documents
 * List all documents across all directories.
 */
router.get('/', async (req, res) => {
  try {
    const all = {};
    for (const [name, dir] of Object.entries(DOCUMENT_DIRS)) {
      all[name] = await listDir(dir);
    }
    all._summary = buildReviewSummary(all.outputs || []);
    res.json(all);
  } catch (err) {
    console.error('Documents list error:', err);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

/**
 * GET /api/documents/:category
 * List documents in a specific category (briefings, decisions, weekly-reviews).
 */
router.get('/:category', async (req, res) => {
  const dir = DOCUMENT_DIRS[req.params.category];
  if (!dir) {
    return res.status(404).json({ error: 'Unknown document category' });
  }
  res.json({ files: await listDir(dir) });
});

/**
 * GET /api/documents/:category/:filename
 * Read a specific document.
 */
router.get('/:category/:filename', async (req, res) => {
  const dir = DOCUMENT_DIRS[req.params.category];
  if (!dir) {
    return res.status(404).json({ error: 'Unknown document category' });
  }

  const filename = path.basename(req.params.filename); // Prevent path traversal
  const filePath = path.join(dir, filename);

  if (!filePath.startsWith(dir)) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  try {
    const content = await readDocument(filePath);
    const reviewState = await getReviewState();
    const review = reviewState[path.relative(ROOT_DIR, filePath)] || {};
    const catalog = await getEntityCatalog();
    const relatedContext = extractRelatedContext({
      category: req.params.category,
      filename,
      content,
      catalog,
    });
    res.json({
      filename,
      content,
      category: req.params.category,
      path: path.relative(ROOT_DIR, filePath),
      status: review.status || 'pending',
      reviewedAt: review.reviewedAt || null,
      reviewerNote: review.note || '',
      history: Array.isArray(review.history) ? review.history : [],
      relatedContext,
    });
  } catch {
    res.status(404).json({ error: 'File not found' });
  }
});

router.post('/review', async (req, res) => {
  try {
    const { path: itemPath, status, note } = req.body || {};
    if (!itemPath || !status) {
      return res.status(400).json({ error: 'path and status are required' });
    }

    const review = await ceoDashboardService.setReviewStatus({ path: itemPath, status, note });
    listCache.clear();
    contentCache.clear();
    return res.json({ ok: true, review });
  } catch (err) {
    console.error('Documents review error:', err);
    return res.status(500).json({ error: 'Failed to update document review state' });
  }
});

async function getReviewState() {
  try {
    return JSON.parse(await fs.readFile(REVIEW_STATE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

async function listDir(dir) {
  const cached = listCache.get(dir);
  if (cached && Date.now() - cached.time < LIST_CACHE_TTL) {
    return cached.data;
  }

  try {
    const reviewState = await getReviewState();
    await fs.access(dir);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter(e => e.isFile() && e.name.endsWith('.md'))
        .map(async (entry) => {
          const filePath = path.join(dir, entry.name);
          const stat = await fs.stat(filePath);
          const relativePath = path.relative(ROOT_DIR, filePath);
          const review = reviewState[relativePath] || {};
          return {
            name: entry.name,
            modified: stat.mtime.toISOString(),
            path: relativePath,
            status: review.status || 'pending',
            reviewedAt: review.reviewedAt || null,
            reviewerNote: review.note || '',
          };
        })
    );
    files.sort((a, b) => b.name.localeCompare(a.name));
    listCache.set(dir, { data: files, time: Date.now() });
    return files;
  } catch {
    return [];
  }
}

async function readDocument(filePath) {
  const cached = contentCache.get(filePath);
  if (cached && Date.now() - cached.time < CONTENT_CACHE_TTL) {
    return cached.data;
  }

  const content = await fs.readFile(filePath, 'utf-8');
  contentCache.set(filePath, { data: content, time: Date.now() });
  return content;
}

function buildReviewSummary(items) {
  const summary = {
    total: items.length,
    pending: 0,
    approved: 0,
    'needs-edit': 0,
    rejected: 0,
  };
  items.forEach((item) => {
    const key = item.status || 'pending';
    if (summary[key] !== undefined) {
      summary[key] += 1;
    }
  });
  return summary;
}

async function getEntityCatalog() {
  if (entityCatalogCache && Date.now() - entityCatalogCache.time < ENTITY_CATALOG_TTL) {
    return entityCatalogCache.data;
  }

  const [peopleResult, dashboardResult, projectsResult, decisionsResult] = await Promise.allSettled([
    notionService.getPeople(),
    notionService.getDashboardSummary(),
    notionService.getProjects(),
    notionService.getRecentDecisions(365),
  ]);

  const people = peopleResult.status === 'fulfilled' && Array.isArray(peopleResult.value)
    ? peopleResult.value
    : [];
  const dashboard = dashboardResult.status === 'fulfilled' && dashboardResult.value
    ? dashboardResult.value
    : {};
  const projects = projectsResult.status === 'fulfilled' && Array.isArray(projectsResult.value)
    ? projectsResult.value
    : [];
  const decisions = decisionsResult.status === 'fulfilled' && Array.isArray(decisionsResult.value)
    ? decisionsResult.value
    : [];

  const data = {
    people: people
      .map((person) => ({ id: person.id, name: String(person.Name || '').trim() }))
      .filter((person) => person.name),
    focusAreas: (dashboard.focusAreas || [])
      .map((area) => ({ id: area.id, name: String(area.Name || '').trim() }))
      .filter((area) => area.name),
    projects: projects
      .map((project) => ({ id: project.id, name: String(project.Name || '').trim() }))
      .filter((project) => project.name),
    decisions: decisions
      .map((decision) => ({
        id: decision.id,
        title: String(decision.Name || decision.Decision || decision.Title || '').trim(),
      }))
      .filter((decision) => decision.title),
  };

  entityCatalogCache = { time: Date.now(), data };
  return data;
}

function extractRelatedContext({ category, filename, content, catalog }) {
  const text = `${filename}\n${content}`;
  const views = inferViews(text, category);
  return {
    owners: collectEntityMatches(text, catalog.people, 'name'),
    focusAreas: collectEntityMatches(text, catalog.focusAreas, 'name'),
    projects: collectEntityMatches(text, catalog.projects, 'name'),
    decisions: collectDecisionMatches(text, catalog.decisions),
    views,
  };
}

function collectEntityMatches(text, items, key) {
  const haystack = String(text || '').toLowerCase();
  const seen = new Set();
  const matches = [];

  for (const item of Array.isArray(items) ? items : []) {
    const value = String(item?.[key] || '').trim();
    if (!value) continue;
    const normalized = value.toLowerCase();
    if (!haystack.includes(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    matches.push({ id: item.id, name: value });
  }

  return matches.slice(0, 6);
}

function collectDecisionMatches(text, items) {
  const haystack = String(text || '').toLowerCase();
  const seen = new Set();
  const matches = [];
  const directHeading = extractFirstMeaningfulValue(text, ['Decision', 'Title', 'Name']);

  for (const item of Array.isArray(items) ? items : []) {
    const title = String(item?.title || '').trim();
    if (!title) continue;
    const normalized = title.toLowerCase();
    const exactHeadingMatch = directHeading && normalized === directHeading.toLowerCase();
    if (!(exactHeadingMatch || haystack.includes(normalized)) || seen.has(normalized)) continue;
    seen.add(normalized);
    matches.push({ id: item.id, title });
  }

  if (!matches.length && directHeading) {
    matches.push({ id: null, title: directHeading });
  }

  return matches.slice(0, 5);
}

function extractFirstMeaningfulValue(text, labels) {
  const lines = String(text || '').split('\n');
  const normalizedLabels = labels.map((label) => String(label || '').trim().toLowerCase());

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;

    for (const label of normalizedLabels) {
      const heading = `## ${label}`;
      if (line.toLowerCase() === heading) {
        for (let next = index + 1; next < lines.length; next += 1) {
          const candidate = lines[next].trim().replace(/^[-*]\s+/, '');
          if (candidate) return candidate;
        }
      }

      const prefix = `${label}:`;
      if (line.toLowerCase().startsWith(prefix)) {
        return line.slice(prefix.length).trim();
      }
    }
  }

  return '';
}

function inferViews(text, category) {
  const haystack = String(text || '').toLowerCase();
  const matches = [];
  const seen = new Set();
  const viewMap = [
    { id: 'overview', label: 'Overview', keywords: ['overview', 'org dashboard', 'command centre'] },
    { id: 'dashboard', label: 'Dashboard', keywords: ['dashboard', 'daily brief', 'run today'] },
    { id: 'marketingOps', label: 'Marketing', keywords: ['marketing', 'campaign', 'content', 'sequence', 'launch'] },
    { id: 'crm', label: 'CRM', keywords: ['crm', 'pipeline', 'lead', 'sales'] },
    { id: 'techTeam', label: 'Tech', keywords: ['tech', 'engineering', 'sprint', 'bug', 'spec'] },
    { id: 'factory', label: 'Factory', keywords: ['factory', 'capacity', 'bottleneck', 'zone'] },
    { id: 'ops', label: 'Ops', keywords: ['inventory', 'vendor', 'purchase order', 'stock', 'ops'] },
    { id: 'projects', label: 'Projects', keywords: ['project', 'focus area', 'milestone'] },
    { id: 'docs', label: 'Docs / Review', keywords: ['brief', 'faq', 'six-pager', 'review', 'output'] },
    { id: 'decisions', label: 'Decisions', keywords: ['decision', 'rationale', 'alternatives', 'risks'] },
  ];

  if (category === 'outputs') {
    matches.push({ id: 'docs', label: 'Docs / Review' });
    seen.add('docs');
  }

  for (const view of viewMap) {
    if (seen.has(view.id)) continue;
    if (view.keywords.some((keyword) => haystack.includes(keyword))) {
      matches.push({ id: view.id, label: view.label });
      seen.add(view.id);
    }
  }

  return matches.slice(0, 4);
}

module.exports = router;
