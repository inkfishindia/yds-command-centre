'use strict';

const express = require('express');

const router = express.Router();
const ceoDashboardService = require('../services/ceo-dashboard-service');

router.get('/', async (req, res) => {
  try {
    res.json(await ceoDashboardService.getCeoDashboardPayload());
  } catch (err) {
    console.error('CEO dashboard error:', err);
    res.status(500).json({ error: 'Failed to load CEO dashboard' });
  }
});

module.exports = router;
