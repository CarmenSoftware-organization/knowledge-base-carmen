#!/usr/bin/env bash
# READ-ONLY preflight. Safe to run against production. Writes nothing.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib.sh"

echo "== Source version (through PgBouncer) =="
psql_src -c "select version();"

echo "== Target version (Supabase) =="
echo "   (if this fails, direct 5432 is IPv6-only — switch DST_* to the Session Pooler)"
psql_dst -c "select version();"

echo "== Source embedding dim (expect 2000) =="
psql_src -tAc "select vector_dims(embedding) from public.document_chunks where embedding is not null limit 1;"

echo "== Source row counts (baseline for verification) =="
for t in "${TABLES[@]}"; do
  n=$(psql_src -tAc "select count(*) from public.$t;")
  printf "   %-18s %s\n" "$t" "$n"
done

echo "== (optional) pg_dump-through-pooler probe =="
echo "   run manually if you want to try Approach B fast-path:"
echo "   docker run --rm -e PGPASSWORD=\$SRC_PASSWORD -e PGSSLMODE=require $IMAGE \\"
echo "     pg_dump -h $SRC_HOST -p $SRC_PORT -U $SRC_USER -d $SRC_DB --schema-only >/dev/null && echo OK"
