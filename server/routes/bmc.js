'use strict';

const express = require('express');
const router = express.Router();
const hydrationService = require('../services/hydration');
const sheetsService = require('../services/sheets');

const BMC_SECTIONS = {
  segments: 'BMC_SEGMENTS',
  business_units: 'BMC_BUSINESS_UNITS',
  flywheels: 'BMC_FLYWHEELS',
  revenue_streams: 'BMC_REVENUE_STREAMS',
  cost_structure: 'BMC_COST_STRUCTURE',
  channels: 'BMC_CHANNELS',
  platforms: 'BMC_PLATFORMS',
  team: 'BMC_TEAM',
  hubs: 'BMC_HUBS',
  partners: 'BMC_PARTNERS',
  metrics: 'BMC_METRICS',
};

/**
 * GET /api/bmc
 * Returns all 11 BMC sections, hydrated with FK resolution.
 * Maps to the classic Business Model Canvas 9-block layout.
 */
router.get('/', async (req, res) => {
  try {
    // Check if BMC spreadsheet is configured
    if (!sheetsService.isSpreadsheetConfigured('BMC')) {
      return res.json({ available: false });
    }

    // Fetch all 11 sections in parallel, hydrated
    const sectionKeys = Object.keys(BMC_SECTIONS);
    const results = await Promise.all(
      sectionKeys.map(key =>
        hydrationService.hydrateSheetData(BMC_SECTIONS[key])
          .catch(err => {
            console.error(`BMC section ${key} error:`, err.message);
            return { available: false, rows: [] };
          })
      )
    );

    const canvas = {};
    sectionKeys.forEach((key, i) => {
      const result = results[i];
      canvas[key] = result.available !== false ? (result.rows || []) : [];
    });

    // Compute summary stats
    const stats = {
      totalSegments: canvas.segments.length,
      totalBusinessUnits: canvas.business_units.length,
      totalFlywheels: canvas.flywheels.length,
      totalRevenueStreams: canvas.revenue_streams.length,
      totalPartners: canvas.partners.length,
      totalTeamMembers: canvas.team.length,
      totalMetrics: canvas.metrics.length,
    };

    let meta = {};
    try {
      const sheetLink = await sheetsService.getSheetLink('BMC_SEGMENTS');
      if (sheetLink) {
        const spreadsheetId = sheetsService.getSpreadsheetId('BMC');
        meta.sheet = {
          url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
          sheetName: 'Business Model Canvas',
          label: 'Business Model Canvas',
          spreadsheetTitle: sheetLink.spreadsheetTitle,
        };
      }
    } catch { /* non-fatal: sheet not found */ }

    res.json({ available: true, canvas, stats, timestamp: new Date().toISOString(), meta });
  } catch (err) {
    console.error('BMC error:', err);
    res.status(500).json({ error: 'Failed to load Business Model Canvas' });
  }
});

/**
 * GET /api/bmc/:section
 * Returns a single BMC section, hydrated.
 */
router.get('/:section', async (req, res) => {
  const { section } = req.params;
  const sheetKey = BMC_SECTIONS[section];
  if (!sheetKey) {
    return res.status(400).json({
      error: `Invalid section: ${section}. Valid: ${Object.keys(BMC_SECTIONS).join(', ')}`,
    });
  }
  try {
    const data = await hydrationService.hydrateSheetData(sheetKey);
    res.json(data);
  } catch (err) {
    console.error(`BMC section error (${section}):`, err.message);
    res.status(500).json({ error: `Failed to load BMC section: ${section}` });
  }
});

module.exports = router;
