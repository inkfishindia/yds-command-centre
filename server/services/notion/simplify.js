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
      case 'formula': {
        // Formula returns typed sub-object: {type: 'number'|'string'|'boolean'|'date', …}
        const f = prop.formula;
        if (!f) { result[key] = null; break; }
        if (f.type === 'number') result[key] = f.number;
        else if (f.type === 'string') result[key] = f.string;
        else if (f.type === 'boolean') result[key] = f.boolean;
        else if (f.type === 'date') result[key] = f.date ? f.date.start : null;
        else result[key] = null;
        break;
      }
      case 'rollup': {
        // Rollup wraps another type — return the inner value for the common single-item case.
        // array rollups: return array of simplified inner values.
        const r = prop.rollup;
        if (!r) { result[key] = null; break; }
        if (r.type === 'number') { result[key] = r.number; break; }
        if (r.type === 'date') { result[key] = r.date ? r.date.start : null; break; }
        if (r.type === 'array') {
          result[key] = (r.array || []).map(inner => {
            if (inner.type === 'select') return inner.select ? inner.select.name : null;
            if (inner.type === 'multi_select') return inner.multi_select.map(s => s.name);
            if (inner.type === 'rich_text') return inner.rich_text.map(t => t.plain_text).join('');
            if (inner.type === 'title') return inner.title.map(t => t.plain_text).join('');
            if (inner.type === 'number') return inner.number;
            if (inner.type === 'checkbox') return inner.checkbox;
            return null;
          });
          break;
        }
        result[key] = null;
        break;
      }
      case 'last_edited_time':
        result[key] = prop.last_edited_time || null;
        break;
      case 'created_time':
        result[key] = prop.created_time || null;
        break;
      default:
        result[key] = '[' + prop.type + ']';
    }
  }
  return result;
}

module.exports = { simplify };
