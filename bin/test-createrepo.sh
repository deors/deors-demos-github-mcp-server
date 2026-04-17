#!/usr/bin/env bash
#
# Calls the createRepo function directly (no MCP server needed).
#
# Usage:
#   ./bin/test-createrepo-direct.sh <name> <description> [isPrivate] [org] [teamName] [appId]
#
# Prerequisites:
#   - GITHUB_TOKEN environment variable must be set
#   - npm install must have been run
#
# Examples:
#   ./bin/test-createrepo-direct.sh my-new-repo "A test repository"
#   ./bin/test-createrepo-direct.sh my-new-repo "A test repository" true my-org my-team app-123
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "==> Building TypeScript..."
npm run build --silent

echo "==> Running test-createrepo..."
echo ""
node dist/test-createrepo.js "$@"
