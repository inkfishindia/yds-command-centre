const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./server/config');
const readModelScheduler = require('./server/services/read-model-scheduler');

const { authGate, loginRoute } = require('./server/middleware/auth-gate');

const app = express();
const SLOW_REQUEST_THRESHOLD_MS = 250;

// ── CORS ─────────────────────────────────────────────────────────────────────
// App serves its own frontend — allow same-origin. Password gate protects access.
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Alpine.js requires inline eval via x-data attributes
}));
app.use(compression({ filter: (req, res) => {
  // Don't compress SSE streams — they need to flush immediately
  if (req.headers.accept === 'text/event-stream') return false;
  return compression.filter(req, res);
}}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.use('/api', (req, res, next) => {
  if (req.method !== 'GET') return next();

  const requestPath = req.path || '';
  const shortCachePaths = [
    '/read-models',
    '/overview',
    '/ceo-dashboard',
    '/notion/dashboard',
    '/notion/action-queue',
    '/notion/morning-brief',
    '/sheets/pipeline',
    '/crm',
    '/ops',
    '/marketing-ops',
    '/tech-team',
    '/google-ads',
    '/factory',
    '/bmc',
  ];
  const mediumCachePaths = [
    '/skills',
    '/notebooks',
  ];

  if (requestPath.startsWith('/chat') || requestPath.startsWith('/health')) {
    res.setHeader('Cache-Control', 'no-store');
    return next();
  }

  if (shortCachePaths.some((prefix) => requestPath === prefix || requestPath.startsWith(`${prefix}/`))) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    return next();
  }

  if (mediumCachePaths.some((prefix) => requestPath === prefix || requestPath.startsWith(`${prefix}/`))) {
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    return next();
  }

  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Password gate — enabled when ACCESS_PASSWORD env var is set
app.post('/login', loginRoute);
app.use(authGate);

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  const originalEnd = res.end;

  res.end = function patchedEnd(...args) {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    if (!res.headersSent) {
      res.setHeader('Server-Timing', `app;dur=${durationMs.toFixed(1)}`);
    }
    return originalEnd.apply(this, args);
  };

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    if (!req.path.startsWith('/api/')) return;

    if (durationMs >= SLOW_REQUEST_THRESHOLD_MS) {
      console.log(`[perf] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`);
    }
  });

  next();
});

// Rate limit the chat endpoint (each call hits Claude API)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests. Please wait before sending another message.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit login to prevent brute force
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// API routes
app.use('/login', loginLimiter);
app.use('/api/chat', chatLimiter, require('./server/routes/chat'));
app.use('/api/skills', require('./server/routes/skills'));
app.use('/api/notion', require('./server/routes/notion'));
app.use('/api/documents', require('./server/routes/documents'));
app.use('/api/commitments', require('./server/routes/commitments'));
app.use('/api/decisions', require('./server/routes/decisions'));
app.use('/api/factory', require('./server/routes/factory'));
app.use('/api/sheets', require('./server/routes/sheets'));
app.use('/api/registry', require('./server/routes/registry'));
app.use('/api/notebooks', require('./server/routes/notebooks'));
app.use('/api/marketing-ops', require('./server/routes/marketing-ops'));
app.use('/api/tech-team', require('./server/routes/tech-team'));
app.use('/api/ai-team', require('./server/routes/ai-team'));
app.use('/api/bmc', require('./server/routes/bmc'));
app.use('/api/crm', require('./server/routes/crm'));
app.use('/api/d2c', require('./server/routes/d2c'));
app.use('/api/overview', require('./server/routes/overview'));
app.use('/api/ops', require('./server/routes/ops'));
app.use('/api/read-models', require('./server/routes/read-models'));
app.use('/api/competitor-intel', require('./server/routes/competitor-intel'));
app.use('/api/ceo-dashboard', require('./server/routes/ceo-dashboard'));
app.use('/api/health', require('./server/routes/health'));
app.use('/api/system-map', require('./server/routes/system-map'));
app.use('/api/dan-colin', require('./server/routes/dan-colin'));
app.use('/api/activity-feed', require('./server/routes/activity-feed'));
app.use('/api/daily-sales', require('./server/routes/daily-sales'));
app.use('/api/google-ads', require('./server/routes/google-ads'));

// Static file serving — Alpine.js frontend from public/
// Cache JS/CSS for 1 hour (assets are rebuilt on deploy); HTML always revalidates.
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    const isHashedChunk = /\/public\/js\/chunks\/.+-[A-Z0-9]{8}\.js$/i.test(normalized);

    if (normalized.endsWith('/public/js/app.js')) {
      // The app shell points at lazy chunks whose names change on every deploy.
      // Force revalidation so browsers do not keep an old shell after a new deploy.
      res.setHeader('Cache-Control', 'no-cache');
    } else if (normalized.endsWith('.css')) {
      // CSS filenames are stable across deploys, so avoid stale UI after release.
      res.setHeader('Cache-Control', 'no-cache');
    } else if (isHashedChunk) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (normalized.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

app.get(['/ceo', '/ceo/*'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ceo', 'index.html'));
});

app.get('*', (req, res) => {
  if (req.hostname && req.hostname.startsWith('ceo.')) {
    res.sendFile(path.join(__dirname, 'public', 'ceo', 'index.html'));
    return;
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Vercel uses module.exports; local dev uses app.listen()
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(config.PORT, () => {
    console.log(`\n  YDS Command Centre running at http://localhost:${config.PORT}\n`);
    if (!config.ANTHROPIC_API_KEY) {
      console.log('  WARNING: ANTHROPIC_API_KEY not set — chat will not work');
    }
    if (!config.NOTION_TOKEN) {
      console.log('  WARNING: NOTION_TOKEN not set — dashboard will show empty data');
    }
    console.log('');

    // Pre-warm ops sales cache so the 5s aggregation runs at startup, not on first request
    const opsService = require('./server/services/ops-service');
    opsService.warmCaches();

    // Schedule persisted read-model syncs in the background so the dashboard keeps warm snapshots
    const syncSchedule = readModelScheduler.startScheduler();
    if (syncSchedule.enabled) {
      console.log(`  Read-model sync scheduled every ${Math.round(syncSchedule.intervalMs / 60000)}m (startup delay ${Math.round(syncSchedule.startupDelayMs / 1000)}s)`);
    } else {
      console.log('  Read-model sync scheduler disabled');
    }
  });
}
