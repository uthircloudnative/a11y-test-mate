#!/bin/bash

echo "🔍 Checking BrowserStack MCP Server Status..."
echo ""

# Check if the process is running
if pgrep -f "browserstack-mcp-server" > /dev/null; then
    echo "✅ BrowserStack MCP server process is running"
    echo "📊 Process details:"
    ps aux | grep "browserstack-mcp-server" | grep -v grep
    echo ""
else
    echo "❌ BrowserStack MCP server process is NOT running"
    echo ""
fi

# Check if port 4545 is listening
if lsof -i :4545 > /dev/null 2>&1; then
    echo "✅ Port 4545 is listening"
    echo "📊 Port details:"
    lsof -i :4545
    echo ""
else
    echo "❌ Port 4545 is NOT listening"
    echo ""
fi

# Try to connect to the WebSocket endpoint
echo "🌐 Testing WebSocket connection to ws://localhost:4545/playwright..."
if command -v curl > /dev/null; then
    # Try to connect with curl (will fail for WebSocket but gives us connection info)
    curl_output=$(curl -s -I -m 5 http://localhost:4545 2>&1)
    if [[ $? -eq 0 ]] || [[ $curl_output == *"Connection refused"* ]]; then
        if [[ $curl_output == *"Connection refused"* ]]; then
            echo "❌ Cannot connect to localhost:4545 - server may not be running"
        else
            echo "✅ Server is responding on localhost:4545"
        fi
    else
        echo "❌ Connection test failed"
    fi
else
    echo "ℹ️  Install curl for connection testing"
fi

echo ""
echo "📝 To start the server: npm run start-browserstack"
echo "📝 To stop the server: pkill -f browserstack-mcp-server"
