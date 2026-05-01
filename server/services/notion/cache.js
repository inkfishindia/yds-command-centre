'use strict';
// cache.js — Stale-while-revalidate cache + in-flight deduplication.
// Public exports: cache (Map, internal — for cache-invalidation.js only), inFlight (Map, internal),
//   getCacheEntry, getCached, setCache, setCachedWithTime, deduplicatedFetch, stableStringify,
//   clearCache, getCachedWithTTL,
//   CACHE_TTL, CACHE_HARD_EXPIRY, DASHBOARD_CACHE_KEY, DASHBOARD_CACHE_TTL.
// DO NOT add: client init, retry logic, domain reads, write queue.

// Stale-while-revalidate cache
// Fresh window  (0 – CACHE_TTL):             return immediately, no background fetch
// Stale window  (CACHE_TTL – CACHE_HARD_EXPIRY): return stale immediately + trigger background refresh
// Expired       (> CACHE_HARD_EXPIRY):       treat as cold start — blocking fetch
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;          // 5 min — stale threshold
const CACHE_HARD_EXPIRY = 15 * 60 * 1000; // 15 min — absolute expiry
const DASHBOARD_CACHE_KEY = 'dashboard_summary_v1';
const DASHBOARD_CACHE_TTL = 60 * 1000;

// In-flight request deduplication — prevents duplicate Notion API calls for the same cache key
const inFlight = new Map();

/**
 * Returns the raw cache entry so callers can inspect age themselves.
 * Returns null if no entry exists at all.
 */
function getCacheEntry(key) {
  return cache.get(key) || null;
}

/**
 * Returns cached data if it is still within the fresh window (< CACHE_TTL).
 * Returns null if absent, stale, or hard-expired.
 * Side-effect: deletes hard-expired entries.
 */
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  const age = Date.now() - entry.time;
  if (age < CACHE_TTL) return entry.data;
  if (age >= CACHE_HARD_EXPIRY) cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
}

function setCachedWithTime(key, data, time = Date.now()) {
  cache.set(key, { data, time });
}

/**
 * Returns cached data if within a custom TTL window.
 * Useful for callers (e.g. getDashboardSummary) that need a different TTL
 * than the standard CACHE_TTL without raw Map access.
 * Returns null if absent or older than ttl.
 */
function getCachedWithTTL(key, ttl) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time < ttl) return entry.data;
  return null;
}

/**
 * Stable JSON stringification — sorts object keys recursively so that
 * {a:1, b:2} and {b:2, a:1} produce identical strings, giving consistent cache keys.
 */
function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

/**
 * Stale-while-revalidate fetch with in-flight deduplication.
 *
 * - Fresh hit  (age < CACHE_TTL):           returns cached data, no network call
 * - Stale hit  (CACHE_TTL <= age < HARD):   returns stale data immediately;
 *                                            fires a background refresh if none in-flight
 * - Cold start (no entry or age >= HARD):   blocking fetch, result is cached
 */
function deduplicatedFetch(cacheKey, fetchFn) {
  const entry = getCacheEntry(cacheKey);

  if (entry) {
    const age = Date.now() - entry.time;

    // Fresh — return immediately
    if (age < CACHE_TTL) return Promise.resolve(entry.data);

    // Stale but within hard expiry — return stale, kick off background refresh
    if (age < CACHE_HARD_EXPIRY) {
      if (!inFlight.has(cacheKey)) {
        const fetchStartedAt = Date.now();
        const bg = fetchFn()
          .then(result => {
            // Only overwrite cache if no fresher write has landed since we started
            const current = cache.get(cacheKey);
            if (!current || current.time <= fetchStartedAt) {
              setCache(cacheKey, result);
            }
            return result;
          })
          .catch(err => {
            console.warn(`[notion-cache] Background refresh failed for "${cacheKey}":`, err.message || err);
          })
          .finally(() => {
            inFlight.delete(cacheKey);
          });
        inFlight.set(cacheKey, bg);
      }
      return Promise.resolve(entry.data);
    }

    // Hard-expired — fall through to blocking fetch (entry deleted in getCached)
    cache.delete(cacheKey);
  }

  // Cold start or hard-expired — join existing in-flight or start a new blocking fetch
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const promise = fetchFn()
    .then(result => {
      setCache(cacheKey, result);
      return result;
    })
    .finally(() => {
      inFlight.delete(cacheKey);
    });

  inFlight.set(cacheKey, promise);
  return promise;
}

function clearCache() {
  cache.clear();
}

module.exports = {
  cache,
  inFlight,
  getCacheEntry,
  getCached,
  setCache,
  setCachedWithTime,
  getCachedWithTTL,
  stableStringify,
  deduplicatedFetch,
  clearCache,
  CACHE_TTL,
  CACHE_HARD_EXPIRY,
  DASHBOARD_CACHE_KEY,
  DASHBOARD_CACHE_TTL,
};
