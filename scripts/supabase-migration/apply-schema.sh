#!/usr/bin/env bash
# LIVE: creates schema on the TARGET (Supabase). Does not touch the source.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib.sh"
ROOT="$(cd "$HERE/../.." && pwd)"

echo "== 1/4 enable extensions =="
psql_dst < "$HERE/01_enable_extensions.sql"

echo "== 2/4 apply canonical schema (backend/migrations/0001_init_schema.sql) =="
psql_dst < "$ROOT/backend/migrations/0001_init_schema.sql"

echo "== 3/4 enable deny-all RLS =="
psql_dst < "$HERE/02_enable_rls.sql"

echo "== 4/4 clear seeded business_units (copy will carry source UUIDs) =="
psql_dst -c "TRUNCATE public.business_units CASCADE;"

echo "Schema ready on target."
