'use strict';

const { afterEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const AUTH_GATE_PATH = path.join(__dirname, '../server/middleware/auth-gate.js');

describe('Auth Gate', () => {
  afterEach(() => {
    delete process.env.ACCESS_PASSWORD;
    delete require.cache[AUTH_GATE_PATH];
  });

  it('allows GET /api/health/details without auth when password protection is enabled', () => {
    process.env.ACCESS_PASSWORD = 'secret';
    const { authGate } = require(AUTH_GATE_PATH);
    let nextCalled = false;

    authGate({
      method: 'GET',
      path: '/api/health/details',
      headers: {},
    }, {
      status() {
        throw new Error('Did not expect a status response');
      },
      send() {
        throw new Error('Did not expect a login page response');
      },
    }, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  it('keeps POST /api/health/sync behind auth when password protection is enabled', () => {
    process.env.ACCESS_PASSWORD = 'secret';
    const { authGate } = require(AUTH_GATE_PATH);
    let statusCode = null;
    let sentBody = null;

    authGate({
      method: 'POST',
      path: '/api/health/sync',
      headers: {},
    }, {
      status(code) {
        statusCode = code;
        return this;
      },
      send(body) {
        sentBody = body;
      },
    }, () => {
      throw new Error('Expected auth gate to block unauthenticated POST');
    });

    assert.equal(statusCode, 401);
    assert.match(String(sentBody || ''), /YDS Command Centre/);
  });

  it('allows static shell assets without auth when password protection is enabled', () => {
    process.env.ACCESS_PASSWORD = 'secret';
    const { authGate } = require(AUTH_GATE_PATH);
    let nextCalled = false;

    authGate({
      method: 'GET',
      path: '/partials/overview.html',
      headers: {},
    }, {
      status() {
        throw new Error('Did not expect a status response');
      },
      send() {
        throw new Error('Did not expect a login page response');
      },
    }, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });
});
