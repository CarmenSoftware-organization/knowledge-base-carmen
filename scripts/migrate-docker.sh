#!/usr/bin/env bash
# Run SQL migrations via psql inside the db container (recommended).
# Usage (from repo root): ./scripts/migrate-docker.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose --env-file .env.docker)

if [[ ! -f .env.docker ]]; then
  echo "Missing .env.docker — copy from docker-compose.env.example first." >&2
  exit 1
fi

# Read credentials from the running db container (matches POSTGRES_* in compose)
PGUSER="$("${COMPOSE[@]}" exec -T db printenv POSTGRES_USER 2>/dev/null | tr -d '\r')"
PGDATABASE="$("${COMPOSE[@]}" exec -T db printenv POSTGRES_DB 2>/dev/null | tr -d '\r')"
if [[ -z "$PGUSER" || -z "$PGDATABASE" ]]; then
  echo "Could not read POSTGRES_USER / POSTGRES_DB from db container. Is it running?" >&2
  exit 1
fi

migrate() {
  local rel="$1"
  echo "==> $rel"
  "${COMPOSE[@]}" exec -T db psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 < "$ROOT/$rel"
}

migrate backend/migrations/0001_init_documents.sql
migrate backend/migrations/0002_setup_multi_bu.sql
migrate backend/migrations/0003_create_activity_logs.sql
migrate backend/migrations/0004_chat_history.sql
migrate backend/migrations/0005_chat_history_privacy.sql
migrate backend/migrations/0007_create_faq.sql

echo ""
echo "Core migrations finished (1536-dim path)."
echo "Optional: backend/migrations/0006_vector_2000.sql — see backend/migrations/README.md"
echo "Optional: backend/migrations/0008_clear_faq_carmen.sql"
