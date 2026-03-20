const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheets');
const hydrationService = require('../services/hydration');

/**
 * GET /api/sheets/pipeline
 * Returns CRM pipeline data from Google Sheets (b2b and drop-ship stages,
 * totals, SLA breaches).
 * Returns { available: false } when Google Sheets is not configured — the UI
 * must handle this gracefully and not show an error to Dan.
 */
router.get('/pipeline', async (req, res) => {
  try {
    const data = await sheetsService.getPipelineData();
    res.json(data);
  } catch (err) {
    console.error('Pipeline error:', err);
    res.status(500).json({ error: 'Failed to load pipeline data' });
  }
});

// ── Registry-based CRUD routes ────────────────────────────────────────────────

const VALID_SHEET_KEYS = new Set(Object.keys(sheetsService.SHEET_REGISTRY));

/**
 * GET /api/sheets/:sheetKey
 * Fetch all rows from a registered sheet.
 * Add ?hydrate=true to resolve FK references via the hydration service.
 * Returns { available: false } when the spreadsheet is not configured.
 */
router.get('/:sheetKey', async (req, res) => {
  const { sheetKey } = req.params;
  if (!VALID_SHEET_KEYS.has(sheetKey)) {
    return res.status(400).json({
      error: `Invalid sheet key: ${sheetKey}. Valid keys: ${[...VALID_SHEET_KEYS].join(', ')}`,
    });
  }
  try {
    let data;
    if (req.query.hydrate === 'true') {
      data = await hydrationService.hydrateSheetData(sheetKey);
    } else {
      data = await sheetsService.fetchSheet(sheetKey);
    }
    res.json(data);
  } catch (err) {
    console.error(`Sheet fetch error (${sheetKey}):`, err.message);
    res.status(500).json({ error: `Failed to fetch sheet: ${sheetKey}` });
  }
});

/**
 * POST /api/sheets/:sheetKey
 * Append a row to a registered sheet.
 * Body: JSON object with column names as keys.
 */
router.post('/:sheetKey', async (req, res) => {
  const { sheetKey } = req.params;
  if (!VALID_SHEET_KEYS.has(sheetKey)) {
    return res.status(400).json({ error: `Invalid sheet key: ${sheetKey}` });
  }
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object with column values' });
  }
  try {
    const result = await sheetsService.appendRow(sheetKey, req.body);
    res.status(201).json(result);
  } catch (err) {
    console.error(`Sheet append error (${sheetKey}):`, err.message);
    res.status(500).json({ error: `Failed to append row to ${sheetKey}` });
  }
});

/**
 * PATCH /api/sheets/:sheetKey/:rowIdx
 * Update a specific row (rowIdx is 1-based, >= 2 since row 1 is header).
 * Body: JSON object with column names as keys.
 */
router.patch('/:sheetKey/:rowIdx', async (req, res) => {
  const { sheetKey, rowIdx } = req.params;
  const rowIndex = parseInt(rowIdx, 10);
  if (!VALID_SHEET_KEYS.has(sheetKey)) {
    return res.status(400).json({ error: `Invalid sheet key: ${sheetKey}` });
  }
  if (isNaN(rowIndex) || rowIndex < 2) {
    return res.status(400).json({ error: 'rowIdx must be an integer >= 2 (row 1 is the header)' });
  }
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object with column values' });
  }
  try {
    const result = await sheetsService.updateRow(sheetKey, rowIndex, req.body);
    res.json(result);
  } catch (err) {
    console.error(`Sheet update error (${sheetKey}):`, err.message);
    res.status(500).json({ error: `Failed to update row in ${sheetKey}` });
  }
});

/**
 * DELETE /api/sheets/:sheetKey/:rowIdx
 * Delete a specific row (rowIdx is 1-based, >= 2).
 */
router.delete('/:sheetKey/:rowIdx', async (req, res) => {
  const { sheetKey, rowIdx } = req.params;
  const rowIndex = parseInt(rowIdx, 10);
  if (!VALID_SHEET_KEYS.has(sheetKey)) {
    return res.status(400).json({ error: `Invalid sheet key: ${sheetKey}` });
  }
  if (isNaN(rowIndex) || rowIndex < 2) {
    return res.status(400).json({ error: 'rowIdx must be an integer >= 2' });
  }
  try {
    const result = await sheetsService.deleteRow(sheetKey, rowIndex);
    res.json(result);
  } catch (err) {
    console.error(`Sheet delete error (${sheetKey}):`, err.message);
    res.status(500).json({ error: `Failed to delete row from ${sheetKey}` });
  }
});

module.exports = router;
