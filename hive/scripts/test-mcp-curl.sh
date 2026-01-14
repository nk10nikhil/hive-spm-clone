#!/bin/bash
#
# Quick MCP Server Test using curl
#
# Usage:
#   ADEN_AUTH_TOKEN=your-jwt-token ./scripts/test-mcp-curl.sh
#
# The script tests basic connectivity and endpoints.

set -e

API_URL="${ADEN_API_URL:-http://localhost:3000}"
TOKEN="${ADEN_AUTH_TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "Error: ADEN_AUTH_TOKEN environment variable is required"
  echo "Usage: ADEN_AUTH_TOKEN=your-jwt-token ./scripts/test-mcp-curl.sh"
  exit 1
fi

echo "============================================================"
echo "MCP Server Quick Test"
echo "============================================================"
echo "API URL: $API_URL"
echo ""

# Test 1: Health check
echo "1. Health Check (GET /mcp/health)"
curl -s "$API_URL/mcp/health" | jq .
echo ""

# Test 2: List sessions (should be empty or show existing)
echo "2. List Sessions (GET /mcp/sessions)"
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/mcp/sessions" | jq .
echo ""

# Test 3: Start SSE connection and capture session ID
echo "3. Testing SSE Connection (GET /mcp)"
echo "   Starting connection (will timeout after 2s)..."

# Use timeout to limit the SSE connection
SESSION_ID=$(timeout 2s curl -s -N \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: text/event-stream" \
  "$API_URL/mcp" 2>&1 | head -5 || true)

echo "   Response (first 5 lines):"
echo "$SESSION_ID" | head -5
echo ""

# Test 4: Check sessions again
echo "4. Sessions After Connection (GET /mcp/sessions)"
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/mcp/sessions" | jq .
echo ""

echo "============================================================"
echo "Quick test completed!"
echo ""
echo "For full tool testing, use the TypeScript test client:"
echo "  ADEN_AUTH_TOKEN=\$TOKEN npx ts-node scripts/test-mcp.ts"
echo "============================================================"
