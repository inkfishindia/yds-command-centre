// Direct user-initiated writes — approval gate not required because the user action IS the approval.
// The approval gate in server/services/approval.js is for agent-initiated (Claude) writes only.
const express = require('express');
const router = express.Router();
const notionService = require('../services/notion');

function isValidNotionId(id) {
  return /^[a-f0-9]{32}$|^[a-f0-9-]{36}$/.test(id);
}

const VALID_STATUSES = ['Not Started', 'In Progress', 'Blocked', 'Done', 'Cancelled'];
const VALID_PRIORITIES = ['Urgent', 'High', 'Medium', 'Low'];

// Known AI Expert Panel page IDs — cannot be assigned to commitments
const AI_EXPERT_IDS = new Set([
  '308247aa0d7b8185b2c1d2b738aee402',
  '308247aa0d7b81c1948cf999fd8e3dcf',
  '308247aa0d7b81b1a1fdfd6569d9b202',
  '308247aa0d7b810f8322f160169f2344',
  '308247aa0d7b811fa554f1a77b7e20bc',
]);

router.post('/', async (req, res) => {
  try {
    const { name, assigneeId, dueDate, focusAreaId, priority, projectId, notes } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!assigneeId) {
      return res.status(400).json({ error: 'Assignee is required' });
    }
    if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return res.status(400).json({ error: 'Valid due date (YYYY-MM-DD) is required' });
    }
    if (!focusAreaId) {
      return res.status(400).json({ error: 'Focus area is required' });
    }

    const normalizedAssignee = assigneeId.replace(/-/g, '');
    if (AI_EXPERT_IDS.has(normalizedAssignee)) {
      return res.status(400).json({ error: 'Cannot assign to AI expert' });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    const result = await notionService.createCommitment({
      name: name.trim(),
      assigneeId,
      dueDate,
      focusAreaId,
      priority: priority || 'Medium',
      projectId: projectId || null,
      notes: notes || null,
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Create commitment error:', err);
    res.status(500).json({ error: 'Failed to create commitment' });
  }
});

router.patch('/:pageId/status', async (req, res) => {
  const { pageId } = req.params;
  const { status } = req.body;
  if (!isValidNotionId(pageId)) return res.status(400).json({ error: 'Invalid page ID format' });
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  try {
    const result = await notionService.updateCommitmentStatus(pageId, status);
    res.json(result);
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.patch('/:pageId/priority', async (req, res) => {
  const { pageId } = req.params;
  const { priority } = req.body;
  if (!isValidNotionId(pageId)) return res.status(400).json({ error: 'Invalid page ID format' });
  if (!priority || !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }
  try {
    const result = await notionService.updateCommitmentPriority(pageId, priority);
    res.json(result);
  } catch (err) {
    console.error('Update priority error:', err);
    res.status(500).json({ error: 'Failed to update priority' });
  }
});

router.patch('/:pageId/due-date', async (req, res) => {
  const { pageId } = req.params;
  const { dueDate } = req.body;
  if (!isValidNotionId(pageId)) return res.status(400).json({ error: 'Invalid page ID format' });
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }
  const parsed = new Date(dueDate + 'T00:00:00');
  if (isNaN(parsed.getTime())) return res.status(400).json({ error: 'Invalid date value' });
  try {
    const result = await notionService.updateCommitmentDueDate(pageId, dueDate);
    res.json(result);
  } catch (err) {
    console.error('Update due date error:', err);
    res.status(500).json({ error: 'Failed to update due date' });
  }
});

router.patch('/:pageId/assignee', async (req, res) => {
  const { pageId } = req.params;
  const { personId } = req.body;
  if (!isValidNotionId(pageId)) return res.status(400).json({ error: 'Invalid page ID format' });
  if (!personId || !isValidNotionId(personId)) {
    return res.status(400).json({ error: 'Invalid person ID format' });
  }
  const cleanId = personId.replace(/-/g, '');
  if (AI_EXPERT_IDS.has(cleanId)) {
    return res.status(400).json({ error: 'Cannot assign commitments to AI experts' });
  }
  try {
    const result = await notionService.updateCommitmentAssignee(pageId, personId);
    res.json(result);
  } catch (err) {
    console.error('Update assignee error:', err);
    res.status(500).json({ error: 'Failed to update assignee' });
  }
});

router.patch('/:pageId/notes', async (req, res) => {
  const { pageId } = req.params;
  const { note } = req.body;
  if (!isValidNotionId(pageId)) return res.status(400).json({ error: 'Invalid page ID format' });
  if (!note || typeof note !== 'string' || note.trim().length === 0) {
    return res.status(400).json({ error: 'Note text is required' });
  }
  if (note.length > 500) return res.status(400).json({ error: 'Note too long (max 500 characters)' });
  try {
    const result = await notionService.appendCommitmentNote(pageId, note.trim());
    res.json(result);
  } catch (err) {
    console.error('Append note error:', err);
    res.status(500).json({ error: 'Failed to append note' });
  }
});

module.exports = router;
