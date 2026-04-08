'use strict';

const express = require('express');
const router = express.Router();
const opsService = require('../services/ops-service');
const opsReadModel = require('../read-model/ops');

/**
 * GET /api/ops
 * Aggregated ops overview — stock health, alerts, pending POs, vendors, products
 */
router.get('/', async (req, res) => {
  try {
    res.json(await opsReadModel.build());
  } catch (err) {
    console.error('[ops] overview error:', err.message);
    res.status(500).json({ error: 'Failed to load ops overview' });
  }
});

/**
 * GET /api/ops/stock
 * Inventory rows with optional filters
 * Query: status, product, vendor, search, tier
 */
router.get('/stock', async (req, res) => {
  try {
    res.json(await opsService.getStockHealth({
      status: req.query.status,
      product: req.query.product,
      vendor: req.query.vendor,
      search: req.query.search,
      tier: req.query.tier,
      page: req.query.page,
      limit: req.query.limit,
    }));
  } catch (err) {
    console.error('[ops] stock error:', err.message);
    res.status(500).json({ error: 'Failed to load stock data' });
  }
});

/**
 * GET /api/ops/sales
 * Aggregated sales overview — totals, by channel, by status, trends, top products
 */
router.get('/sales', async (req, res) => {
  try {
    res.json(await opsService.getSalesOverview());
  } catch (err) {
    console.error('[ops] sales error:', err.message);
    res.status(500).json({ error: 'Failed to load sales data' });
  }
});

/**
 * GET /api/ops/products
 * Product types with optional filters
 * Query: status, vendor, tier, search
 */
router.get('/products', async (req, res) => {
  try {
    res.json(await opsService.getProducts({
      status: req.query.status,
      vendor: req.query.vendor,
      tier: req.query.tier,
      search: req.query.search,
    }));
  } catch (err) {
    console.error('[ops] products error:', err.message);
    res.status(500).json({ error: 'Failed to load products data' });
  }
});

/**
 * GET /api/ops/purchase-orders
 * All purchase orders with computed urgency
 */
router.get('/purchase-orders', async (req, res) => {
  try {
    res.json(await opsService.getPurchaseOrders());
  } catch (err) {
    console.error('[ops] purchase-orders error:', err.message);
    res.status(500).json({ error: 'Failed to load purchase orders' });
  }
});

module.exports = router;
