/**
 * Simple password gate for public deployment.
 * Set ACCESS_PASSWORD env var to enable. If not set, gate is disabled (local dev).
 * Uses a cookie so the user only logs in once per browser session.
 */
const COOKIE_NAME = 'yds_cc_auth';
const LOGIN_PATH = '/login';

function authGate(req, res, next) {
  const password = process.env.ACCESS_PASSWORD;

  // No password configured → gate disabled (local dev)
  if (!password) return next();

  // Allow the login page and its POST
  if (req.path === LOGIN_PATH) return next();

  // Allow health check (useful for Vercel monitoring)
  if (req.path === '/api/health') return next();

  // Check cookie
  const cookies = parseCookies(req.headers.cookie || '');
  if (cookies[COOKIE_NAME] === password) return next();

  // Not authenticated → show login form
  res.status(401).send(loginPage());
}

function loginRoute(req, res) {
  const password = process.env.ACCESS_PASSWORD;
  const submitted = req.body && req.body.password;

  if (submitted === password) {
    // Set cookie — httpOnly, secure in production, 30 day expiry
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${password}; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}`);
    return res.redirect('/');
  }

  res.status(401).send(loginPage('Wrong password'));
}

function parseCookies(cookieHeader) {
  const cookies = {};
  for (const pair of cookieHeader.split(';')) {
    const [key, ...rest] = pair.split('=');
    if (key) cookies[key.trim()] = rest.join('=').trim();
  }
  return cookies;
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
    ${error ? `<div class="error">${error}</div>` : ''}
    <input type="password" name="password" placeholder="Password" autofocus required>
    <button type="submit">Enter</button>
  </form>
</body>
</html>`;
}

module.exports = { authGate, loginRoute };
