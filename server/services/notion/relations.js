'use strict';
// relations.js — Resolve Notion relation IDs to {id, name} objects.
// Public exports: resolveRelations, resolveRelationIdsToNamedItems
// DO NOT add: cache data structures (cache.js), DB constants (databases.js),
//   page content fetching (pages.js), domain reads (notion.js).
// Depends on pages.js for getPageRaw — imported directly (no lazy-require needed;
// tests do not mock getClient() or @notionhq/client via require.cache injection).

const { getPageRaw } = require('./pages');

/**
 * Resolve relation IDs in simplified properties to {id, name} objects.
 * Uses cached pages when available, fetches uncached ones in parallel.
 * This is cheap because getPageRaw() uses the 5-min cache.
 */
async function resolveRelations(properties) {
  const resolved = { ...properties };

  for (const [key, value] of Object.entries(resolved)) {
    // Relations from simplify() are arrays of ID strings
    if (!Array.isArray(value) || value.length === 0) continue;
    // Skip arrays that aren't UUIDs (multi_select values are short human-readable strings)
    if (typeof value[0] !== 'string' || value[0].length < 30) continue;

    // Resolve each ID to {id, name} — use getPageRaw to avoid recursive resolution
    const resolvedItems = await Promise.all(
      value.slice(0, 10).map(async (id) => {
        try {
          const page = await getPageRaw(id);
          if (!page) return { id, name: 'Untitled' };
          const name = page.properties.Name || page.properties.Title || page.properties.name || 'Untitled';
          return { id, name };
        } catch {
          return { id, name: 'Untitled' };
        }
      })
    );
    resolved[key] = resolvedItems;
  }

  return resolved;
}

async function resolveRelationIdsToNamedItems(ids) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).filter(id => typeof id === 'string' && id.length >= 30))];
  const entries = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const page = await getPageRaw(id);
        const name = page?.properties?.Name || page?.properties?.Title || page?.properties?.name || 'Untitled';
        return [id, { id, name }];
      } catch {
        return [id, { id, name: 'Untitled' }];
      }
    })
  );
  return Object.fromEntries(entries);
}

module.exports = { resolveRelations, resolveRelationIdsToNamedItems };
