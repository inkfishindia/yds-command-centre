const express = require('express');
const router = express.Router();
const googleAdsService = require('../services/google-ads-service');

// GET /api/google-ads — full dashboard payload
// Query params: ?period=7d|14d|30d|all (default: all)
router.get('/', async (req, res) => {
  try {
    const period = req.query.period || 'all';
    const data = await googleAdsService.getDashboard(period);
    res.json(data);
  } catch (err) {
    console.error('[google-ads] dashboard error:', err);
    res.status(500).json({ error: 'Failed to load Google Ads dashboard' });
  }
});

module.exports = router;