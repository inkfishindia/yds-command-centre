'use strict';

const express = require('express');
const router = express.Router();
const opsService = require('../services/ops-service');
const opsReadModel = require('../read-model/ops');
const sheetsService = require('../services/sheets');

/**
 * GET /api/ops
 * Aggregated ops overview — stock health, alerts, pending POs, vendors, products
 */
router.get('/', async (req, res) => {
  try {
    const OPS_SHEET_KEYS = [
      { spreadsheetKey: 'OPS_INVENTORY', sampleSheetKey: 'OPS_PRODUCT_TYPES', label: 'Inventory' },
      { spreadsheetKey: 'OPS_SALES',     sampleSheetKey: 'OPS_SALES_ORDERS',  label: 'Sales' },
      { spreadsheetKey: 'OPS_PRODUCTS',  sampleSheetKey: 'OPS_PRODUCT_VARIANTS', label: 'Products' },
      { spreadsheetKey: 'OPS_WAREHOUSE', sampleSheetKey: 'OPS_WAREHOUSE_ZONES',  label: 'Warehouse' },
    ];

    const [data, ...linkResults] = await Promise.all([
      opsReadModel.build(),
      ...OPS_SHEET_KEYS.map(k => sheetsService.getSheetLink(k.sampleSheetKey).catch(() => null)),
    ]);

    const sheetLinks = [];
    OPS_SHEET_KEYS.forEach(({ spreadsheetKey, label }, i) => {
      const link = linkResults[i];
      const spreadsheetId = sheetsService.getSpreadsheetId(spreadsheetKey);
      if (link && spreadsheetId) {
        sheetLinks.push({
          key: spreadsheetKey,
          label,
          url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
          sheetName: label,
          spreadsheetTitle: link.spreadsheetTitle,
        });
      }
    });

    if (sheetLinks.length > 0) {
      data.meta = Object.assign({}, data.meta || {}, { sheetLinks });
    }
    res.json(data);
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
