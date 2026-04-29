const express = require('express');
const router = express.Router();
const googleAdsService = require('../services/google-ads-service');

// GET /api/google-ads — full dashboard payload
router.get('/', async (req, res) => {
  try {
    const data = await googleAdsService.getDashboard();
    res.json(data);
  } catch (err) {
    console.error('[google-ads] dashboard error:', err);
    res.status(500).json({ error: 'Failed to load Google Ads dashboard' });
  }
});

module.exports = router;