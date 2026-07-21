#!/usr/bin/env bash
# LIVE (target only): rebuild the two ivfflat vector indexes AFTER bulk load so
# their k-means centroids are computed from the real data. Building an ivfflat
# index on an empty table (as apply-schema.sh does via 0001) yields degenerate
# centroids and silently degraded nearest-neighbour recall. Run AFTER
# copy-data.sh and BEFORE verify.sh. Never touches the source.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib.sh"

echo "== REINDEX ivfflat vector indexes (recompute centroids from loaded data) =="
# ivfflat builds need more memory than Supabase's small default
# maintenance_work_mem (32MB on smaller instances). Raise it for THIS session
# (maintenance_work_mem is USERSET → session-local, resets when we disconnect).
# All three statements run in one psql session so the SET applies to both REINDEXes.
psql_dst <<'SQL'
SET maintenance_work_mem = '256MB';
REINDEX INDEX public.idx_document_chunks_embedding;
REINDEX INDEX public.idx_chat_history_embedding;
SQL
echo "Vector indexes rebuilt."
