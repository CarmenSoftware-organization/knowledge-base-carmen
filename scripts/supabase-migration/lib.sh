#!/usr/bin/env bash
# Shared helpers for the Supabase migration. Source this: . "$HERE/lib.sh"
set -euo pipefail

LIB_HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${MIGRATE_ENV:-$LIB_HERE/.env.migrate}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy .env.migrate.example and fill in credentials." >&2
  exit 1
fi
set -a; . "$ENV_FILE"; set +a

IMAGE="pgvector/pgvector:pg16"

# psql against the SOURCE (through PgBouncer). Extra args pass through.
psql_src() {
  docker run --rm -i \
    -e PGPASSWORD="$SRC_PASSWORD" -e PGSSLMODE="${SRC_SSLMODE:-require}" \
    "$IMAGE" \
    psql -h "$SRC_HOST" -p "$SRC_PORT" -U "$SRC_USER" -d "$SRC_DB" \
    -v ON_ERROR_STOP=1 "$@"
}

# psql against the TARGET (Supabase). Extra args pass through.
psql_dst() {
  docker run --rm -i \
    -e PGPASSWORD="$DST_PASSWORD" -e PGSSLMODE="${DST_SSLMODE:-require}" \
    "$IMAGE" \
    psql -h "$DST_HOST" -p "$DST_PORT" -U "$DST_USER" -d "$DST_DB" \
    -v ON_ERROR_STOP=1 "$@"
}

# FK-parent-first order. Used for copy AND verify.
TABLES=(business_units documents document_chunks chat_history activity_logs \
        faq_modules faq_submodules faq_categories faq_entries faq_related)
