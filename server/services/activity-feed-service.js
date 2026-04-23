'use strict';

/**
 * Activity Feed Service
 *
 * Merges three data sources into a single time-ordered activity stream:
 *   1. Decisions      — Notion Decisions DB, filtered by Date ≥ N days ago
 *   2. Commitments    — Notion Commitments DB, filtered by last_edited_time ≥ N days ago
 *   3. Dan ↔ Colin    — Closed/Resolved items from dan-colin-service.getQueue()
 *
 * Graceful degradation: if any source throws, that source is excluded and
 * meta.sources.<key> is set to false. The feed is returned with the remaining sources.
 */

const notion = require('./notion');
const danColinService = require('./dan-colin-service');

// Decisions and Commitments DB IDs (from notion-hub.md / notion.js constants)
const DECISIONS_DB_ID    = '3c8a9b22ba924f20bfdcab4cc7a46478';
const COMMITMENTS_DB_ID  = '0b50073e544942aab1099fc559b390fb';

// ── In-process cache, keyed by days value ────────────────────────────────────
const _cache = new Map();     // key: days (number) → { data, time }
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

function getCached(days) {
  const entry = _cache.get(days);
  if (!entry) return null;
  if (Date.now() - entry.time < CACHE_TTL_MS) return entry.data;
  _cache.delete(days);
  return null;
}

function setCache(days, data) {
  _cache.set(days, { data, time: Date.now() });
}

// ── Source loaders ────────────────────────────────────────────────────────────

/**
 * Load decisions from the last N days via notion.queryDatabase.
 * Returns an array of activity items.
 */
async function loadDecisions(days) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const items = [];
  let cursor;
  do {
    const resp = await notion.queryDatabase(DECISIONS_DB_ID, {
      filter: {
        property: 'Date',
        date: { on_or_after: sinceStr },
      },
      sorts: [{ property: 'Date', direction: 'descending' }],
      pageSize: 100,
      startCursor: cursor,
    });
    for (const row of resp.results) {
      // Date property is a { start, end } object from simplify()
      const dateVal = row['Date'];
      const dateStr = dateVal && typeof dateVal === 'object' ? dateVal.start : (dateVal || null);
      if (!dateStr) continue;

      // Only include items within the requested window
      if (dateStr < sinceStr) continue;

      // Focus Area is a relation array of IDs
      const focusAreaIds = Array.isArray(row['Focus Area']) ? row['Focus Area'] : [];

      items.push({
        id: row.id,
        type: 'decision',
        date: dateStr,
        title: row['Name'] || 'Untitled decision',
        summary: row['Decision'] || row['Context'] || '',
        owner: row['Owner'] || null,
        pageId: row.id,
        focusArea: focusAreaIds[0] || null,
        status: null,
      });
    }
    cursor = resp.hasMore ? resp.nextCursor : null;
  } while (cursor);

  return items;
}

/**
 * Load commitments edited within the last N days.
 * Includes all statuses (open + resolved both signal activity).
 * Returns an array of activity items.
 */
async function loadCommitments(days) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const items = [];
  let cursor;
  do {
    const resp = await notion.queryDatabase(COMMITMENTS_DB_ID, {
      filter: {
        timestamp: 'last_edited_time',
        last_edited_time: { on_or_after: sinceStr },
      },
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      pageSize: 100,
      startCursor: cursor,
    });
    for (const row of resp.results) {
      // updated comes from last_edited_time (set by queryDatabase wrapper)
      const dateStr = row.updated
        ? row.updated.split('T')[0]
        : null;
      if (!dateStr) continue;
      if (dateStr < sinceStr) continue;

      const dueDate = row['Due Date'];
      const dueStr = dueDate && typeof dueDate === 'object' ? dueDate.start : (dueDate || null);
      const status = row['Status'] || 'Unknown';
      const summary = dueStr ? `${status} · due ${dueStr}` : status;

      const focusAreaIds = Array.isArray(row['Focus Area']) ? row['Focus Area'] : [];

      items.push({
        id: row.id,
        type: 'commitment',
        date: dateStr,
        title: row['Name'] || 'Untitled commitment',
        summary,
        owner: null, // Assigned To is a relation; skip resolving to keep this read-only cheap
        pageId: row.id,
        focusArea: focusAreaIds[0] || null,
        status,
      });
    }
    cursor = resp.hasMore ? resp.nextCursor : null;
  } while (cursor);

  return items;
}

/**
 * Load closed/resolved Dan ↔ Colin queue items within the last N days.
 * Returns an array of activity items.
 */
async function loadQueueItems(days) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const queue = await danColinService.getQueue();
  const closed = queue.closed || [];

  return closed
    .filter(item => {
      if (!item.updatedAt) return true; // no date — include
      return new Date(item.updatedAt) >= since;
    })
    .map(item => ({
      id: item.id,
      type: 'queue',
      date: item.updatedAt ? item.updatedAt.split('T')[0] : null,
      title: item.body || 'Untitled queue item',
      summary: `Resolved — ${item.section || 'Queue'}`,
      owner: item.owner || null,
      pageId: item.id,
      focusArea: (item.focusAreaIds && item.focusAreaIds[0]) || null,
      status: item.status || null,
    }));
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * getActivityFeed({ days })
 *
 * Returns:
 * {
 *   items: [ { id, type, date, title, summary, owner, pageId, focusArea, status } ],
 *   meta: {
 *     counts: { decision: N, commitment: N, queue: N },
 *     days,
 *     sources: { decisions: true, commitments: true, queue: true }
 *   },
 *   timestamp: ISO string
 * }
 */
async function getActivityFeed(opts = {}) {
  const parsed = parseInt(opts.days, 10);
  const days = Math.min(Math.max(Number.isNaN(parsed) ? 14 : parsed, 1), 90);

  const cached = getCached(days);
  if (cached) return cached;

  const sources = { decisions: true, commitments: true, queue: true };

  const [decisionsResult, commitmentsResult, queueResult] = await Promise.all([
    loadDecisions(days).catch(err => {
      console.error('[activity-feed] decisions source failed:', err.message || err);
      sources.decisions = false;
      return [];
    }),
    loadCommitments(days).catch(err => {
      console.error('[activity-feed] commitments source failed:', err.message || err);
      sources.commitments = false;
      return [];
    }),
    loadQueueItems(days).catch(err => {
      console.error('[activity-feed] queue source failed:', err.message || err);
      sources.queue = false;
      return [];
    }),
  ]);

  const allItems = [...decisionsResult, ...commitmentsResult, ...queueResult];

  // Sort by date descending — null dates go to the end
  allItems.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  });

  const result = {
    items: allItems,
    meta: {
      counts: {
        decision: decisionsResult.length,
        commitment: commitmentsResult.length,
        queue: queueResult.length,
      },
      days,
      sources,
    },
    timestamp: new Date().toISOString(),
  };

  setCache(days, result);
  return result;
}

module.exports = {
  getActivityFeed,
  // exported for tests
  _clearCache: () => _cache.clear(),
  _getCacheMap: () => _cache,
};
