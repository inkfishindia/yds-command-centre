'use strict';
// writes/marketing-ops.js
// Purpose: Write operations for content calendar items and campaign properties.
// Public exports: createContentCalendarItem, updateContentCalendarItem, updateCampaignProperty
// DO NOT add: read queries (reads/marketing-ops.js), commitment or tech writes.
// Uses: enqueueWrite (write-queue), cache (for inline cache invalidation).

const { getClient } = require('../client');
const { withRetry } = require('../retry');
const { cache } = require('../cache');
const { DB } = require('../databases');
const { enqueueWrite } = require('../write-queue');

/**
 * Create a new content calendar item in CONTENT_CALENDAR.
 */
async function createContentCalendarItem({ name, status, contentType, channels, publishDate, owner, campaignId, notes, contentPillar, hook, audienceSegment, productFocus, caption, visualBrief, igPillar, hookPattern, publishedSlot }) {
  return enqueueWrite(async () => {
    const notion = getClient();
    const properties = {
      Name: { title: [{ text: { content: name } }] },
    };

    if (status) {
      properties['Status'] = { select: { name: status } };
    }

    if (contentType) {
      properties['Content Type'] = { select: { name: contentType } };
    }

    if (Array.isArray(channels) && channels.length > 0) {
      properties['Channel'] = { multi_select: channels.map(c => ({ name: c })) };
    }

    if (publishDate) {
      properties['Publish Date'] = { date: { start: publishDate } };
    }

    if (owner) {
      properties['Owner'] = { select: { name: owner } };
    }

    if (campaignId) {
      const cleanId = campaignId.replace(/-/g, '');
      const formattedId = [
        cleanId.slice(0, 8), cleanId.slice(8, 12), cleanId.slice(12, 16),
        cleanId.slice(16, 20), cleanId.slice(20),
      ].join('-');
      properties['Campaign'] = { relation: [{ id: formattedId }] };
    }

    if (notes) {
      properties['Notes'] = { rich_text: [{ text: { content: notes } }] };
    }

    if (contentPillar) {
      properties['Content Pillar'] = { select: { name: contentPillar } };
    }

    if (hook) {
      properties['Hook'] = { rich_text: [{ text: { content: hook } }] };
    }

    if (Array.isArray(audienceSegment) && audienceSegment.length > 0) {
      properties['Audience Segment'] = { multi_select: audienceSegment.map(s => ({ name: s })) };
    }

    if (Array.isArray(productFocus) && productFocus.length > 0) {
      properties['Product Focus'] = { multi_select: productFocus.map(p => ({ name: p })) };
    }

    if (caption) {
      properties['Caption / Copy'] = { rich_text: [{ text: { content: caption } }] };
    }

    if (visualBrief) {
      properties['Visual Brief'] = { rich_text: [{ text: { content: visualBrief } }] };
    }

    // IG-specific fields (additive — existing callers unaffected)
    if (igPillar) {
      properties['Pillar (IG)'] = { select: { name: igPillar } };
    }
    if (hookPattern) {
      properties['Hook Pattern'] = { select: { name: hookPattern } };
    }
    if (publishedSlot) {
      properties['Published Slot'] = { select: { name: publishedSlot } };
    }

    const result = await withRetry(() => notion.pages.create({
      parent: { database_id: DB.CONTENT_CALENDAR },
      properties,
    }));

    // Invalidate relevant cache keys
    for (const [key] of cache) {
      if (key.startsWith('mktops_content') || key === 'mktops_summary') cache.delete(key);
    }

    return { id: result.id, url: result.url };
  });
}

/**
 * Update properties on an existing content calendar item.
 */
async function updateContentCalendarItem(pageId, { name, status, contentType, channels, publishDate, notes, owner, contentPillar, hook, audienceSegment, productFocus, caption, visualBrief, igPillar, hookPattern, publishedSlot }) {
  return enqueueWrite(async () => {
    const notion = getClient();
    const properties = {};

    if (name !== undefined) {
      properties['Name'] = { title: [{ text: { content: name } }] };
    }

    if (status !== undefined) {
      properties['Status'] = { select: { name: status } };
    }

    if (contentType !== undefined) {
      properties['Content Type'] = { select: { name: contentType } };
    }

    if (channels !== undefined) {
      properties['Channel'] = { multi_select: (channels || []).map(c => ({ name: c })) };
    }

    if (publishDate !== undefined) {
      properties['Publish Date'] = { date: { start: publishDate } };
    }

    if (notes !== undefined) {
      properties['Notes'] = { rich_text: [{ text: { content: notes } }] };
    }

    if (owner !== undefined) {
      properties['Owner'] = { select: { name: owner } };
    }

    if (contentPillar !== undefined) {
      properties['Content Pillar'] = { select: { name: contentPillar } };
    }

    if (hook !== undefined) {
      properties['Hook'] = { rich_text: [{ text: { content: hook } }] };
    }

    if (audienceSegment !== undefined) {
      properties['Audience Segment'] = { multi_select: (audienceSegment || []).map(s => ({ name: s })) };
    }

    if (productFocus !== undefined) {
      properties['Product Focus'] = { multi_select: (productFocus || []).map(p => ({ name: p })) };
    }

    if (caption !== undefined) {
      properties['Caption / Copy'] = { rich_text: [{ text: { content: caption } }] };
    }

    if (visualBrief !== undefined) {
      properties['Visual Brief'] = { rich_text: [{ text: { content: visualBrief } }] };
    }

    // IG-specific fields (additive — existing callers unaffected)
    if (igPillar !== undefined) {
      properties['Pillar (IG)'] = { select: { name: igPillar } };
    }
    if (hookPattern !== undefined) {
      properties['Hook Pattern'] = { select: { name: hookPattern } };
    }
    if (publishedSlot !== undefined) {
      properties['Published Slot'] = { select: { name: publishedSlot } };
    }

    const result = await withRetry(() => notion.pages.update({
      page_id: pageId,
      properties,
    }));

    // Invalidate relevant cache keys
    for (const [key] of cache) {
      if (key.startsWith('mktops_content') || key === 'mktops_summary') cache.delete(key);
    }

    return { id: result.id, url: result.url };
  });
}

/**
 * Update a campaign's Stage or Status property.
 */
async function updateCampaignProperty(pageId, property, value) {
  return enqueueWrite(async () => {
    const notion = getClient();
    const properties = {};

    if (property === 'Stage') {
      properties.Stage = { select: { name: value } };
    } else if (property === 'Status') {
      properties.Status = { select: { name: value } };
    } else {
      throw new Error('Unsupported campaign property: ' + property);
    }

    const result = await withRetry(() => notion.pages.update({
      page_id: pageId,
      properties,
    }));

    // Invalidate marketing ops caches
    for (const [key] of cache) {
      if (key.startsWith('mktops_')) cache.delete(key);
    }

    return { id: result.id, url: result.url };
  });
}

module.exports = {
  createContentCalendarItem,
  updateContentCalendarItem,
  updateCampaignProperty,
};
