'use strict';
// writes/commitments.js
// Purpose: All write operations for the Commitments and Decisions databases.
// Public exports: createCommitment, createDecision, updateCommitmentStatus, updateCommitmentPriority,
//   updateCommitmentDueDate, updateCommitmentAssignee, appendCommitmentNote
// DO NOT add: read queries (reads/commitments.js), marketing or tech writes.
// Uses: enqueueWrite (write-queue), invalidateCommitmentCaches (cache-invalidation), cache (for inline deletions).

const { getClient } = require('../client');
const { withRetry } = require('../retry');
const { cache } = require('../cache');
const { DB } = require('../databases');
const { enqueueWrite } = require('../write-queue');
const { invalidateCommitmentCaches } = require('../cache-invalidation');

/**
 * Create a new commitment page in the Commitments database.
 */
async function createCommitment({ name, assigneeId, dueDate, focusAreaId, priority, projectId, notes }) {
  return enqueueWrite(async () => {
    const notion = getClient();
    const properties = {
      Name: { title: [{ text: { content: name } }] },
      Status: { select: { name: 'Not Started' } },
      Priority: { select: { name: priority || 'Medium' } },
      Source: { select: { name: 'Dashboard' } },
      Type: { select: { name: 'Deliverable' } },
    };

    if (dueDate) {
      properties['Due Date'] = { date: { start: dueDate } };
    }

    if (assigneeId) {
      const cleanId = assigneeId.replace(/-/g, '');
      const formattedId = [
        cleanId.slice(0, 8), cleanId.slice(8, 12), cleanId.slice(12, 16),
        cleanId.slice(16, 20), cleanId.slice(20),
      ].join('-');
      properties['Assigned To'] = { relation: [{ id: formattedId }] };
    }

    if (focusAreaId) {
      const cleanId = focusAreaId.replace(/-/g, '');
      const formattedId = [
        cleanId.slice(0, 8), cleanId.slice(8, 12), cleanId.slice(12, 16),
        cleanId.slice(16, 20), cleanId.slice(20),
      ].join('-');
      properties['Focus Area'] = { relation: [{ id: formattedId }] };
    }

    if (projectId) {
      const cleanId = projectId.replace(/-/g, '');
      const formattedId = [
        cleanId.slice(0, 8), cleanId.slice(8, 12), cleanId.slice(12, 16),
        cleanId.slice(16, 20), cleanId.slice(20),
      ].join('-');
      properties['Project'] = { relation: [{ id: formattedId }] };
    }

    if (notes) {
      properties['Notes'] = { rich_text: [{ text: { content: notes } }] };
    }

    const result = await withRetry(() => notion.pages.create({
      parent: { database_id: DB.COMMITMENTS },
      properties,
    }));

    invalidateCommitmentCaches();
    return { id: result.id, url: result.url };
  });
}

/**
 * Create a new decision page in the Decisions database.
 */
async function createDecision({ name, decision, rationale, context, focusAreaId, owner }) {
  return enqueueWrite(async () => {
    const notion = getClient();
    const today = new Date().toISOString().split('T')[0];
    const properties = {
      Name: { title: [{ text: { content: name } }] },
      Date: { date: { start: today } },
      Owner: { rich_text: [{ text: { content: owner || 'Dan' } }] },
      Decision: { rich_text: [{ text: { content: decision } }] },
      Rationale: { rich_text: [{ text: { content: rationale || '' } }] },
    };

    if (context) {
      properties['Context'] = { rich_text: [{ text: { content: context } }] };
    }

    if (focusAreaId) {
      const cleanId = focusAreaId.replace(/-/g, '');
      const formattedId = [
        cleanId.slice(0, 8), cleanId.slice(8, 12), cleanId.slice(12, 16),
        cleanId.slice(16, 20), cleanId.slice(20),
      ].join('-');
      properties['Focus Area'] = { relation: [{ id: formattedId }] };
    }

    const result = await withRetry(() => notion.pages.create({
      parent: { database_id: DB.DECISIONS },
      properties,
    }));

    // Invalidate decisions cache entries
    for (const [key] of cache) {
      if (key.startsWith('decisions_') || key.includes('dashboard')) {
        cache.delete(key);
      }
    }

    return { id: result.id, url: result.url };
  });
}

/**
 * Update the Status field of a commitment page.
 */
async function updateCommitmentStatus(pageId, status) {
  return enqueueWrite(async () => {
    const notion = getClient();
    await withRetry(() => notion.pages.update({
      page_id: pageId,
      properties: { Status: { select: { name: status } } },
    }));
    invalidateCommitmentCaches();
    return { id: pageId, status };
  });
}

/**
 * Update the Priority field of a commitment page.
 */
async function updateCommitmentPriority(pageId, priority) {
  return enqueueWrite(async () => {
    const notion = getClient();
    await withRetry(() => notion.pages.update({
      page_id: pageId,
      properties: { Priority: { select: { name: priority } } },
    }));
    invalidateCommitmentCaches();
    return { id: pageId, priority };
  });
}

/**
 * Update the Due Date field of a commitment page.
 * @param {string} dueDate - ISO date string YYYY-MM-DD
 */
async function updateCommitmentDueDate(pageId, dueDate) {
  return enqueueWrite(async () => {
    const notion = getClient();
    await withRetry(() => notion.pages.update({
      page_id: pageId,
      properties: { 'Due Date': { date: { start: dueDate } } },
    }));
    invalidateCommitmentCaches();
    return { id: pageId, dueDate };
  });
}

/**
 * Update the Assigned To relation of a commitment page.
 * Normalises the personId to standard UUID format before sending.
 */
async function updateCommitmentAssignee(pageId, personId) {
  return enqueueWrite(async () => {
    const notion = getClient();
    const cleanId = personId.replace(/-/g, '');
    const formattedId = [
      cleanId.slice(0, 8), cleanId.slice(8, 12), cleanId.slice(12, 16),
      cleanId.slice(16, 20), cleanId.slice(20),
    ].join('-');
    await withRetry(() => notion.pages.update({
      page_id: pageId,
      properties: { 'Assigned To': { relation: [{ id: formattedId }] } },
    }));
    invalidateCommitmentCaches();
    return { id: pageId, assigneeId: personId };
  });
}

/**
 * Append a timestamped note to the Notes rich_text field of a commitment page.
 * Preserves existing content and truncates to 1900 chars to stay within Notion limits.
 */
async function appendCommitmentNote(pageId, note) {
  // Note: read-then-write is not atomic. Safe because write queue serializes and single user.
  return enqueueWrite(async () => {
    const notion = getClient();
    const currentPage = await withRetry(() => notion.pages.retrieve({ page_id: pageId }));
    const currentNotes = currentPage.properties.Notes?.rich_text
      ?.map(t => t.plain_text).join('') || '';
    const today = new Date().toISOString().split('T')[0];
    const separator = currentNotes ? '\n' : '';
    const newNotes = currentNotes + separator + `[${today} via Dashboard] ${note}`;
    const truncated = newNotes.slice(-1900);

    await withRetry(() => notion.pages.update({
      page_id: pageId,
      properties: {
        Notes: { rich_text: [{ text: { content: truncated } }] },
      },
    }));
    invalidateCommitmentCaches();
    return { id: pageId, notes: truncated };
  });
}

module.exports = {
  createCommitment,
  createDecision,
  updateCommitmentStatus,
  updateCommitmentPriority,
  updateCommitmentDueDate,
  updateCommitmentAssignee,
  appendCommitmentNote,
};
