/**
 * Simple password gate for public deployment.
 * Set ACCESS_PASSWORD env var to enable. If not set, gate is disabled (local dev).
 * Uses a session token stored in a signed cookie.
 */
const crypto = require('crypto');

const COOKIE_NAME = 'yds_cc_session';
const LOGIN_PATH = '/login';
const TOKEN_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const PUBLIC_GET_PATHS = new Set([
  '/api/health',
  '/api/health/details',
]);
const PUBLIC_ASSET_PREFIXES = [
  '/css/',
  '/js/',
  '/partials/',
];
const PUBLIC_ASSET_PATHS = [
  '/favicon.ico',
  '/favicon.png',
];

const activeTokens = new Map();

function escapeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function signToken(token) {
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
  hmac.update(token);
  const signature = hmac.digest('hex');
  return `${token}.${signature}`;
}

function verifyToken(signed) {
  if (!signed) return null;
  const parts = signed.split('.');
  if (parts.length !== 2) return null;
  const [token, signature] = parts;
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
  hmac.update(token);
  const expected = hmac.digest('hex');
  if (signature !== expected) return null;
  return token;
}

function authGate(req, res, next) {
  const password = process.env.ACCESS_PASSWORD;

  if (!password) return next();
  if (process.env.VERCEL_ENV === 'preview') return next();

  if (req.path === LOGIN_PATH) return next();

  if ((req.method === 'GET' || req.method === 'HEAD') && (
    PUBLIC_GET_PATHS.has(req.path)
    || PUBLIC_ASSET_PATHS.includes(req.path)
    || PUBLIC_ASSET_PREFIXES.some((prefix) => req.path.startsWith(prefix))
  )) {
    return next();
  }

  const apiKey = process.env.CC_API_KEY;
  if (apiKey && req.headers['x-api-key'] === apiKey) return next();

  if (hasValidSession(req.headers.cookie)) return next();

  res.status(401).send(loginPage());
}

function loginRoute(req, res) {
  const password = process.env.ACCESS_PASSWORD;
  const submitted = req.body && req.body.password;

  if (submitted === password) {
    const token = generateToken();
    activeTokens.set(token, Date.now());

    const signed = signToken(token);
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${signed}; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}`);
    return res.redirect(303, '/');
  }

  res.status(401).send(loginPage('Wrong password'));
}

function hasValidSession(cookieHeader) {
  if (!cookieHeader) return false;

  for (const pair of cookieHeader.split(';')) {
    const [key, ...rest] = pair.split('=');
    if (!key) continue;
    const value = rest.join('=').trim();
    if (key.trim() !== COOKIE_NAME) continue;

    const token = verifyToken(value);
    if (!token) return false;

    if (activeTokens.has(token)) {
      return true;
    }
  }

  return false;
}

function loginPage(error) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>YDS Command Centre</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a0f; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .login-box { width: 340px; padding: 2rem; background: #12121a; border: 1px solid #2a2a3a; border-radius: 12px; }
    h1 { font-size: 1.1rem; margin-bottom: 1.5rem; color: #a78bfa; }
    input { width: 100%; padding: 0.75rem; background: #1a1a2e; border: 1px solid #2a2a3a; border-radius: 8px; color: #e0e0e0; font-size: 1rem; margin-bottom: 1rem; outline: none; }
    input:focus { border-color: #a78bfa; }
    button { width: 100%; padding: 0.75rem; background: #a78bfa; color: #0a0a0f; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
    button:hover { background: #8b5cf6; }
    .error { color: #f87171; font-size: 0.85rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <form class="login-box" method="POST" action="/login">
    <h1>YDS Command Centre</h1>
    ${error ? `<div class="error">${escapeHTML(error)}</div>` : ''}
    <input type="password" name="password" placeholder="Password" autofocus required>
    <button type="submit">Enter</button>
  </form>
</body>
</html>`;
}

function clearExpiredTokens() {
  const now = Date.now();
  const expiry = 30 * 24 * 60 * 60 * 1000;
  for (const [token, created] of activeTokens) {
    if (now - created > expiry) {
      activeTokens.delete(token);
    }
  }
}

setInterval(clearExpiredTokens, 60 * 60 * 1000);

module.exports = { authGate, loginRoute, hasValidAuthCookie: hasValidSession };