#!/bin/bash

# SceneGen Quick Start Script

echo "🎸 SceneGen Local Development Setup 🎸"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js detected: $(node --version)"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
    echo "✅ pnpm installed successfully"
else
    echo "✅ pnpm detected: $(pnpm --version)"
fi

echo ""
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🔧 Checking environment variables..."
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found!"
    echo "   Please ensure .env.local exists with all required variables."
    exit 1
fi
echo "✅ .env.local found"

echo ""
echo "======================================"
echo "✨ Setup complete! ✨"
echo ""
echo "To start the development server, run:"
echo ""
echo "    pnpm dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo "======================================"
