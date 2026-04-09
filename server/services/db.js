'use strict';

const { Pool } = require('pg');
const config = require('../config');

let pool = null;

function isDatabaseEnabled() {
  return Boolean(config.DATABASE_URL);
}

function getPool() {
  if (!isDatabaseEnabled()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: config.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

async function query(text, params) {
  const activePool = getPool();
  if (!activePool) {
    throw new Error('Database is not configured');
  }
  return activePool.query(text, params);
}

async function withTransaction(fn) {
  const activePool = getPool();
  if (!activePool) {
    throw new Error('Database is not configured');
  }

  const client = await activePool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function closePool() {
  if (!pool) return;
  await pool.end();
  pool = null;
}

module.exports = {
  isDatabaseEnabled,
  getPool,
  query,
  withTransaction,
  closePool,
};
