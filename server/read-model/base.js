'use strict';

const readModelStore = require('../services/read-model-store');

function buildReadModelResponse({
  data,
  generatedAt = new Date().toISOString(),
  lastSyncedAt = generatedAt,
  stale = false,
  partial = false,
  degradedSources = [],
  sourceFreshness = {},
} = {}) {
  return {
    data,
    meta: {
      generatedAt,
      lastSyncedAt,
      stale,
      partial,
      degradedSources,
      sourceFreshness,
    },
  };
}

async function buildPersistedReadModel(name, builder) {
  try {
    const response = await builder();
    await readModelStore.saveReadModel(name, response);
    await readModelStore.updateSourceHealth(name, response?.meta?.sourceFreshness || {});
    return response;
  } catch (err) {
    const fallback = await readModelStore.loadReadModel(name);
    if (!fallback || !fallback.payload) throw err;

    return {
      ...fallback.payload,
      meta: {
        ...fallback.payload.meta,
        stale: true,
        partial: true,
        degradedSources: [
          ...(fallback.payload.meta?.degradedSources || []),
          'fallback-cache',
        ].filter((value, index, arr) => arr.indexOf(value) === index),
        fallbackPersistedAt: fallback.persistedAt || null,
        fallbackReason: err.message || 'read model build failed',
      },
    };
  }
}

module.exports = {
  buildReadModelResponse,
  buildPersistedReadModel,
};
