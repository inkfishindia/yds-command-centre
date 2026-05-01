'use strict';
// retry.js — Retry wrapper for transient Notion API errors (429 rate limits, 5xx).
// Public exports: withRetry, MAX_RETRIES, BASE_DELAY_MS
// DO NOT add: cache logic, client init, domain reads or writes.
// No external deps — pure utility.

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function withRetry(fn, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err.status === 429 || err.code === 'rate_limited';
      const isServerError = err.status >= 500;

      if ((isRateLimit || isServerError) && attempt < retries) {
        const retryAfter = err.headers?.['retry-after'];
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`Notion API ${err.status || 'error'}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

module.exports = { withRetry, MAX_RETRIES, BASE_DELAY_MS };
