'use strict';

const { afterEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const AUTH_GATE_PATH = path.join(__dirname, '../server/middleware/auth-gate.js');

describe('Auth Gate', () => {
  afterEach(() => {
    delete process.env.ACCESS_PASSWORD;
    delete process.env.VERCEL_ENV;
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

  it('bypasses auth on Vercel preview deployments', () => {
    process.env.ACCESS_PASSWORD = 'secret';
    process.env.VERCEL_ENV = 'preview';
    const { authGate } = require(AUTH_GATE_PATH);
    let nextCalled = false;

    authGate({
      method: 'GET',
      path: '/',
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

  it('keeps auth enabled on Vercel production deployments', () => {
    process.env.ACCESS_PASSWORD = 'secret';
    process.env.VERCEL_ENV = 'production';
    const { authGate } = require(AUTH_GATE_PATH);
    let statusCode = null;
    let sentBody = null;

    authGate({
      method: 'GET',
      path: '/',
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
      throw new Error('Expected auth gate to block unauthenticated production request');
    });

    assert.equal(statusCode, 401);
    assert.match(String(sentBody || ''), /YDS Command Centre/);
  });

  it('accepts a legacy raw auth cookie value', () => {
    process.env.ACCESS_PASSWORD = 'secret%2Fvalue';
    const { authGate } = require(AUTH_GATE_PATH);
    let nextCalled = false;

    authGate({
      method: 'GET',
      path: '/',
      headers: {
        cookie: 'yds_cc_auth=secret%2Fvalue',
      },
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

  it('accepts a URL-encoded auth cookie value', () => {
    process.env.ACCESS_PASSWORD = 'secret/value';
    const { authGate } = require(AUTH_GATE_PATH);
    let nextCalled = false;

    authGate({
      method: 'GET',
      path: '/',
      headers: {
        cookie: 'yds_cc_auth=secret%2Fvalue',
      },
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
