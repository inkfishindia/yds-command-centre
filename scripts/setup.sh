#!/bin/bash
# YDS Command Centre — First-time setup
set -e

echo "=== YDS Command Centre Setup ==="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is not installed. Install v18+ from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "ERROR: Node.js v18+ required. Current: $(node -v)"
  exit 1
fi
echo "Node.js $(node -v) — OK"

# Check if .env exists
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo ""
    echo "Created .env from .env.example"
    echo "  → Edit .env and add your API keys:"
    echo "    ANTHROPIC_API_KEY=sk-ant-..."
    echo "    NOTION_TOKEN=ntn_..."
    echo ""
  else
    echo "ERROR: No .env.example found"
    exit 1
  fi
else
  echo ".env exists — OK"
fi

# Check Colin's workspace
COLIN_WS=$(grep COLIN_WORKSPACE .env | cut -d'=' -f2 | xargs)
if [ -z "$COLIN_WS" ]; then
  COLIN_WS="../dan"
fi

if [ -f "$COLIN_WS/CLAUDE.md" ]; then
  echo "Colin's workspace at $COLIN_WS — OK"
else
  echo ""
  echo "WARNING: Colin's workspace not found at $COLIN_WS"
  echo "  → Set COLIN_WORKSPACE in .env to the correct path"
  echo "  → The app needs access to CLAUDE.md, skills, and output dirs"
  echo ""
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "=== Setup complete ==="
echo ""
echo "Start the server:"
echo "  npm start        # Production"
echo "  npm run dev      # Development (auto-restart)"
echo ""
echo "Open http://localhost:3000"
