'use strict';

/**
 * campaigns.js — Route handlers for campaign-related marketing-ops endpoints.
 *
 * Public exports: getCampaigns, patchCampaign, getCampaignCommitments
 *
 * Handlers are registered onto the shared router in index.js.
 * DO NOT put content, sequence, session, task, or metric logic here.
 * DO NOT require express or create a sub-router here — index.js owns the router.
 */

const marketingOpsService = require('../../services/marketing-ops-service');

// GET /api/marketing-ops/campaigns
async function getCampaigns(req, res) {
  try {
    res.json(await marketingOpsService.getCampaigns({ stage: req.query.stage }));
  } catch (err) {
    console.error('Campaigns error:', err);
    res.status(500).json({ error: 'Failed to load campaigns' });
  }
}

// PATCH /api/marketing-ops/campaigns/:id — update campaign property (requires approval)
async function patchCampaign(req, res) {
  const pageId = req.params.id;
  if (!/^[a-f0-9]{32}$|^[a-f0-9-]{36}$/.test(pageId)) {
    return res.status(400).json({ error: 'Invalid page ID format' });
  }

  const { property, value } = req.body;

  if (!property || !value) {
    return res.status(400).json({ error: 'property and value are required' });
  }

  const selectAllowed = {
    Stage: ['Briefing', 'In Progress', 'Review', 'Live', 'Complete'],
    Status: ['On Track', 'At Risk', 'Blocked', 'Needs Dan'],
    Type: ['Awareness', 'Conversion', 'Retention', 'Product Launch', 'Seasonal', 'Evergreen'],
  };
  const numberFields = ['Spent', 'Target ROAS', 'Actual ROAS'];

  const allAllowed = [...Object.keys(selectAllowed), ...numberFields];
  if (!allAllowed.includes(property)) {
    return res.status(400).json({ error: `Invalid property. Allowed: ${allAllowed.join(', ')}` });
  }

  if (selectAllowed[property] && !selectAllowed[property].includes(value)) {
    return res.status(400).json({ error: `Invalid value for ${property}. Allowed: ${selectAllowed[property].join(', ')}` });
  }

  if (numberFields.includes(property) && (value === undefined || value === null || isNaN(Number(value)))) {
    return res.status(400).json({ error: `${property} must be a number` });
  }

  try {
    const result = await marketingOpsService.updateCampaignProperty(pageId, property, value);
    res.json(result);
  } catch (err) {
    console.error('Campaign update error:', err);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
}

// GET /api/marketing-ops/campaigns/:id/commitments — commitments linked to a campaign
async function getCampaignCommitments(req, res) {
  const pageId = req.params.id;
  if (!/^[a-f0-9]{32}$|^[a-f0-9-]{36}$/.test(pageId)) {
    return res.status(400).json({ error: 'Invalid page ID format' });
  }
  try {
    res.json(await marketingOpsService.getCampaignCommitments(pageId));
  } catch (err) {
    console.error('Campaign commitments error:', err);
    res.status(500).json({ error: 'Failed to load campaign commitments' });
  }
}

module.exports = { getCampaigns, patchCampaign, getCampaignCommitments };
