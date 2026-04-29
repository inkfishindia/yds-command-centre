// D2C Product Catalog API Routes
// Endpoints for storefront PDP data

const express = require('express');
const router = express.Router();
const d2cService = require('../services/d2c-service');

// D2C sheet is a standalone workbook not in SHEET_REGISTRY — link is static.
const D2C_SHEET_META = {
  url: 'https://docs.google.com/spreadsheets/d/1Bs7lV2U3_zHmvZ2j7SWeuEXLh-KaXyKJ/edit',
  sheetName: 'Products',
  label: 'D2C Product Database',
  spreadsheetTitle: 'D2C - PDP final database',
};

/**
 * GET /api/d2c/products
 * List products with optional filters
 * Query: category, method, is_live, search, limit
 */
router.get('/products', async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      method: req.query.method,
      is_live: req.query.is_live === 'true',
      search: req.query.search,
    };
    
    let products = await d2cService.getProducts(filters);
    
    // Apply limit
    if (req.query.limit) {
      products = products.slice(0, parseInt(req.query.limit, 10));
    }
    
    res.json({
      total: products.length,
      products,
      meta: { sheet: D2C_SHEET_META },
    });
  } catch (err) {
    console.error('[d2c] products error:', err.message);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

/**
 * GET /api/d2c/products/:identifier
 * Single product by slug or id
 */
router.get('/products/:identifier', async (req, res) => {
  try {
    const product = await d2cService.getProduct(req.params.identifier);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error('[d2c] product error:', err.message);
    res.status(500).json({ error: 'Failed to load product' });
  }
});

/**
 * GET /api/d2c/categories
 * All product categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await d2cService.getCategories();
    res.json({ total: categories.length, categories });
  } catch (err) {
    console.error('[d2c] categories error:', err.message);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

/**
 * GET /api/d2c/methods
 * All print methods
 */
router.get('/methods', async (req, res) => {
  try {
    const methods = await d2cService.getMethods();
    res.json({ total: methods.length, methods });
  } catch (err) {
    console.error('[d2c] methods error:', err.message);
    res.status(500).json({ error: 'Failed to load methods' });
  }
});

/**
 * GET /api/d2c/methods/:slug
 * Single method with products
 */
router.get('/methods/:slug', async (req, res) => {
  try {
    const method = await d2cService.getMethod(req.params.slug);
    if (!method) {
      return res.status(404).json({ error: 'Method not found' });
    }
    res.json(method);
  } catch (err) {
    console.error('[d2c] method error:', err.message);
    res.status(500).json({ error: 'Failed to load method' });
  }
});

/**
 * GET /api/d2c/variants/:productSlug
 * Variants for a product
 */
router.get('/variants/:productSlug', async (req, res) => {
  try {
    const variants = await d2cService.getVariants(req.params.productSlug);
    res.json({ total: variants.length, variants });
  } catch (err) {
    console.error('[d2c] variants error:', err.message);
    res.status(500).json({ error: 'Failed to load variants' });
  }
});

/**
 * GET /api/d2c/search
 * Search products
 * Query: q (search query)
 */
router.get('/search', async (req, res) => {
  try {
    if (!req.query.q) {
      return res.status(400).json({ error: 'Missing search query' });
    }
    const products = await d2cService.searchProducts(req.query.q);
    res.json({ total: products.length, products });
  } catch (err) {
    console.error('[d2c] search error:', err.message);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

/**
 * GET /api/d2c/health
 * Check if D2C service is responding
 */
router.get('/health', async (req, res) => {
  try {
    const products = await d2cService.getProducts({ limit: 1 });
    res.json({ status: 'ok', products_loaded: products.length > 0 });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

module.exports = router;