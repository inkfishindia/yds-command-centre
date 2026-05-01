'use strict';

// parse-rows.js — row array → object array converter
// Owns: parseRows(rows)
// Depends on: nothing (leaf — pure helper)
// DO NOT add: registry, client, cache, domain logic

/**
 * Parse sheet rows into objects using the header row (row[0]).
 * Lowercases header values and replaces spaces with underscores.
 */
function parseRows(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map(h => h.toLowerCase().trim().replace(/\s+/g, '_'));
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
}

module.exports = { parseRows };
