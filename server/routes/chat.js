const express = require('express');
const router = express.Router();
const agent = require('../services/agent');
const approval = require('../services/approval');

const VALID_SKILLS = new Set(['brief', 'decide', 'dump', 'health', 'review', 'route']);
const MAX_MESSAGE_LENGTH = 5000;
const SSE_TIMEOUT_MS = 2 * 60 * 1000; // 2-minute outer timeout for entire SSE response

/**
 * POST /api/chat
 * Send a message to Colin and stream the response via SSE.
 *
 * Body: { message: string, skill?: string }
 * Response: Server-Sent Events stream
 */
router.post('/', (req, res) => {
  const { message, skill } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` });
  }

  if (skill && !VALID_SKILLS.has(skill)) {
    return res.status(400).json({ error: `Unknown skill: ${skill}. Valid: ${[...VALID_SKILLS].join(', ')}` });
  }

  // Set up SSE
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

  // SSE timeout — safety net if agent hangs
  const timeout = setTimeout(() => {
    sendEvent('error', { error: 'Response timed out after 2 minutes' });
    sendEvent('done', { message: 'Response complete (timeout)' });
    res.end();
  }, SSE_TIMEOUT_MS);

  // Stream the response
  agent
    .chat(
      message,
      skill || null,
      (text) => sendEvent('text', { text }),
      (approvalData) => sendEvent('approval', approvalData),
      (toolData) => sendEvent('tool_use', toolData)
    )
    .then(() => {
      clearTimeout(timeout);
      sendEvent('done', { message: 'Response complete' });
      res.end();
    })
    .catch((err) => {
      clearTimeout(timeout);
      console.error('Chat error:', err);
      sendEvent('error', { error: err.message });
      sendEvent('done', { message: 'Response complete (error)' });
      res.end();
    });

  // Clear timeout on client disconnect
  req.on('close', () => {
    clearTimeout(timeout);
  });
});

/**
 * POST /api/chat/approve
 * Approve or reject a pending write operation.
 *
 * Body: { approvalId: string, approved: boolean }
 */
router.post('/approve', (req, res) => {
  const { approvalId, approved } = req.body;

  if (!approvalId) {
    return res.status(400).json({ error: 'approvalId is required' });
  }

  const resolved = approval.resolveApproval(approvalId, approved === true);
  if (resolved) {
    res.json({ status: 'ok', approved: approved === true });
  } else {
    res.status(404).json({ error: 'Approval not found or already resolved' });
  }
});

/**
 * POST /api/chat/clear
 * Clear conversation history and start fresh.
 */
router.post('/clear', (req, res) => {
  agent.clearHistory();
  res.json({ status: 'ok', message: 'Conversation cleared' });
});

/**
 * GET /api/chat/pending
 * Get any pending approvals.
 */
router.get('/pending', (req, res) => {
  res.json({ approvals: approval.getPendingApprovals() });
});

module.exports = router;
