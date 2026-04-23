'use strict';

/**
 * Dan ↔ Colin Queue service
 * Source: Notion DB 43d71386-85a1-4582-a2dd-6d541bdcc5d3
 *
 * Properties (from verified Notion MCP schema):
 *   Body         — title
 *   Answer       — rich_text
 *   Recommendation — rich_text
 *   Section      — select: 🔥 Now | ⚡ Waiting on You | 📥 Drop | 👀 Watch | ✅ Closed
 *   Owner        — select: Colin | Dan
 *   Status       — select: Open | Resolved | Archived
 *   Focus Area   — relation → 66ca7a48-f238-481f-a794-8353222b1b84
 *   Created      — created_time
 *   Updated      — last_edited_time
 */

const notion = require('./notion');

const DB_ID = '43d71386-85a1-4582-a2dd-6d541bdcc5d3';

// Section values exactly as they appear in Notion
const SECTION = {
  NOW:     '🔥 Now',
  WAITING: '⚡ Waiting on You',
  DROP:    '📥 Drop',
  WATCH:   '👀 Watch',
  CLOSED:  '✅ Closed',
};

// Simple in-process cache — 5-minute TTL, matching other domain services
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

function invalidateCache() {
  _cache = null;
  _cacheTime = 0;
}

function isCacheFresh() {
  return _cache !== null && (Date.now() - _cacheTime) < CACHE_TTL_MS;
}

/**
 * Resolve Focus Area relation IDs to names using the Focus Areas DB.
 * Returns a lookup map: { id (normalized, no dashes) -> name }.
 */
async function buildFocusAreaLookup(allIds) {
  const uniqueIds = [...new Set(allIds.filter(id => typeof id === 'string' && id.length >= 30))];
  if (uniqueIds.length === 0) return {};

  const lookup = {};
  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const page = await notion.getPage(id);
        if (page) {
          const name = page.properties.Name || page.properties.Title || page.properties.name || null;
          lookup[id.replace(/-/g, '')] = typeof name === 'string' ? name : (name?.name || id.slice(0, 8));
        }
      } catch {
        lookup[id.replace(/-/g, '')] = id.slice(0, 8);
      }
    })
  );
  return lookup;
}

/**
 * Transform a raw Notion result row (already simplified via queryDatabase) into
 * the canonical row shape exposed by this service.
 */
function transformRow(row, focusAreaLookup) {
  const focusAreaIds = Array.isArray(row['Focus Area']) ? row['Focus Area'] : [];
  const focusAreaNames = focusAreaIds.map(id => focusAreaLookup[id.replace(/-/g, '')] || null).filter(Boolean);

  return {
    id: row.id,
    body: row.Body || '',
    answer: row.Answer || '',
    recommendation: row.Recommendation || '',
    section: row.Section || null,
    owner: row.Owner || null,
    status: row.Status || null,
    focusAreaIds,
    focusAreaNames,
    createdAt: row.created || null,
    updatedAt: row.updated || null,
  };
}

/**
 * Fetch all non-Archived rows from the Dan ↔ Colin Queue DB.
 * Returns raw simplified rows sorted by updated desc.
 */
async function fetchRawRows() {
  const filter = {
    property: 'Status',
    select: { does_not_equal: 'Archived' },
  };
  const sorts = [{ timestamp: 'last_edited_time', direction: 'descending' }];

  // Paginate — queue could exceed 50 rows
  const allResults = [];
  let cursor;
  do {
    const resp = await notion.queryDatabase(DB_ID, {
      filter,
      sorts,
      startCursor: cursor,
      pageSize: 100,
    });
    allResults.push(...resp.results);
    cursor = resp.hasMore ? resp.nextCursor : null;
  } while (cursor);

  return allResults;
}

/**
 * `closed` bucket logic:
 *  - Status = Resolved, OR
 *  - Section = ✅ Closed AND updated within the last 7 days
 */
function isClosedRow(row) {
  if (row.Status === 'Resolved') return true;
  if (row.Section === SECTION.CLOSED) {
    if (!row.updated) return true; // no date — include it
    const age = Date.now() - new Date(row.updated).getTime();
    return age <= 7 * 24 * 60 * 60 * 1000;
  }
  return false;
}

/**
 * getQueue() → grouped + sorted queue payload.
 *
 * Bucket rules:
 *   now     — Section = 🔥 Now, not closed
 *   waiting — Section = ⚡ Waiting on You, not closed
 *   drop    — Section = 📥 Drop, not closed
 *   watch   — Section = 👀 Watch, not closed
 *   closed  — Status=Resolved OR (Section=✅ Closed AND within 7 days)
 *
 * Each bucket is sorted by updatedAt desc (already sorted at DB level).
 */
async function getQueue() {
  if (isCacheFresh()) return _cache;

  const rawRows = await fetchRawRows();

  // Collect all Focus Area IDs for bulk name resolution
  const allFocusAreaIds = [];
  for (const row of rawRows) {
    const ids = Array.isArray(row['Focus Area']) ? row['Focus Area'] : [];
    allFocusAreaIds.push(...ids);
  }
  const focusAreaLookup = await buildFocusAreaLookup(allFocusAreaIds);

  const groups = { now: [], waiting: [], drop: [], watch: [], closed: [] };

  for (const row of rawRows) {
    const transformed = transformRow(row, focusAreaLookup);
    if (isClosedRow(row)) {
      groups.closed.push(transformed);
      continue;
    }
    switch (row.Section) {
      case SECTION.NOW:     groups.now.push(transformed);     break;
      case SECTION.WAITING: groups.waiting.push(transformed); break;
      case SECTION.DROP:    groups.drop.push(transformed);    break;
      case SECTION.WATCH:   groups.watch.push(transformed);   break;
      // Rows with no section or unknown section fall into watch
      default:              groups.watch.push(transformed);   break;
    }
  }

  const counts = {
    now: groups.now.length,
    waiting: groups.waiting.length,
    drop: groups.drop.length,
    watch: groups.watch.length,
    closed: groups.closed.length,
    total: rawRows.length,
  };

  const result = {
    ...groups,
    meta: {
      lastSyncedAt: new Date().toISOString(),
      counts,
    },
  };

  _cache = result;
  _cacheTime = Date.now();
  return result;
}

/**
 * submitAnswer(pageId, answerText)
 *
 * Updates the Answer rich_text property.
 * If the answer is non-empty AND the row is currently a ⚡ Waiting on You row,
 * also atomically sets Section = ✅ Closed and Status = Resolved.
 *
 * Returns the updated page id and whether auto-close was triggered.
 */
async function submitAnswer(pageId, answerText) {
  const notionClient = notion.getClient();

  // Fetch current row to check Section for auto-close logic
  const raw = await notionClient.pages.retrieve({ page_id: pageId });
  const simplified = notion.simplify(raw.properties);
  const currentSection = simplified.Section || null;
  const shouldAutoClose = answerText.trim().length > 0 && currentSection === SECTION.WAITING;

  const properties = {
    Answer: { rich_text: [{ text: { content: answerText } }] },
  };

  if (shouldAutoClose) {
    properties.Section = { select: { name: SECTION.CLOSED } };
    properties.Status  = { select: { name: 'Resolved' } };
  }

  await notionClient.pages.update({ page_id: pageId, properties });

  invalidateCache();
  return { id: pageId, autoClose: shouldAutoClose };
}

/**
 * createDrop(bodyText)
 *
 * Creates a new row with:
 *   Body    = bodyText
 *   Section = 📥 Drop
 *   Owner   = Colin
 *   Status  = Open
 */
async function createDrop(bodyText) {
  const notionClient = notion.getClient();

  const result = await notionClient.pages.create({
    parent: { database_id: DB_ID },
    properties: {
      Body: {
        title: [{ text: { content: bodyText } }],
      },
      Section: { select: { name: SECTION.DROP } },
      Owner:   { select: { name: 'Colin' } },
      Status:  { select: { name: 'Open' } },
    },
  });

  invalidateCache();
  return { id: result.id, url: result.url };
}

module.exports = {
  getQueue,
  submitAnswer,
  createDrop,
  invalidateCache,      // exported for tests
  SECTION,              // exported for tests
};
