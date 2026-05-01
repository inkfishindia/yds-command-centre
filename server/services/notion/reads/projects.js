'use strict';
// reads/projects.js
// Purpose: Fetch all active projects with Focus Area relations from the PROJECTS Notion database.
// Public exports: getProjects
// DO NOT add: writes, commitment reads, or functions from other domains.
// Dependency: infra leaves only (client, cache, retry, simplify, databases).

const { getClient } = require('../client');
const { deduplicatedFetch } = require('../cache');
const { withRetry } = require('../retry');
const { simplify } = require('../simplify');
const { DB } = require('../databases');

/**
 * Fetch all projects with Focus Area relations.
 * Excludes records where Status is null/empty and records with "TEMPLATE" in the Name.
 */
async function getProjects() {
  return deduplicatedFetch('projects', async () => {
    const notion = getClient();
    const projects = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.PROJECTS,
        page_size: 100,
        start_cursor: cursor,
        filter: {
          and: [
            // Exclude entries with no status
            { property: 'Status', select: { is_not_empty: true } },
            // Exclude template records
            { property: 'Name', title: { does_not_contain: 'TEMPLATE' } },
            { property: 'Name', title: { does_not_contain: 'template' } },
          ],
        },
      }));
      projects.push(...response.results.map(page => ({
        id: page.id,
        last_edited_time: page.last_edited_time,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);
    return projects;
  }).catch(err => {
    console.error('Failed to fetch projects:', err.message);
    return [];
  });
}

module.exports = { getProjects };
