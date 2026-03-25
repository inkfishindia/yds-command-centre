const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./server/config');

const { authGate, loginRoute } = require('./server/middleware/auth-gate');

const app = express();
const SLOW_REQUEST_THRESHOLD_MS = 250;

// ── CORS whitelist ────────────────────────────────────────────────────────────
// Allow only explicit origins. In dev, defaults to localhost only.
// Add extra origins via ALLOWED_ORIGINS env var (comma-separated).
const allowedOrigins = new Set([
  'http://localhost:3000',
  `http://localhost:${config.PORT}`,
]);
if (process.env.ALLOWED_ORIGINS) {
  for (const origin of process.env.ALLOWED_ORIGINS.split(',')) {
    const trimmed = origin.trim();
    if (trimmed) allowedOrigins.add(trimmed);
  }
}
app.use(cors({
  origin(origin, callback) {
    // Allow same-origin / non-browser requests (origin is undefined for server-to-server)
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin not allowed — ${origin}`));
  },
}));
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

// API routes
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
app.use('/api/overview', require('./server/routes/overview'));
app.use('/api/ops', require('./server/routes/ops'));
app.use('/api/competitor-intel', require('./server/routes/competitor-intel'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasAnthropicKey: !!config.ANTHROPIC_API_KEY,
    hasNotionToken: !!config.NOTION_TOKEN,
    model: config.MODEL,
  });
});

// Static file serving — Alpine.js frontend from public/
// Cache JS/CSS for 1 hour (assets are rebuilt on deploy); HTML always revalidates.
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

app.get('*', (req, res) => {
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
  });
}
