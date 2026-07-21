#!/usr/bin/env bash
# READ-ONLY parity check. Exit 0 = all good.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib.sh"
OUT="${MIGRATE_OUT:-/tmp}"; mkdir -p "$OUT"
fail=0

echo "== Row-count parity (src vs dst) =="
for t in "${TABLES[@]}"; do
  s=$(psql_src -tAc "select count(*) from public.$t;")
  d=$(psql_dst -tAc "select count(*) from public.$t;")
  mark="OK"; if [[ "$s" != "$d" ]]; then mark="MISMATCH"; fail=1; fi
  printf "   %-18s src=%-8s dst=%-8s %s\n" "$t" "$s" "$d" "$mark"
done

echo "== business_units id+slug parity (CRITICAL) =="
psql_src -tAc "select id||'|'||slug from public.business_units order by slug;" > "$OUT/bu_src.txt"
psql_dst -tAc "select id||'|'||slug from public.business_units order by slug;" > "$OUT/bu_dst.txt"
if diff -q "$OUT/bu_src.txt" "$OUT/bu_dst.txt" >/dev/null; then
  echo "   business_units UUIDs match"
else
  echo "   business_units MISMATCH:"; diff "$OUT/bu_src.txt" "$OUT/bu_dst.txt" || true; fail=1
fi

echo "== embedding sanity on target =="
echo "   dims histogram (expect all 2000):"
psql_dst -c "select vector_dims(embedding) as dims, count(*) from public.document_chunks where embedding is not null group by 1;"
echo "   null embeddings src vs dst:"
sn=$(psql_src -tAc "select count(*) from public.document_chunks where embedding is null;")
dn=$(psql_dst -tAc "select count(*) from public.document_chunks where embedding is null;")
printf "   null: src=%s dst=%s %s\n" "$sn" "$dn" "$([[ "$sn" == "$dn" ]] && echo OK || { echo MISMATCH; })"
[[ "$sn" == "$dn" ]] || fail=1

if [[ "$fail" -eq 0 ]]; then echo "ALL PARITY CHECKS PASSED"; else echo "PARITY FAILURES — do not cut over"; fi
exit $fail
