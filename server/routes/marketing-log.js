'use strict';
/**
 * Marketing Log Routes
 * Mount point: /api/marketing-log
 *
 * GET  /  — list recent entries (filter by area, type, tags, status, limit)
 * POST /  — approval-gated create
 */

const express = require('express');
const router = express.Router();
const marketingLogService = require('../services/marketing-log-service');
const approval = require('../services/approval');

const SSE_TIMEOUT_MS = 60 * 1000;

// ── Approval helper (same pattern as mcc.js) ─────────────────────────────────

async function runWithApproval(res, operationName, operationInput, operationFn) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (type, data) => {
    if (!res.writableEnded) {
      res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  const timeout = setTimeout(() => {
    sendEvent('error', { error: 'Approval timed out after 60 seconds' });
    sendEvent('done', { message: 'Operation cancelled (timeout)' });
    res.end();
  }, SSE_TIMEOUT_MS);

  try {
    const { id: approvalId, promise } = approval.createApproval(operationName, operationInput, null);

    sendEvent('approval', {
      approvalId,
      toolName: operationName,
      toolInput: operationInput,
      message: `Approve ${operationName}?`,
    });

    const approved = await promise;

    if (!approved) {
      clearTimeout(timeout);
      sendEvent('text', { text: `${operationName} rejected.` });
      sendEvent('done', { message: 'Operation cancelled' });
      res.end();
      return;
    }

    const result = await operationFn();

    clearTimeout(timeout);
    sendEvent('text', { text: `${operationName} completed.` });
    sendEvent('done', { message: 'Operation complete', result });
    res.end();
  } catch (err) {
    clearTimeout(timeout);
    console.error(`[marketing-log] ${operationName} error:`, err);
    sendEvent('error', { error: err.message || 'Operation failed' });
    sendEvent('done', { message: 'Operation failed' });
    res.end();
  }
}

// ── GET /api/marketing-log ────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    const opts = { limit };

    if (req.query.area) opts.area = req.query.area;
    if (req.query.type) opts.type = req.query.type;
    if (req.query.tag) opts.tag = req.query.tag;
    if (req.query.status) opts.status = req.query.status;

    const result = await marketingLogService.listEntries(opts);
    res.json(result);
  } catch (err) {
    console.error('[marketing-log] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to load marketing log entries' });
  }
});

// ── POST /api/marketing-log ───────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { note, area, type, tags, priority } = req.body;

  if (!note || typeof note !== 'string' || note.trim().length === 0) {
    return res.status(400).json({ error: 'note is required' });
  }

  if (area && !marketingLogService.VALID_AREAS.includes(area)) {
    return res.status(400).json({ error: `Invalid area. Allowed: ${marketingLogService.VALID_AREAS.join(', ')}` });
  }

  if (type && !marketingLogService.VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Allowed: ${marketingLogService.VALID_TYPES.join(', ')}` });
  }

  if (tags !== undefined && !Array.isArray(tags)) {
    return res.status(400).json({ error: 'tags must be an array' });
  }

  if (tags) {
    const invalid = tags.filter(t => !marketingLogService.VALID_TAGS.includes(t));
    if (invalid.length > 0) {
      return res.status(400).json({ error: `Invalid tag(s): ${invalid.join(', ')}. Allowed: ${marketingLogService.VALID_TAGS.join(', ')}` });
    }
  }

  if (priority && !marketingLogService.VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority. Allowed: ${marketingLogService.VALID_PRIORITIES.join(', ')}` });
  }

  const entryData = {
    note: note.trim(),
    area: area || null,
    type: type || null,
    tags: tags || [],
    priority: priority || 'Medium',
  };

  await runWithApproval(
    res,
    'create-marketing-log-entry',
    { note: entryData.note, area: entryData.area, type: entryData.type, priority: entryData.priority },
    () => marketingLogService.createEntry(entryData)
  );
});

module.exports = router;
