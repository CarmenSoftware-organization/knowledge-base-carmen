#!/bin/sh
set -e

echo "[entrypoint] waiting for database ${DB_HOST}:${DB_PORT:-5432} ..."
i=0
until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "[entrypoint] database not ready after 30 attempts — aborting" >&2
    exit 1
  fi
  sleep 2
done

echo "[entrypoint] applying schema (idempotent, via psql)..."
export PGPASSWORD="$DB_PASSWORD"
export PGSSLMODE="${DB_SSLMODE:-disable}"
psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 -f migrations/0001_init_schema.sql

echo "[entrypoint] starting backend server..."
exec ./server
