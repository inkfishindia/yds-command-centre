'use strict';
// pages.js — Raw page retrieval, block-children fetching, and markdown conversion.
// Public exports: getPageRaw, getPageContent, fetchBlockChildren, blocksToMarkdown,
//   richTextToPlain, EXPANDABLE_BLOCK_TYPES, getRelatedPages
// DO NOT add: getPage (orchestrates getPageRaw + resolveRelations — stays in notion.js to avoid
//   a dep cycle: pages.js → relations.js → pages.js), DB constants (databases.js),
//   relation resolution (relations.js), domain reads (notion.js).
// Tests do not mock @notionhq/client via require.cache injection — no lazy-require needed.

const { getClient } = require('./client');
const { withRetry } = require('./retry');
const { getCached, setCache, deduplicatedFetch } = require('./cache');
const { simplify } = require('./simplify');

/**
 * Fetch a single page's raw (simplified but not relation-resolved) properties.
 * Used internally by resolveRelations to avoid recursive resolution.
 */
async function getPageRaw(pageId) {
  const cacheKey = 'page_' + pageId;
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const page = await withRetry(() => notion.pages.retrieve({ page_id: pageId }));
    return {
      id: page.id,
      url: page.url,
      created: page.created_time,
      updated: page.last_edited_time,
      properties: simplify(page.properties),
    };
  }).catch(err => {
    console.error('Failed to get page ' + pageId + ':', err.message);
    return null;
  });
}

/**
 * Get a page's block children (content) and convert to markdown
 */
async function getPageContent(pageId) {
  const cacheKey = 'blocks_' + pageId;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const notion = getClient();
    const blocks = [];
    let cursor;

    // Paginate through all blocks
    do {
      const response = await withRetry(() => notion.blocks.children.list({
        block_id: pageId,
        page_size: 100,
        start_cursor: cursor,
      }));
      blocks.push(...response.results);
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Recursively fetch nested content (toggles, columns, etc.)
    const enrichedBlocks = await fetchBlockChildren(blocks);
    const markdown = blocksToMarkdown(enrichedBlocks);
    const result = { blocks: blocks.length, markdown };

    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error('Failed to get blocks for ' + pageId + ':', err.message);
    return { blocks: 0, markdown: '' };
  }
}

/**
 * Recursively fetch children for blocks that have them (toggles, columns, etc.)
 * Limited to 2 levels deep to avoid excessive API calls.
 */
const EXPANDABLE_BLOCK_TYPES = new Set([
  'toggle', 'column_list', 'column', 'bulleted_list_item',
  'numbered_list_item', 'to_do', 'callout', 'quote', 'synced_block',
]);

async function fetchBlockChildren(blocks, depth = 0) {
  if (depth >= 2) return blocks; // Max recursion depth

  const notion = getClient();

  // Fetch all expandable blocks' children in parallel
  const expandableBlocks = blocks.filter(
    b => b.has_children && EXPANDABLE_BLOCK_TYPES.has(b.type)
  );

  await Promise.all(expandableBlocks.map(async (block) => {
    try {
      const children = [];
      let cursor;
      do {
        const response = await withRetry(() => notion.blocks.children.list({
          block_id: block.id,
          page_size: 100,
          start_cursor: cursor,
        }));
        children.push(...response.results);
        cursor = response.has_more ? response.next_cursor : null;
      } while (cursor);

      block._children = await fetchBlockChildren(children, depth + 1);
    } catch (err) {
      console.warn(`Failed to fetch children for block ${block.id}:`, err.message);
    }
  }));

  return blocks;
}

/**
 * Convert Notion blocks to markdown
 */
function blocksToMarkdown(blocks) {
  const lines = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
        lines.push(richTextToPlain(block.paragraph.rich_text));
        lines.push('');
        break;
      case 'heading_1':
        lines.push('# ' + richTextToPlain(block.heading_1.rich_text));
        lines.push('');
        break;
      case 'heading_2':
        lines.push('## ' + richTextToPlain(block.heading_2.rich_text));
        lines.push('');
        break;
      case 'heading_3':
        lines.push('### ' + richTextToPlain(block.heading_3.rich_text));
        lines.push('');
        break;
      case 'bulleted_list_item':
        lines.push('- ' + richTextToPlain(block.bulleted_list_item.rich_text));
        if (block._children) {
          const childMd = blocksToMarkdown(block._children);
          lines.push(childMd.split('\n').map(l => '  ' + l).join('\n'));
        }
        break;
      case 'numbered_list_item':
        lines.push('1. ' + richTextToPlain(block.numbered_list_item.rich_text));
        if (block._children) {
          const childMd = blocksToMarkdown(block._children);
          lines.push(childMd.split('\n').map(l => '  ' + l).join('\n'));
        }
        break;
      case 'to_do':
        lines.push('- [' + (block.to_do.checked ? 'x' : ' ') + '] ' + richTextToPlain(block.to_do.rich_text));
        if (block._children) {
          const childMd = blocksToMarkdown(block._children);
          lines.push(childMd.split('\n').map(l => '  ' + l).join('\n'));
        }
        break;
      case 'toggle': {
        const toggleContent = block._children ? blocksToMarkdown(block._children) : '';
        lines.push('<details><summary>' + richTextToPlain(block.toggle.rich_text) + '</summary>');
        if (toggleContent) {
          lines.push('');
          lines.push(toggleContent);
        }
        lines.push('</details>');
        lines.push('');
        break;
      }
      case 'code':
        lines.push('```' + (block.code.language || ''));
        lines.push(richTextToPlain(block.code.rich_text));
        lines.push('```');
        lines.push('');
        break;
      case 'quote':
        lines.push('> ' + richTextToPlain(block.quote.rich_text));
        if (block._children) {
          const childMd = blocksToMarkdown(block._children);
          lines.push(childMd.split('\n').map(l => '> ' + l).join('\n'));
        }
        lines.push('');
        break;
      case 'callout':
        lines.push('> ' + (block.callout.icon?.emoji || '') + ' ' + richTextToPlain(block.callout.rich_text));
        if (block._children) {
          const childMd = blocksToMarkdown(block._children);
          lines.push(childMd.split('\n').map(l => '> ' + l).join('\n'));
        }
        lines.push('');
        break;
      case 'divider':
        lines.push('---');
        lines.push('');
        break;
      case 'table_of_contents':
        lines.push('*[Table of Contents]*');
        lines.push('');
        break;
      case 'bookmark':
        lines.push('[Bookmark](' + (block.bookmark.url || '') + ')');
        lines.push('');
        break;
      case 'image': {
        const imgUrl = block.image.type === 'file' ? block.image.file.url : block.image.external?.url || '';
        lines.push('![Image](' + imgUrl + ')');
        lines.push('');
        break;
      }
      case 'child_database':
        lines.push('**[Database: ' + block.child_database.title + ']**');
        lines.push('');
        break;
      case 'child_page':
        lines.push('**[Page: ' + block.child_page.title + ']**');
        lines.push('');
        break;
      case 'column_list':
        // Render columns as sequential content in markdown
        if (block._children) {
          for (const col of block._children) {
            if (col._children) {
              lines.push(blocksToMarkdown(col._children));
              lines.push('');
            }
          }
        }
        break;
      case 'column':
        // Individual columns are rendered via their column_list parent
        break;
      default:
        // Unknown block type -- show type name
        if (block[block.type]?.rich_text) {
          lines.push(richTextToPlain(block[block.type].rich_text));
          lines.push('');
        }
    }
  }

  return lines.join('\n').trim();
}

/**
 * Convert rich_text array to plain text with basic formatting
 */
function richTextToPlain(richText) {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map(t => {
    let text = t.plain_text;
    if (t.annotations?.bold) text = '**' + text + '**';
    if (t.annotations?.italic) text = '*' + text + '*';
    if (t.annotations?.code) text = '`' + text + '`';
    if (t.annotations?.strikethrough) text = '~~' + text + '~~';
    if (t.href) text = '[' + text + '](' + t.href + ')';
    return text;
  }).join('');
}

/**
 * Get related pages for a given page (resolve relation properties)
 */
async function getRelatedPages(pageId) {
  const cacheKey = 'related_' + pageId;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const notion = getClient();
    const rawPage = await withRetry(() => notion.pages.retrieve({ page_id: pageId }));
    const related = {};

    for (const [key, prop] of Object.entries(rawPage.properties)) {
      if (prop.type === 'relation' && prop.relation.length > 0) {
        const relatedIds = prop.relation.map(r => r.id).slice(0, 10);

        const resolvedPages = await Promise.all(
          relatedIds.map(async (relId) => {
            try {
              const relPage = await getPageRaw(relId);
              if (!relPage) return null;
              return {
                id: relId,
                name: relPage.properties.Name || relPage.properties.Title || relPage.properties.name || 'Untitled',
                status: relPage.properties.Status || null,
                health: relPage.properties.Health || null,
                priority: relPage.properties.Priority || null,
                dueDate: relPage.properties['Due Date'] || null,
              };
            } catch {
              return { id: relId, name: 'Untitled', status: null };
            }
          })
        );

        related[key] = resolvedPages.filter(Boolean);
      }
    }

    setCache(cacheKey, related);
    return related;
  } catch (err) {
    console.error('Failed to get related pages for ' + pageId + ':', err.message);
    return {};
  }
}

module.exports = {
  getPageRaw,
  getPageContent,
  fetchBlockChildren,
  blocksToMarkdown,
  richTextToPlain,
  EXPANDABLE_BLOCK_TYPES,
  getRelatedPages,
};
