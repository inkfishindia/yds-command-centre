'use strict';

/**
 * Dan ↔ Colin Queue routes
 * Mount point: /api/dan-colin
 *
 * GET  /              → getQueue()
 * POST /:id/answer    → submitAnswer() — SSE + approval gate
 * POST /drop          → createDrop()   — SSE + approval gate
 */

const express = require('express');
const router = express.Router();
const danColinService = require('../services/dan-colin-service');
const approval = require('../services/approval');

const SSE_TIMEOUT_MS = 60 * 1000; // 1-minute timeout for approval waits

function isValidNotionId(id) {
  return /^[a-f0-9]{32}$|^[a-f0-9-]{36}$/.test(id);
}

/**
 * Shared SSE write helper for approval-gated routes.
 * Sets up SSE headers, creates an approval record, streams the approval event,
 * waits for Dan's decision, then executes the write function if approved.
 *
 * @param {object} res          - Express response
 * @param {string} toolName     - Human-readable label shown in the approval UI
 * @param {object} toolInput    - The payload summary shown in the approval UI
 * @param {Function} writeFn    - Async function called if approved; should return a result object
 */
async function runWithApproval(res, toolName, toolInput, writeFn) {
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

  // Safety timeout
  const timeout = setTimeout(() => {
    sendEvent('error', { error: 'Approval timed out after 60 seconds' });
    sendEvent('done', { message: 'Operation cancelled (timeout)' });
    res.end();
  }, SSE_TIMEOUT_MS);

  try {
    // Create approval record — this holds the promise that resolves when Dan acts
    const { id: approvalId, promise } = approval.createApproval(toolName, toolInput, null);

    // Emit the approval event — frontend picks this up and shows the approval UI
    sendEvent('approval', {
      approvalId,
      toolName,
      toolInput,
      message: `Approve ${toolName}?`,
    });

    // Wait for Dan's decision
    const approved = await promise;

    if (!approved) {
      clearTimeout(timeout);
      sendEvent('text', { text: `${toolName} rejected.` });
      sendEvent('done', { message: 'Operation cancelled' });
      res.end();
      return;
    }

    // Execute the write
    const result = await writeFn();

    clearTimeout(timeout);
    sendEvent('text', { text: `${toolName} completed.` });
    sendEvent('done', { message: 'Operation complete', result });
    res.end();
  } catch (err) {
    clearTimeout(timeout);
    console.error(`[dan-colin] ${toolName} error:`, err);
    sendEvent('error', { error: err.message || 'Write failed' });
    sendEvent('done', { message: 'Operation failed' });
    res.end();
  }
}

// ────────────────────────────────────────────────────────────────────
// GET /api/dan-colin
// Returns the full queue grouped by section
// ────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const queue = await danColinService.getQueue();
    res.json(queue);
  } catch (err) {
    console.error('[dan-colin] getQueue error:', err);
    res.status(500).json({ error: 'Failed to load Dan ↔ Colin queue' });
  }
});

// ────────────────────────────────────────────────────────────────────
// POST /api/dan-colin/:id/answer
// Body: { answer: string }
// Approval-gated SSE — emits approval event, waits, then writes
// ────────────────────────────────────────────────────────────────────
router.post('/:id/answer', async (req, res) => {
  const { id } = req.params;
  const { answer } = req.body;

  if (!isValidNotionId(id)) {
    return res.status(400).json({ error: 'Invalid page ID format' });
  }

  if (answer === undefined || answer === null) {
    return res.status(400).json({ error: 'answer is required' });
  }

  if (typeof answer !== 'string') {
    return res.status(400).json({ error: 'answer must be a string' });
  }

  await runWithApproval(
    res,
    'submit-answer',
    { pageId: id, answer: answer.slice(0, 200) + (answer.length > 200 ? '…' : '') },
    () => danColinService.submitAnswer(id, answer)
  );
});

// ────────────────────────────────────────────────────────────────────
// POST /api/dan-colin/drop
// Body: { body: string }
// Approval-gated SSE — creates a new 📥 Drop row
// ────────────────────────────────────────────────────────────────────
router.post('/drop', async (req, res) => {
  const { body } = req.body;

  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return res.status(400).json({ error: 'body is required and must be a non-empty string' });
  }

  await runWithApproval(
    res,
    'create-drop',
    { body: body.trim().slice(0, 200) + (body.length > 200 ? '…' : '') },
    () => danColinService.createDrop(body.trim())
  );
});

module.exports = router;
