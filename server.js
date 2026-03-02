const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./server/config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/chat', require('./server/routes/chat'));
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

// SPA fallback — serve index.html for non-API routes
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
