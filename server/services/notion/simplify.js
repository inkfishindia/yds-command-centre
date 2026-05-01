'use strict';
// simplify.js — Flatten Notion property objects to plain JS values.
// Public exports: simplify()
// DO NOT add: cache logic, client init, retry logic, domain reads or writes.
// Pure function — no external deps. Single canonical implementation for the entire server.

/**
 * Simplify Notion properties to plain values.
 * Handles all common property types including people, url, and rich date objects.
 * This is the single canonical implementation used across the entire server.
 */
function simplify(properties) {
  const result = {};
  for (const [key, prop] of Object.entries(properties)) {
    switch (prop.type) {
      case 'title':
        result[key] = prop.title.map(t => t.plain_text).join('');
        break;
      case 'rich_text':
        result[key] = prop.rich_text.map(t => t.plain_text).join('');
        break;
      case 'select':
        result[key] = prop.select ? prop.select.name : null;
        break;
      case 'multi_select':
        result[key] = prop.multi_select.map(s => s.name);
        break;
      case 'date':
        result[key] = prop.date ? { start: prop.date.start, end: prop.date.end } : null;
        break;
      case 'relation':
        result[key] = prop.relation.map(r => r.id);
        break;
      case 'people':
        result[key] = prop.people.map(p => p.name || p.id);
        break;
      case 'status':
        result[key] = prop.status ? prop.status.name : null;
        break;
      case 'number':
        result[key] = prop.number;
        break;
      case 'checkbox':
        result[key] = prop.checkbox;
        break;
      case 'url':
        result[key] = prop.url;
        break;
      default:
        result[key] = '[' + prop.type + ']';
    }
  }
  return result;
}

module.exports = { simplify };
