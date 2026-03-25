'use strict';

const express = require('express');
const router = express.Router();
const ciService = require('../services/competitor-intel-service');

/**
 * GET /api/competitor-intel
 * Overview: competitor list, tier/category breakdown, recent notes, watchlist, capability summary
 */
router.get('/', async (req, res) => {
  try {
    res.json(await ciService.getOverview());
  } catch (err) {
    console.error('[competitor-intel] overview error:', err.message);
    res.status(500).json({ error: 'Failed to load competitor intel overview' });
  }
});

/**
 * GET /api/competitor-intel/competitor/:brand
 * Full merged profile for a single competitor across all 12 sheets
 */
router.get('/competitor/:brand', async (req, res) => {
  try {
    res.json(await ciService.getCompetitor(req.params.brand));
  } catch (err) {
    console.error('[competitor-intel] competitor error:', err.message);
    res.status(500).json({ error: 'Failed to load competitor profile' });
  }
});

/**
 * GET /api/competitor-intel/capabilities
 * All capability rows for radar/comparison view
 */
router.get('/capabilities', async (req, res) => {
  try {
    res.json(await ciService.getCapabilities());
  } catch (err) {
    console.error('[competitor-intel] capabilities error:', err.message);
    res.status(500).json({ error: 'Failed to load capabilities data' });
  }
});

/**
 * GET /api/competitor-intel/swot
 * All SWOT rows
 */
router.get('/swot', async (req, res) => {
  try {
    res.json(await ciService.getSWOT());
  } catch (err) {
    console.error('[competitor-intel] swot error:', err.message);
    res.status(500).json({ error: 'Failed to load SWOT data' });
  }
});

/**
 * GET /api/competitor-intel/watchlist
 * Watchlist rows with optional filters
 * Query: type (Change_Type), days (recent N days)
 */
router.get('/watchlist', async (req, res) => {
  try {
    res.json(await ciService.getWatchlist({
      type: req.query.type,
      days: req.query.days,
    }));
  } catch (err) {
    console.error('[competitor-intel] watchlist error:', err.message);
    res.status(500).json({ error: 'Failed to load watchlist data' });
  }
});

/**
 * GET /api/competitor-intel/steal-adapt
 * Steal/adapt/avoid rows grouped by Action
 */
router.get('/steal-adapt', async (req, res) => {
  try {
    res.json(await ciService.getStealAdaptAvoid());
  } catch (err) {
    console.error('[competitor-intel] steal-adapt error:', err.message);
    res.status(500).json({ error: 'Failed to load steal-adapt-avoid data' });
  }
});

module.exports = router;
