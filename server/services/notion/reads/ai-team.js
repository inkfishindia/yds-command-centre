'use strict';
// reads/ai-team.js
// Purpose: Fetch AI team members with resolved relations from the AI_TEAM Notion database.
// Public exports: getAITeam
// DO NOT add: human people reads (people.js), write operations, or other domain functions.
// Dependency: infra leaves only (client, cache, retry, simplify, databases, pages).

const { getClient } = require('../client');
const { deduplicatedFetch } = require('../cache');
const { withRetry } = require('../retry');
const { simplify } = require('../simplify');
const { DB } = require('../databases');
const { getPageRaw } = require('../pages');

/**
 * Fetch all AI team members with resolved relations (Focus Areas, Human Counterpart, Platforms, Audiences).
 */
async function getAITeam() {
  return deduplicatedFetch('ai_team', async () => {
    const notion = getClient();
    const items = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.AI_TEAM,
        page_size: 100,
        start_cursor: cursor,
      }));
      items.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        lastEdited: page.last_edited_time,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Resolve relations to names
    const allRelationIds = [...new Set(
      items.flatMap(item => [
        ...(Array.isArray(item['Focus Areas']) ? item['Focus Areas'] : []),
        ...(Array.isArray(item['Human Counterpart']) ? item['Human Counterpart'] : []),
        ...(Array.isArray(item.Platforms) ? item.Platforms : []),
        ...(Array.isArray(item.Audiences) ? item.Audiences : []),
      ])
    )];

    const pageMap = {};
    await Promise.all(allRelationIds.map(async (id) => {
      try {
        const page = await getPageRaw(id);
        if (page) {
          const props = simplify(page.properties);
          pageMap[id] = props.Name || props.Title || props.name || 'Untitled';
        }
      } catch { /* skip unresolvable */ }
    }));

    return items.map(item => ({
      ...item,
      focusAreaNames: (Array.isArray(item['Focus Areas']) ? item['Focus Areas'] : []).map(id => pageMap[id] || id.slice(0, 8)),
      humanCounterpartNames: (Array.isArray(item['Human Counterpart']) ? item['Human Counterpart'] : []).map(id => pageMap[id] || id.slice(0, 8)),
      platformNames: (Array.isArray(item.Platforms) ? item.Platforms : []).map(id => pageMap[id] || id.slice(0, 8)),
      audienceNames: (Array.isArray(item.Audiences) ? item.Audiences : []).map(id => pageMap[id] || id.slice(0, 8)),
    }));
  }).catch(err => {
    console.error('Failed to fetch AI team:', err.message);
    return [];
  });
}

module.exports = { getAITeam };
