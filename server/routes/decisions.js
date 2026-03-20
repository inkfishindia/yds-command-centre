// Direct user-initiated writes — approval gate not required because the user action IS the approval.
// The approval gate in server/services/approval.js is for agent-initiated (Claude) writes only.
const express = require('express');
const router = express.Router();
const notionService = require('../services/notion');

router.post('/', async (req, res) => {
  try {
    const { name, decision, rationale, context, focusAreaId, owner } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!decision || typeof decision !== 'string' || decision.trim().length === 0) {
      return res.status(400).json({ error: 'Decision text is required' });
    }

    const result = await notionService.createDecision({
      name: name.trim(),
      decision: decision.trim(),
      rationale: rationale ? rationale.trim() : '',
      context: context ? context.trim() : null,
      focusAreaId: focusAreaId || null,
      owner: owner || 'Dan',
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Create decision error:', err);
    res.status(500).json({ error: 'Failed to create decision' });
  }
});

module.exports = router;
