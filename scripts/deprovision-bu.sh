#!/usr/bin/env bash
# Deprovision BU in backend DB (delete business_units row + drop schema).
#
# Usage:
#   ./scripts/deprovision-bu.sh suntest
#   BU=suntest ./scripts/deprovision-bu.sh
#   API_BASE=https://kb-carmen.onrender.com ADMIN_KEY=xxx ./scripts/deprovision-bu.sh suntest

set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8080}"
BU="${1:-${BU:-}}"
ADMIN_KEY="${ADMIN_KEY:-${ADMIN_API_KEY:-}}"

if [[ -z "${BU}" ]]; then
  echo "ERROR: missing BU slug."
  echo "Usage: ./scripts/deprovision-bu.sh <bu-slug>"
  exit 1
fi

if [[ -z "${ADMIN_KEY}" ]]; then
  echo "ERROR: missing ADMIN_KEY (or ADMIN_API_KEY) env var."
  exit 1
fi

echo "==> POST ${API_BASE}/api/business-units/deprovision (slug=${BU})"
curl -sS -f -X POST "${API_BASE}/api/business-units/deprovision" \
  -H "X-Admin-Key: ${ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  --data "{\"slug\":\"${BU}\"}"
echo ""
echo "Done."
