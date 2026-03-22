const express = require('express');
const router = express.Router();
const notionService = require('../services/notion');

// GET /api/ai-team — full AI team roster with resolved relations
router.get('/', async (req, res) => {
  try {
    const members = await notionService.getAITeam();
    res.json({ members });
  } catch (err) {
    console.error('AI team error:', err);
    res.status(500).json({ error: 'Failed to load AI team data' });
  }
});

module.exports = router;
