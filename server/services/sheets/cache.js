'use strict';

// cache.js — in-memory sheet cache (5-min TTL) + header cache (60-min TTL)
// Owns: cache Map, getCached, setCache, clearCache, CACHE_TTL, HEADER_CACHE_TTL
//   Both the main sheet cache and the header cache share the single Map;
//   header entries use the key prefix "headers_" (existing behavior).
// Depends on: nothing (leaf)
// DO NOT add: client init, registry, domain logic, tab-meta cache (tab-meta.js owns that)

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const HEADER_CACHE_TTL = 60 * 60 * 1000; // 60 minutes

const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache() {
  cache.clear();
}

module.exports = { cache, getCached, setCache, clearCache, CACHE_TTL, HEADER_CACHE_TTL };
