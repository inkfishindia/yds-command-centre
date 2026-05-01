'use strict';
// writes/tech-team.js
// Purpose: Write operations for the tech sprint board — update Status, Priority, or Waiting On.
// Public exports: updateSprintItemProperty
// DO NOT add: read queries (reads/tech-team.js), marketing or commitment writes.
// Uses: enqueueWrite (write-queue), cache (for inline tech cache invalidation).

const { getClient } = require('../client');
const { withRetry } = require('../retry');
const { cache } = require('../cache');
const { enqueueWrite } = require('../write-queue');

/**
 * Update a sprint item's Status, Priority, or Waiting On property.
 */
async function updateSprintItemProperty(pageId, property, value) {
  return enqueueWrite(async () => {
    const notion = getClient();
    const properties = {};

    if (property === 'Status') {
      properties.Status = { select: { name: value } };
    } else if (property === 'Priority') {
      properties.Priority = { select: { name: value } };
    } else if (property === 'Waiting On') {
      properties['Waiting On'] = { select: { name: value } };
    } else {
      throw new Error('Unsupported sprint item property: ' + property);
    }

    const result = await withRetry(() => notion.pages.update({
      page_id: pageId,
      properties,
    }));

    // Invalidate all tech caches
    for (const [key] of cache) {
      if (key.startsWith('tech_')) cache.delete(key);
    }

    return { id: result.id, url: result.url };
  });
}

module.exports = { updateSprintItemProperty };
