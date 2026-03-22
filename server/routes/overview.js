'use strict';

const express = require('express');

const router = express.Router();
const overviewService = require('../services/overview-service');

router.get('/', async (req, res) => {
  try {
    res.json(await overviewService.getOverviewPayload());
  } catch (err) {
    console.error('Overview error:', err);
    res.status(500).json({ error: 'Failed to load overview' });
  }
});

module.exports = router;
