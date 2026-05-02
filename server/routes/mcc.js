'use strict';
/**
 * MCC Routes - Marketing Content Center API
 * 
 * Mount point: /api/mcc
 * 
 * GET  /posts              → listPosts (read-model)
 * GET  /posts/:id          → getPost (single)
 * POST /posts              → createDraft (approval-gated)
 * PATCH /posts/:id         → updateDraft (approval-gated)
 * POST /posts/:id/schedule → schedulePost (approval-gated)
 * POST /posts/:id/publish-now → publishNow (approval-gated)
 * POST /scheduler/tick     → runSchedulerTick (manual trigger)
 * GET  /oauth/:platform/start → startOAuth
 * GET  /oauth/:platform/callback → handleOAuthCallback
 * GET  /status             → getStatusCounts
 * GET  /platforms          → listPlatforms
 */

const express = require('express');
const router = express.Router();
const mcc = require('../services/mcc');
const social = require('../services/social');
const approval = require('../services/approval');

const SSE_TIMEOUT_MS = 60 * 1000;

// ────────────────────────────────────────────────────────────────────
// Helper: SSE approval-gated handler
// ────────────────────────────────────────────────────────────────────

/**
 * Run an operation with SSE approval gate
 * @param {object} res - Express response
 * @param {string} operationName - Human-readable operation name
 * @param {object} operationInput - Summary shown in approval UI
 * @param {Function} operationFn - Async function to execute if approved
 */
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

  // Safety timeout
  const timeout = setTimeout(() => {
    sendEvent('error', { error: 'Approval timed out after 60 seconds' });
    sendEvent('done', { message: 'Operation cancelled (timeout)' });
    res.end();
  }, SSE_TIMEOUT_MS);

  try {
    // Create approval record
    const { id: approvalId, promise } = approval.createApproval(operationName, operationInput, null);

    // Emit approval event
    sendEvent('approval', {
      approvalId,
      toolName: operationName,
      toolInput: operationInput,
      message: `Approve ${operationName}?`,
    });

    // Wait for Dan's decision
    const approved = await promise;

    if (!approved) {
      clearTimeout(timeout);
      sendEvent('text', { text: `${operationName} rejected.` });
      sendEvent('done', { message: 'Operation cancelled' });
      res.end();
      return;
    }

    // Execute the operation
    const result = await operationFn();

    clearTimeout(timeout);
    sendEvent('text', { text: `${operationName} completed.` });
    sendEvent('done', { message: 'Operation complete', result });
    res.end();
  } catch (err) {
    clearTimeout(timeout);
    console.error(`[mcc] ${operationName} error:`, err);
    sendEvent('error', { error: err.message || 'Operation failed' });
    sendEvent('done', { message: 'Operation failed' });
    res.end();
  }
}

// ────────────────────────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────────────────────────

// GET /api/mcc/posts - List posts (with optional filters)
router.get('/posts', async (req, res) => {
  try {
    const { status, brand, platform, limit } = req.query;
    const posts = await mcc.listPosts({ status, brand, platform, limit: parseInt(limit) || 50 });
    res.json(posts);
  } catch (err) {
    console.error('[mcc] listPosts error:', err);
    res.status(500).json({ error: 'Failed to list posts' });
  }
});

// GET /api/mcc/posts/:id - Get single post
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await mcc.getPost(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(post);
  } catch (err) {
    console.error('[mcc] getPost error:', err);
    res.status(500).json({ error: 'Failed to get post' });
  }
});

// POST /api/mcc/posts - Create draft (approval-gated)
router.post('/posts', async (req, res) => {
  const { title, body, platforms, brand, mediaUrls } = req.body;

  if (!title && !body) {
    return res.status(400).json({ error: 'Title or body is required' });
  }

  if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
    return res.status(400).json({ error: 'At least one platform is required' });
  }

  const validPlatforms = ['instagram', 'linkedin'];
  for (const p of platforms) {
    if (!validPlatforms.includes(p)) {
      return res.status(400).json({ error: `Invalid platform: ${p}` });
    }
  }

  await runWithApproval(
    res,
    'create-post',
    { title: title || 'Untitled', platforms: platforms.join(', '), bodyPreview: (body || '').slice(0, 100) },
    () => mcc.createDraft({ title, body, platforms, brand, mediaUrls })
  );
});

// PATCH /api/mcc/posts/:id - Update draft (approval-gated)
router.patch('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { title, body, platforms, brand, mediaUrls } = req.body;

  // Validate platforms if provided
  if (platforms) {
    const validPlatforms = ['instagram', 'linkedin'];
    for (const p of platforms) {
      if (!validPlatforms.includes(p)) {
        return res.status(400).json({ error: `Invalid platform: ${p}` });
      }
    }
  }

  await runWithApproval(
    res,
    'update-post',
    { postId: id, updates: Object.keys(req.body).join(', ') },
    () => mcc.updateDraft(id, { title, body, platforms, brand, mediaUrls })
  );
});

// POST /api/mcc/posts/:id/schedule - Schedule post (approval-gated)
router.post('/posts/:id/schedule', async (req, res) => {
  const { id } = req.params;
  const { scheduledFor } = req.body;

  if (!scheduledFor) {
    return res.status(400).json({ error: 'scheduledFor date is required' }
    );
  }

  const scheduleDate = new Date(scheduledFor);
  if (isNaN(scheduleDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  if (scheduleDate <= new Date()) {
    return res.status(400).json({ error: 'Scheduled time must be in the future' });
  }

  await runWithApproval(
    res,
    'schedule-post',
    { postId: id, scheduledFor },
    () => mcc.schedulePost(id, scheduledFor)
  );
});

// POST /api/mcc/posts/:id/publish-now - Manual publish (approval-gated)
router.post('/posts/:id/publish-now', async (req, res) => {
  const { id } = req.params;

  await runWithApproval(
    res,
    'publish-post',
    { postId: id },
    async () => {
      // First request approval (sets to awaiting-approval)
      const approvalResult = await mcc.publishNow(id);
      
      // Return the post info for the approval UI
      return approvalResult;
    }
  );
});

// POST /api/mcc/scheduler/tick - Manual scheduler trigger
router.post('/scheduler/tick', async (req, res) => {
  try {
    const result = await mcc.runSchedulerTick();
    res.json(result);
  } catch (err) {
    console.error('[mcc] scheduler tick error:', err);
    res.status(500).json({ error: 'Scheduler tick failed' });
  }
});

// GET /api/mcc/status - Get status counts
router.get('/status', async (req, res) => {
  try {
    const counts = await mcc.getStatusCounts();
    res.json(counts);
  } catch (err) {
    console.error('[mcc] getStatusCounts error:', err);
    res.status(500).json({ error: 'Failed to get status counts' });
  }
});

// GET /api/mcc/platforms - List available platforms
router.get('/platforms', (req, res) => {
  const platforms = social.listPlatforms();
  res.json(platforms);
});

// GET /api/mcc/oauth/:platform/start - Start OAuth flow
router.get('/oauth/:platform/start', async (req, res) => {
  const { platform } = req.params;
  
  const validPlatforms = ['instagram', 'linkedin'];
  if (!validPlatforms.includes(platform)) {
    return res.status(400).json({ error: 'Invalid platform' });
  }

  // Determine callback URL based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = isProduction 
    ? 'https://yds-command-centre.vercel.app'
    : 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/mcc/oauth/${platform}/callback`;

  const provider = social.getProvider(platform);
  const { authUrl, state } = provider.login(redirectUri);

  // Store state for verification (in production, use session/DB)
  // For now, just return the URL - Dan will complete OAuth in browser
  res.json({ authUrl, state, redirectUri });
});

// GET /api/mcc/oauth/:platform/callback - OAuth callback
router.get('/oauth/:platform/callback', async (req, res) => {
  const { platform } = req.params;
  const { code, state: _state, error } = req.query;

  if (error) {
    console.error('[mcc] OAuth error:', error);
    return res.redirect(`/mcc?oauth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect('/mcc?oauth_error=missing_code');
  }

  const validPlatforms = ['instagram', 'linkedin'];
  if (!validPlatforms.includes(platform)) {
    return res.redirect('/mcc?oauth_error=invalid_platform');
  }

  try {
    const provider = social.getProvider(platform);
    
    // Determine callback URL (same as start)
    const isProduction = process.env.NODE_ENV === 'production';
    const baseUrl = isProduction 
      ? 'https://yds-command-centre.vercel.app'
      : 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/mcc/oauth/${platform}/callback`;
    
    // Exchange code for token
    const tokenResult = await provider.exchangeCodeForToken(code, redirectUri);
    
    // Store token (in production, encrypt with SOCIAL_TOKEN_KEY)
    await mcc.storeToken(platform, tokenResult);
    
    // Redirect to MCC with success
    res.redirect('/mcc?oauth_success=' + platform);
  } catch (err) {
    console.error('[mcc] OAuth callback error:', err);
    res.redirect('/mcc?oauth_error=' + encodeURIComponent(err.message));
  }
});

module.exports = router;