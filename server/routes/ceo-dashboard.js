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

router.post('/forge', async (req, res) => {
  try {
    const { toolId, title, topic, notes } = req.body || {};
    if (!toolId) {
      return res.status(400).json({ error: 'toolId is required' });
    }

    const result = await ceoDashboardService.createForgeDraft({ toolId, title, topic, notes });
    return res.status(201).json(result);
  } catch (err) {
    console.error('CEO forge error:', err);
    return res.status(500).json({ error: 'Failed to create CEO draft' });
  }
});

module.exports = router;
