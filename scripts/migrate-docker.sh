#!/usr/bin/env bash
# Apply SQL migrations to the EXTERNAL Postgres configured in backend/.env.docker.
#
# The local `db` container was removed and docker-compose now lives in backend/.
# Migrations run against DB_* (from backend/.env.docker) via a one-off pgvector
# container, so host.docker.internal resolves the same way the backend container
# sees it (and a remote DB host works too).
#
# Usage (from anywhere): ./scripts/migrate-docker.sh [migration.sql ...]
#   No args  -> applies backend/migrations/0001_init_schema.sql
#   With args -> applies the given files in order (paths relative to CWD or absolute)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env.docker"
MIG_DIR="$ROOT/backend/migrations"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing backend/.env.docker — copy from backend/docker-compose.env.example first." >&2
  exit 1
fi

# Load DB_* (and the rest) from backend/.env.docker.
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

DB_HOST="${DB_HOST:-host.docker.internal}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-carmen_db}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_SSLMODE="${DB_SSLMODE:-disable}"

# Migration files in order. Override by passing paths as arguments.
FILES=("$@")
if [[ ${#FILES[@]} -eq 0 ]]; then
  FILES=("$MIG_DIR/0001_init_schema.sql")
fi

# Run psql against the external DB from a one-off pgvector container (no host psql needed).
psql_ext() {
  docker run --rm -i --add-host=host.docker.internal:host-gateway \
    -e PGPASSWORD="$DB_PASSWORD" -e PGSSLMODE="$DB_SSLMODE" \
    pgvector/pgvector:pg16 \
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
}

for f in "${FILES[@]}"; do
  echo "==> ${f#"$ROOT/"}"
  psql_ext < "$f"
done

echo ""
echo "Schema applied to ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME} (sslmode=${DB_SSLMODE})."
echo "New BUs are provisioned at runtime via create_bu_tables(<slug>); see backend/migrations/README.md."
