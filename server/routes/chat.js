const express = require('express');
const router = express.Router();
const agent = require('../services/agent');
const approval = require('../services/approval');

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

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (type, data) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Stream the response
  agent
    .chat(
      message,
      skill || null,
      // onText — streaming text chunks
      (text) => {
        sendEvent('text', { text });
      },
      // onApproval — write tool needs approval
      (approvalData) => {
        sendEvent('approval', approvalData);
      },
      // onToolUse — tool is being called
      (toolData) => {
        sendEvent('tool_use', toolData);
      }
    )
    .then((fullResponse) => {
      sendEvent('done', { message: 'Response complete' });
      res.end();
    })
    .catch((err) => {
      console.error('Chat error:', err);
      sendEvent('error', { error: err.message });
      res.end();
    });

  // Clean up on client disconnect
  req.on('close', () => {
    // Client disconnected — the agent will finish its current turn
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
