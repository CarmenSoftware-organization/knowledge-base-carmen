#!/usr/bin/env bash
# LIVE: reads source (READ-ONLY), loads target. Run apply-schema.sh first.
# Set MIGRATE_OUT to a scratch dir OUTSIDE the repo (holds intermediate CSVs).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib.sh"

OUT="${MIGRATE_OUT:?set MIGRATE_OUT to a scratch dir (e.g. the session scratchpad)}"
mkdir -p "$OUT"

for t in "${TABLES[@]}"; do
  cols=$(psql_src -tAc \
    "select string_agg(quote_ident(column_name), ',' order by ordinal_position) \
     from information_schema.columns \
     where table_schema='public' and table_name='$t';")

  echo "== dump $t =="
  echo "   cols: $cols"
  psql_src -c "\copy (SELECT $cols FROM public.$t) TO STDOUT WITH (FORMAT csv)" > "$OUT/$t.csv"
  rows=$(wc -l < "$OUT/$t.csv" | tr -d ' ')
  echo "   dumped rows: $rows"

  echo "== load $t =="
  psql_dst -c "\copy public.$t ($cols) FROM STDIN WITH (FORMAT csv)" < "$OUT/$t.csv"
  echo "   loaded."
done

echo "Copy complete. CSVs in: $OUT"
