'use strict';

/**
 * content.js — Route handlers for content-calendar marketing-ops endpoints.
 *
 * Public exports: getContent, getContentCalendar, postContent, patchContent
 *
 * Handlers are registered onto the shared router in index.js.
 * IMPORTANT: getContentCalendar (/content/calendar) MUST be registered before
 *   getContent (/content) in index.js to win the Express route match.
 * DO NOT put campaign, sequence, session, task, or metric logic here.
 * DO NOT require express or create a sub-router — index.js owns the router.
 */

const marketingOpsService = require('../../services/marketing-ops-service');
const {
  VALID_IG_PILLARS,
  VALID_HOOK_PATTERNS,
  VALID_PUBLISHED_SLOTS,
  VALID_CONTENT_SERIES,
  VALID_REPURPOSE_OPPORTUNITIES,
  VALID_SEASONAL_TAGS,
  VALID_CTAS,
  VALID_STATUSES,
  VALID_CONTENT_TYPES,
  VALID_CHANNELS,
  VALID_CONTENT_PILLARS,
  VALID_OWNERS,
} = require('./validators');

// GET /api/marketing-ops/content/calendar?month=YYYY-MM
async function getContentCalendar(req, res) {
  const month = req.query.month;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'month query parameter is required in YYYY-MM format' });
  }
  const [, mo] = month.split('-').map(Number);
  if (mo < 1 || mo > 12) {
    return res.status(400).json({ error: 'Invalid month value' });
  }
  try {
    res.json(await marketingOpsService.getContentForMonth(month));
  } catch (err) {
    console.error('Content calendar month error:', err);
    res.status(500).json({ error: 'Failed to load content calendar for month' });
  }
}

// GET /api/marketing-ops/content
async function getContent(req, res) {
  try {
    res.json(await marketingOpsService.getContent({ status: req.query.status }));
  } catch (err) {
    console.error('Content calendar error:', err);
    res.status(500).json({ error: 'Failed to load content calendar' });
  }
}

// POST /api/marketing-ops/content — create a new content calendar item
async function postContent(req, res) {
  const {
    name, status, contentType, channels, publishDate, owner, campaignId, notes,
    contentPillar, hook, audienceSegment, productFocus, caption, visualBrief,
    igPillar, hookPattern, publishedSlot,
    contentSeries, repurposeOpportunities, seasonalTag, cta, trackingUrl, hashtags,
  } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name is required' });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` });
  }

  if (contentType && !VALID_CONTENT_TYPES.includes(contentType)) {
    return res.status(400).json({ error: `Invalid contentType. Allowed: ${VALID_CONTENT_TYPES.join(', ')}` });
  }

  if (channels !== undefined) {
    if (!Array.isArray(channels)) {
      return res.status(400).json({ error: 'channels must be an array' });
    }
    const invalid = channels.filter(c => !VALID_CHANNELS.includes(c));
    if (invalid.length > 0) {
      return res.status(400).json({ error: `Invalid channel(s): ${invalid.join(', ')}. Allowed: ${VALID_CHANNELS.join(', ')}` });
    }
  }

  if (publishDate && !/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) {
    return res.status(400).json({ error: 'publishDate must be in YYYY-MM-DD format' });
  }

  if (campaignId && !/^[a-f0-9]{32}$|^[a-f0-9-]{36}$/.test(campaignId)) {
    return res.status(400).json({ error: 'Invalid campaignId format' });
  }

  if (contentPillar && !VALID_CONTENT_PILLARS.includes(contentPillar)) {
    return res.status(400).json({ error: `Invalid contentPillar. Allowed: ${VALID_CONTENT_PILLARS.join(', ')}` });
  }

  if (owner !== undefined && !VALID_OWNERS.includes(owner)) {
    return res.status(400).json({ error: `Invalid owner. Allowed: ${VALID_OWNERS.join(', ')}` });
  }

  if (audienceSegment !== undefined && !Array.isArray(audienceSegment)) {
    return res.status(400).json({ error: 'audienceSegment must be an array' });
  }

  if (productFocus !== undefined && !Array.isArray(productFocus)) {
    return res.status(400).json({ error: 'productFocus must be an array' });
  }

  if (igPillar && !VALID_IG_PILLARS.includes(igPillar)) {
    return res.status(400).json({ error: `Invalid igPillar. Allowed: ${VALID_IG_PILLARS.join(', ')}` });
  }
  if (hookPattern && !VALID_HOOK_PATTERNS.includes(hookPattern)) {
    return res.status(400).json({ error: `Invalid hookPattern. Allowed: ${VALID_HOOK_PATTERNS.join(', ')}` });
  }
  if (publishedSlot && !VALID_PUBLISHED_SLOTS.includes(publishedSlot)) {
    return res.status(400).json({ error: `Invalid publishedSlot. Allowed: ${VALID_PUBLISHED_SLOTS.join(', ')}` });
  }

  if (contentSeries && !VALID_CONTENT_SERIES.includes(contentSeries)) {
    return res.status(400).json({ error: `Invalid contentSeries. Allowed: ${VALID_CONTENT_SERIES.join(', ')}` });
  }
  if (repurposeOpportunities !== undefined) {
    if (!Array.isArray(repurposeOpportunities)) {
      return res.status(400).json({ error: 'repurposeOpportunities must be an array' });
    }
    const invalidRO = repurposeOpportunities.filter(r => !VALID_REPURPOSE_OPPORTUNITIES.includes(r));
    if (invalidRO.length > 0) {
      return res.status(400).json({ error: `Invalid repurposeOpportunities: ${invalidRO.join(', ')}. Allowed: ${VALID_REPURPOSE_OPPORTUNITIES.join(', ')}` });
    }
  }
  if (seasonalTag !== undefined) {
    if (!Array.isArray(seasonalTag)) {
      return res.status(400).json({ error: 'seasonalTag must be an array' });
    }
    const invalidST = seasonalTag.filter(t => !VALID_SEASONAL_TAGS.includes(t));
    if (invalidST.length > 0) {
      return res.status(400).json({ error: `Invalid seasonalTag: ${invalidST.join(', ')}. Allowed: ${VALID_SEASONAL_TAGS.join(', ')}` });
    }
  }
  if (cta && !VALID_CTAS.includes(cta)) {
    return res.status(400).json({ error: `Invalid cta. Allowed: ${VALID_CTAS.join(', ')}` });
  }

  try {
    const result = await marketingOpsService.createContent({
      name: name.trim(),
      status: status || 'Idea',
      contentType: contentType || null,
      channels: channels || [],
      publishDate: publishDate || null,
      owner: owner || null,
      campaignId: campaignId || null,
      notes: notes || null,
      contentPillar: contentPillar || null,
      hook: hook || null,
      audienceSegment: audienceSegment || null,
      productFocus: productFocus || null,
      caption: caption || null,
      visualBrief: visualBrief || null,
      igPillar: igPillar || null,
      hookPattern: hookPattern || null,
      publishedSlot: publishedSlot || null,
      contentSeries: contentSeries || null,
      repurposeOpportunities: repurposeOpportunities || null,
      seasonalTag: seasonalTag || null,
      cta: cta || null,
      trackingUrl: trackingUrl || null,
      hashtags: hashtags || null,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('Create content error:', err);
    res.status(500).json({ error: 'Failed to create content item' });
  }
}

// PATCH /api/marketing-ops/content/:id — update a content calendar item
async function patchContent(req, res) {
  const pageId = req.params.id;
  if (!/^[a-f0-9]{32}$|^[a-f0-9-]{36}$/.test(pageId)) {
    return res.status(400).json({ error: 'Invalid page ID format' });
  }

  const {
    name, status, contentType, channels, publishDate, notes, owner,
    contentPillar, hook, audienceSegment, productFocus, caption, visualBrief,
    igPillar, hookPattern, publishedSlot,
    contentSeries, repurposeOpportunities, seasonalTag, cta, trackingUrl, hashtags,
  } = req.body;

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'At least one field is required' });
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` });
  }

  if (contentType !== undefined && !VALID_CONTENT_TYPES.includes(contentType)) {
    return res.status(400).json({ error: `Invalid contentType. Allowed: ${VALID_CONTENT_TYPES.join(', ')}` });
  }

  if (channels !== undefined) {
    if (!Array.isArray(channels)) {
      return res.status(400).json({ error: 'channels must be an array' });
    }
    const invalid = channels.filter(c => !VALID_CHANNELS.includes(c));
    if (invalid.length > 0) {
      return res.status(400).json({ error: `Invalid channel(s): ${invalid.join(', ')}. Allowed: ${VALID_CHANNELS.join(', ')}` });
    }
  }

  if (publishDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) {
    return res.status(400).json({ error: 'publishDate must be in YYYY-MM-DD format' });
  }

  if (contentPillar !== undefined && !VALID_CONTENT_PILLARS.includes(contentPillar)) {
    return res.status(400).json({ error: `Invalid contentPillar. Allowed: ${VALID_CONTENT_PILLARS.join(', ')}` });
  }

  if (owner !== undefined && !VALID_OWNERS.includes(owner)) {
    return res.status(400).json({ error: `Invalid owner. Allowed: ${VALID_OWNERS.join(', ')}` });
  }

  if (audienceSegment !== undefined && !Array.isArray(audienceSegment)) {
    return res.status(400).json({ error: 'audienceSegment must be an array' });
  }

  if (productFocus !== undefined && !Array.isArray(productFocus)) {
    return res.status(400).json({ error: 'productFocus must be an array' });
  }

  if (igPillar !== undefined && !VALID_IG_PILLARS.includes(igPillar)) {
    return res.status(400).json({ error: `Invalid igPillar. Allowed: ${VALID_IG_PILLARS.join(', ')}` });
  }
  if (hookPattern !== undefined && !VALID_HOOK_PATTERNS.includes(hookPattern)) {
    return res.status(400).json({ error: `Invalid hookPattern. Allowed: ${VALID_HOOK_PATTERNS.join(', ')}` });
  }
  if (publishedSlot !== undefined && !VALID_PUBLISHED_SLOTS.includes(publishedSlot)) {
    return res.status(400).json({ error: `Invalid publishedSlot. Allowed: ${VALID_PUBLISHED_SLOTS.join(', ')}` });
  }

  if (contentSeries !== undefined && contentSeries !== null && !VALID_CONTENT_SERIES.includes(contentSeries)) {
    return res.status(400).json({ error: `Invalid contentSeries. Allowed: ${VALID_CONTENT_SERIES.join(', ')}` });
  }
  if (repurposeOpportunities !== undefined) {
    if (!Array.isArray(repurposeOpportunities)) {
      return res.status(400).json({ error: 'repurposeOpportunities must be an array' });
    }
    const invalidRO = repurposeOpportunities.filter(r => !VALID_REPURPOSE_OPPORTUNITIES.includes(r));
    if (invalidRO.length > 0) {
      return res.status(400).json({ error: `Invalid repurposeOpportunities: ${invalidRO.join(', ')}. Allowed: ${VALID_REPURPOSE_OPPORTUNITIES.join(', ')}` });
    }
  }
  if (seasonalTag !== undefined) {
    if (!Array.isArray(seasonalTag)) {
      return res.status(400).json({ error: 'seasonalTag must be an array' });
    }
    const invalidST = seasonalTag.filter(t => !VALID_SEASONAL_TAGS.includes(t));
    if (invalidST.length > 0) {
      return res.status(400).json({ error: `Invalid seasonalTag: ${invalidST.join(', ')}. Allowed: ${VALID_SEASONAL_TAGS.join(', ')}` });
    }
  }
  if (cta !== undefined && cta !== null && !VALID_CTAS.includes(cta)) {
    return res.status(400).json({ error: `Invalid cta. Allowed: ${VALID_CTAS.join(', ')}` });
  }

  try {
    const result = await marketingOpsService.updateContent(pageId, {
      name, status, contentType, channels, publishDate, notes, owner,
      contentPillar, hook, audienceSegment, productFocus, caption, visualBrief,
      igPillar, hookPattern, publishedSlot,
      contentSeries, repurposeOpportunities, seasonalTag, cta, trackingUrl, hashtags,
    });
    res.json(result);
  } catch (err) {
    console.error('Update content error:', err);
    res.status(500).json({ error: 'Failed to update content item' });
  }
}

module.exports = { getContent, getContentCalendar, postContent, patchContent };
