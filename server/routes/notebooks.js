const express = require('express');
const router = express.Router();
const { parseRegistry, clearCache } = require('../services/notebooks');

// GET /api/notebooks — full parsed registry
router.get('/', (req, res) => {
  try {
    const data = parseRegistry();
    res.json(data);
  } catch (err) {
    console.error('Notebook registry error:', err);
    res.status(500).json({ error: 'Failed to parse notebook registry' });
  }
});

// POST /api/notebooks/cache/clear
router.post('/cache/clear', (req, res) => {
  clearCache();
  res.json({ ok: true });
});

module.exports = router;
