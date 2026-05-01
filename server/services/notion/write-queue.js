'use strict';
// write-queue.js — Rate-limited write queue for Notion API writes.
// Public exports: enqueueWrite, processWriteQueue, WRITE_SPACING_MS
// DO NOT add: cache logic, client init, retry logic, domain reads.
// Module-private: writeQueue array and writeProcessing flag.
// Spaces write operations to avoid Notion 429 rate limits.

const WRITE_SPACING_MS = 350;

const writeQueue = [];
let writeProcessing = false;

async function enqueueWrite(writeFn) {
  return new Promise((resolve, reject) => {
    writeQueue.push({ fn: writeFn, resolve, reject });
    processWriteQueue();
  });
}

async function processWriteQueue() {
  if (writeProcessing || writeQueue.length === 0) return;
  writeProcessing = true;
  while (writeQueue.length > 0) {
    const { fn, resolve, reject } = writeQueue.shift();
    try {
      const result = await fn();
      resolve(result);
    } catch (err) {
      reject(err);
    }
    if (writeQueue.length > 0) {
      await new Promise(r => setTimeout(r, WRITE_SPACING_MS));
    }
  }
  writeProcessing = false;
}

module.exports = { enqueueWrite, processWriteQueue, WRITE_SPACING_MS };
