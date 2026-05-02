const express = require('express');
const router = express.Router();
const marketingOpsService = require('../services/marketing-ops-service');
const marketingOpsReadModel = require('../read-model/marketing-ops');

// GET /api/marketing-ops — aggregated summary
router.get('/', async (req, res) => {
  try {
    res.json(await marketingOpsReadModel.build());
  } catch (err) {
    console.error('Marketing ops summary error:', err);
    res.status(500).json({ error: 'Failed to load marketing ops data' });
  }
});

// GET /api/marketing-ops/campaigns
router.get('/campaigns', async (req, res) => {
  try {
    res.json(await marketingOpsService.getCampaigns({ stage: req.query.stage }));
  } catch (err) {
    console.error('Campaigns error:', err);
    res.status(500).json({ error: 'Failed to load campaigns' });
  }
});

// GET /api/marketing-ops/content/calendar?month=YYYY-MM
router.get('/content/calendar', async (req, res) => {
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
});

// GET /api/marketing-ops/content
router.get('/content', async (req, res) => {
  try {
    res.json(await marketingOpsService.getContent({ status: req.query.status }));
  } catch (err) {
    console.error('Content calendar error:', err);
    res.status(500).json({ error: 'Failed to load content calendar' });
  }
});

// Validation constants for IG-specific Content Calendar fields (NOTION-SETUP.md §3.1)
const VALID_IG_PILLARS = ['Permission', 'Napkin', 'In-the-Wild', 'Craft', 'Educational'];
const VALID_HOOK_PATTERNS = ['Permission', 'Reframe', 'Anti-claim', 'Tribe-name', 'Question'];
const VALID_PUBLISHED_SLOTS = [
  'Mon 1PM', 'Mon 8:30PM', 'Tue 1PM', 'Tue 8:30PM',
  'Wed 1PM', 'Wed 8:30PM', 'Fri 1PM', 'Fri 8:30PM',
  'Sat 11AM', 'Sat 8:30PM', 'Sun 8:30PM',
];

// Validation for Phase B MCC fields
const VALID_CONTENT_SERIES = [
  'Quality Monday',
  'Tutorial Tuesday',
  'Wisdom Wednesday',
  'Throwback Thursday',
  'Feature Friday',
  'Case Study Spotlight',
  'Behind the Brand',
  'Customer Stories',
];

const VALID_REPURPOSE_OPPORTUNITIES = [
  'Email Newsletter',
  'Blog Article',
  'Video Content',
  'Carousel Post',
  'Story Highlights',
  'Case Study',
  'Ad Creative',
  'Presentation Slide',
];

const VALID_SEASONAL_TAGS = [
  'New Year',
  "Valentine's Day",
  'Holi',
  'Summer Season',
  'Monsoon',
  'Diwali',
  'Christmas',
  'Corporate FY End',
  'Back to School',
  'Wedding Season',
];

const VALID_CTAS = [
  'Visit Website',
  'Request Quote',
  'Download Catalog',
  'Book Consultation',
  'Contact Sales',
  'Follow Account',
  'Share Content',
  'Watch Video',
  'Read More',
  'Shop Now',
];

// POST /api/marketing-ops/content — create a new content calendar item
router.post('/content', async (req, res) => {
  const {
    name, status, contentType, channels, publishDate, owner, campaignId, notes,
    contentPillar, hook, audienceSegment, productFocus, caption, visualBrief,
    igPillar, hookPattern, publishedSlot,
    contentSeries, repurposeOpportunities, seasonalTag, cta, trackingUrl, hashtags,
  } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name is required' });
  }

  const VALID_STATUSES = ['Idea', 'Briefed', 'Drafted', 'In Design', 'Brand Review', 'Approved', 'Scheduled', 'Published'];
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` });
  }

  const VALID_CONTENT_TYPES = ['Feed Post', 'Carousel', 'Reel', 'Story', 'Email', 'WhatsApp', 'Blog'];
  if (contentType && !VALID_CONTENT_TYPES.includes(contentType)) {
    return res.status(400).json({ error: `Invalid contentType. Allowed: ${VALID_CONTENT_TYPES.join(', ')}` });
  }

  const VALID_CHANNELS = ['Email', 'LinkedIn', 'Twitter', 'Instagram', 'Website'];
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

  const VALID_CONTENT_PILLARS = ['Education', 'Social Proof', 'Product', 'Behind the Scenes', 'Community', 'Promotional'];
  if (contentPillar && !VALID_CONTENT_PILLARS.includes(contentPillar)) {
    return res.status(400).json({ error: `Invalid contentPillar. Allowed: ${VALID_CONTENT_PILLARS.join(', ')}` });
  }

  const VALID_OWNERS = ['Corey', 'Dickie', 'Jessica', 'Pixel', 'Studio', 'Harry', 'Bimal'];
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
});

// PATCH /api/marketing-ops/content/:id — update a content calendar item
router.patch('/content/:id', async (req, res) => {
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

  const VALID_STATUSES = ['Idea', 'Briefed', 'Drafted', 'In Design', 'Brand Review', 'Approved', 'Scheduled', 'Published'];
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` });
  }

  const VALID_CONTENT_TYPES = ['Feed Post', 'Carousel', 'Reel', 'Story', 'Email', 'WhatsApp', 'Blog'];
  if (contentType !== undefined && !VALID_CONTENT_TYPES.includes(contentType)) {
    return res.status(400).json({ error: `Invalid contentType. Allowed: ${VALID_CONTENT_TYPES.join(', ')}` });
  }

  const VALID_CHANNELS = ['Email', 'LinkedIn', 'Twitter', 'Instagram', 'Website'];
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

  const VALID_CONTENT_PILLARS = ['Education', 'Social Proof', 'Product', 'Behind the Scenes', 'Community', 'Promotional'];
  if (contentPillar !== undefined && !VALID_CONTENT_PILLARS.includes(contentPillar)) {
    return res.status(400).json({ error: `Invalid contentPillar. Allowed: ${VALID_CONTENT_PILLARS.join(', ')}` });
  }

  const VALID_OWNERS = ['Corey', 'Dickie', 'Jessica', 'Pixel', 'Studio', 'Harry', 'Bimal'];
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
});

// GET /api/marketing-ops/sequences
router.get('/sequences', async (req, res) => {
  try {
    res.json(await marketingOpsService.getSequences({ journeyStage: req.query.journeyStage }));
  } catch (err) {
    console.error('Sequences error:', err);
    res.status(500).json({ error: 'Failed to load sequences' });
  }
});

// GET /api/marketing-ops/sessions
router.get('/sessions', async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
    res.json(await marketingOpsService.getSessions(days));
  } catch (err) {
    console.error('Sessions log error:', err);
    res.status(500).json({ error: 'Failed to load sessions' });
  }
});

// GET /api/marketing-ops/tasks — marketing tasks with optional ?status=&priority=&channel= filters
router.get('/tasks', async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.priority) filters.priority = req.query.priority;
    if (req.query.channel) filters.channel = req.query.channel;
    res.json(await marketingOpsService.getMarketingTasks(filters));
  } catch (err) {
    console.error('Marketing tasks error:', err);
    res.status(500).json({ error: 'Failed to load marketing tasks' });
  }
});

// GET /api/marketing-ops/tasks/summary — aggregated stats across all marketing tasks
router.get('/tasks/summary', async (req, res) => {
  try {
    res.json(await marketingOpsService.getMarketingTasksSummary());
  } catch (err) {
    console.error('Marketing tasks summary error:', err);
    res.status(500).json({ error: 'Failed to load marketing tasks summary' });
  }
});

// PATCH /api/marketing-ops/campaigns/:id — update campaign property (requires approval)
router.patch('/campaigns/:id', async (req, res) => {
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
});

// GET /api/marketing-ops/campaigns/:id/commitments — commitments linked to a campaign
router.get('/campaigns/:id/commitments', async (req, res) => {
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
});

// GET /api/marketing-ops/metrics — key business metrics
router.get('/metrics', async (req, res) => {
  try {
    res.json(await marketingOpsService.getMetrics());
  } catch (err) {
    console.error('Metrics error:', err);
    res.status(500).json({ error: 'Failed to load metrics' });
  }
});

module.exports = router;
