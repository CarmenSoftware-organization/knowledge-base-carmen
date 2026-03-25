#!/usr/bin/env bash
# Delegate to repo-root script (so this works when cwd is backend/).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec "$ROOT/scripts/sync-wiki-and-reindex-carmen.sh" "$@"
