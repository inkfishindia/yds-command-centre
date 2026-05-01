'use strict';

/**
 * daily-sales/cache.js — in-memory LRU+TTL dashboard cache.
 *
 * Public exports: buildCacheKey, getCached, setCache, clearCache.
 * Internal state: _cacheMap (Map), CACHE_TTL_MS, MAX_CACHE_ENTRIES constants.
 *
 * DO NOT add: business logic, payload shaping, or service imports.
 * This module knows only about (key → payload) pairs and TTL semantics.
 */

const { DEFAULT_FILTER_SPEC } = require('./filters');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 50;

// Map preserves insertion order — used for LRU eviction (oldest key first).
// Shape: key → { data, ts }
const _cacheMap = new Map();

/**
 * Build a simple cache key from filterSpec + date bucket.
 * Default (no filter) always maps to 'default'.
 * @param {Object|null} filterSpec
 * @param {number|null} nowMs
 * @returns {string}
 */
function buildCacheKey(filterSpec, nowMs) {
  if (!filterSpec || filterSpec === DEFAULT_FILTER_SPEC) {
    // Use a 5-minute bucket so cache expires naturally
    const bucket = Math.floor((nowMs || Date.now()) / CACHE_TTL_MS);
    return `default:${bucket}`;
  }
  // For filtered calls, serialize the spec as the key
  const spec = JSON.stringify(filterSpec);
  const bucket = Math.floor((nowMs || Date.now()) / CACHE_TTL_MS);
  return `filtered:${spec}:${bucket}`;
}

/**
 * Return cached payload for key, or null if missing/expired.
 * LRU touch: re-inserts the entry to move it to end of map.
 * @param {string} key
 * @returns {Object|null}
 */
function getCached(key) {
  const entry = _cacheMap.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    _cacheMap.delete(key);
    return null;
  }
  // LRU touch on read: re-insert to move to end
  _cacheMap.delete(key);
  _cacheMap.set(key, entry);
  return entry.data;
}

/**
 * Store payload under key. Evicts oldest entry if at capacity.
 * @param {string} key
 * @param {Object} data
 */
function setCache(key, data) {
  // If at capacity and adding a new key, evict the oldest entry first
  if (_cacheMap.size >= MAX_CACHE_ENTRIES && !_cacheMap.has(key)) {
    const oldest = _cacheMap.keys().next().value;
    _cacheMap.delete(oldest);
  }
  // Re-insert to move to end (LRU touch on write)
  _cacheMap.delete(key);
  _cacheMap.set(key, { data, ts: Date.now() });
}

/** Clear the entire cache (used in tests and manual invalidation). */
function clearCache() {
  _cacheMap.clear();
}

module.exports = {
  buildCacheKey,
  getCached,
  setCache,
  clearCache,
};
