'use strict';
// cache-invalidation.js — Selective cache invalidation for commitment-related keys.
// Public exports: invalidateCommitmentCaches
// DO NOT add: cache data structures (owned by cache.js), domain reads, write queue.
// Imports the cache Map directly from cache.js — single internal consumer of Map iteration.

const { cache } = require('./cache');

/**
 * Selectively invalidate commitment-related cache entries after a write.
 * Avoids a full cache.clear() which would bust unrelated caches (decisions, platforms, etc.)
 */
function invalidateCommitmentCaches() {
  for (const key of cache.keys()) {
    if (
      key.startsWith('commitments_') ||
      key.startsWith('all_commitments') ||
      key.startsWith('kanban_commitments') ||
      key.startsWith('recently_completed_') ||
      key === 'projects' ||
      key.startsWith('page_') ||
      key.includes('dashboard')
    ) {
      cache.delete(key);
    }
  }
}

module.exports = { invalidateCommitmentCaches };
