#!/usr/bin/env bash
# Provision BU in backend DB (upsert public.business_units + create schema/tables).
#
# Usage:
#   ./scripts/provision-bu.sh test
#   BU=test ./scripts/provision-bu.sh
#   API_BASE=https://kb-carmen.onrender.com ADMIN_KEY=xxx ./scripts/provision-bu.sh test

set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8080}"
BU="${1:-${BU:-}}"
ADMIN_KEY="${ADMIN_KEY:-${ADMIN_API_KEY:-}}"
BU_NAME="${BU_NAME:-}"
BU_DESCRIPTION="${BU_DESCRIPTION:-}"

if [[ -z "${BU}" ]]; then
  echo "ERROR: missing BU slug."
  echo "Usage: ./scripts/provision-bu.sh <bu-slug>"
  exit 1
fi

if [[ -z "${ADMIN_KEY}" ]]; then
  echo "ERROR: missing ADMIN_KEY (or ADMIN_API_KEY) env var."
  exit 1
fi

if [[ -z "${BU_NAME}" ]]; then
  BU_NAME="$(echo "${BU}" | tr '[:lower:]' '[:upper:]')"
fi

echo "==> POST ${API_BASE}/api/business-units/provision (slug=${BU})"
curl -sS -f -X POST "${API_BASE}/api/business-units/provision" \
  -H "X-Admin-Key: ${ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  --data "$(cat <<EOF
{"slug":"${BU}","name":"${BU_NAME}","description":"${BU_DESCRIPTION}"}
EOF
)"
echo ""
echo "Done."
