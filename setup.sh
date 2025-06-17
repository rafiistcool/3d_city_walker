#!/bin/bash
# Setup script for Codex environment
set -e

# Install Node.js dependencies
if [ -f package.json ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build the project to verify everything works
if npm run | grep -q "build"; then
  echo "Running build..."
  npm run build
fi

