const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./server/config');

const app = express();

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Alpine.js requires inline eval via x-data attributes
}));
app.use(express.json({ limit: '1mb' }));

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
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start
app.listen(config.PORT, () => {
  console.log(`\n  YDS Command Centre running at http://localhost:${config.PORT}\n`);
  if (!config.ANTHROPIC_API_KEY) {
    console.log('  WARNING: ANTHROPIC_API_KEY not set — chat will not work');
  }
  if (!config.NOTION_TOKEN) {
    console.log('  WARNING: NOTION_TOKEN not set — dashboard will show empty data');
  }
  console.log('');
});
