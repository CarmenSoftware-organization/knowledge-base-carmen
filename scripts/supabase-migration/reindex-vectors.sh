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
psql_dst -c "REINDEX INDEX public.idx_document_chunks_embedding;"
psql_dst -c "REINDEX INDEX public.idx_chat_history_embedding;"
echo "Vector indexes rebuilt."
