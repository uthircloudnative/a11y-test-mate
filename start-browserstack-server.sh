#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Set BrowserStack credentials
export BROWSERSTACK_USERNAME=uthirarajsaminat_zCpR2K
export BROWSERSTACK_ACCESS_KEY=${BROWSERSTACK_ACCESS_KEY:-"your_access_key_here"}

# Start BrowserStack MCP server
echo "🚀 Starting BrowserStack MCP server on port 4545..."
echo "📝 Username: $BROWSERSTACK_USERNAME"
echo "🔑 Access Key: ${BROWSERSTACK_ACCESS_KEY:0:10}..."
echo "🌐 Server will be available at: ws://localhost:4545/playwright"
echo "⏳ Starting server..."
echo ""

browserstack-mcp-server --port 4545 --host localhost
