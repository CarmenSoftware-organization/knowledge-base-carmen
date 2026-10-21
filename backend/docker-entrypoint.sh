#!/bin/sh
set -e

# The server runs in wiki-only mode when the DB is unreachable and reconnects
# on its own (database.Monitor), so DB wait/migration failures here only warn —
# they must not stop the container from starting.
echo "[entrypoint] waiting for database ${DB_HOST}:${DB_PORT:-5432} ..."
i=0
db_ready=1
until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 15 ]; then
    echo "[entrypoint] WARNING: database not ready after 15 attempts — skipping schema, starting in wiki-only mode" >&2
    db_ready=0
    break
  fi
  sleep 2
done

if [ "$db_ready" -eq 1 ]; then
  echo "[entrypoint] applying schema (idempotent, via psql)..."
  export PGPASSWORD="$DB_PASSWORD"
  export PGSSLMODE="${DB_SSLMODE:-disable}"
  if ! psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 -f migrations/0001_init_schema.sql; then
    echo "[entrypoint] WARNING: schema apply failed — starting anyway (wiki-only until the DB is reachable)" >&2
  fi
fi

echo "[entrypoint] starting backend server..."
exec ./server
