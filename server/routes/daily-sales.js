'use strict';

/**
 * Daily Sales routes
 * Mount point: /api/daily-sales
 *
 * GET /               — Composed CEO daily-sales dashboard payload.
 *                       Query params: from, to, channels, orderType, paymentMode, status, state, printMethod
 *
 * GET /orders         — Paginated drilldown into raw Order[].
 *                       Query params: same filter params + limit (default 100, max 500) + offset (default 0)
 *
 * Both are read-only. No approval gate needed.
 */

const express = require('express');
const router = express.Router();
const dailySalesService = require('../services/daily-sales-service');
const { parseFilterSpec, validateFilterSpec } = require('../services/daily-sales/filters');

// GET /api/daily-sales
router.get('/', async (req, res) => {
  try {
    // Build filterSpec from query params. If none supplied, defaults apply (status: 'realized').
    const filterSpec = parseFilterSpec(req.query);
    const errors = validateFilterSpec(filterSpec);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const payload = await dailySalesService.getDashboard({ filterSpec });
    res.json(payload);
  } catch (err) {
    console.error('[daily-sales] getDashboard error:', err);
    res.status(500).json({ error: 'Failed to load daily sales dashboard' });
  }
});

// GET /api/daily-sales/orders
router.get('/orders', async (req, res) => {
  try {
    const filterSpec = parseFilterSpec(req.query);
    const errors = validateFilterSpec(filterSpec);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const limit  = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 100), 500);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const result = await dailySalesService.getFilteredOrders({ filterSpec, limit, offset });
    res.json(result);
  } catch (err) {
    console.error('[daily-sales] getFilteredOrders error:', err);
    res.status(500).json({ error: 'Failed to load orders drilldown' });
  }
});

module.exports = router;
