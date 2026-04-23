'use strict';

const express = require('express');
const router = express.Router();
const { getActivityFeed } = require('../services/activity-feed-service');

/**
 * GET /api/activity-feed?days=14
 *
 * Unified activity stream merging:
 *   - Recent decisions (from Notion Decisions DB)
 *   - Recently-edited commitments (from Notion Commitments DB)
 *   - Resolved Dan ↔ Colin queue items
 *
 * Query params:
 *   days  — look-back window, 1–90 (default 14)
 */
router.get('/', async (req, res) => {
  try {
    const parsed = parseInt(req.query.days, 10);
    const days = Math.min(Math.max(Number.isNaN(parsed) ? 14 : parsed, 1), 90);
    const feed = await getActivityFeed({ days });
    res.json(feed);
  } catch (err) {
    console.error('[activity-feed] route error:', err);
    res.status(500).json({ error: err.message || 'Failed to load activity feed' });
  }
});

module.exports = router;
