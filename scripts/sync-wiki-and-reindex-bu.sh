#!/usr/bin/env bash
# Sync wiki repo + trigger reindex for selected BU.
#
# Usage:
#   ./scripts/sync-wiki-and-reindex-bu.sh blueledgers
#   BU=blueledgers ./scripts/sync-wiki-and-reindex-bu.sh
#   ADMIN_KEY=xxx API_BASE=http://127.0.0.1:8080 ./scripts/sync-wiki-and-reindex-bu.sh blueledgers

set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8080}"
BU="${1:-${BU:-carmen}}"
ADMIN_KEY="${ADMIN_KEY:-${ADMIN_API_KEY:-}}"

if [[ -z "${ADMIN_KEY}" ]]; then
  echo "ERROR: missing ADMIN_KEY (or ADMIN_API_KEY) env var."
  echo "This endpoint requires X-Admin-Key header."
  exit 1
fi

echo "==> POST ${API_BASE}/api/wiki/sync"
curl -sS -f -H "X-Admin-Key: ${ADMIN_KEY}" -X POST "${API_BASE}/api/wiki/sync"
echo ""

echo "==> POST ${API_BASE}/api/index/rebuild?bu=${BU}  (runs in background on backend)"
curl -sS -f -H "X-Admin-Key: ${ADMIN_KEY}" -X POST "${API_BASE}/api/index/rebuild?bu=${BU}"
echo ""

echo "Done. Check backend logs for [index/rebuild] completed (${BU})"
