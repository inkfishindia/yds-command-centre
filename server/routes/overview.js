'use strict';

const express = require('express');

const router = express.Router();
const overviewReadModel = require('../read-model/overview');

router.get('/', async (req, res) => {
  try {
    res.json(await overviewReadModel.build());
  } catch (err) {
    console.error('Overview error:', err);
    res.status(500).json({ error: 'Failed to load overview' });
  }
});

module.exports = router;
