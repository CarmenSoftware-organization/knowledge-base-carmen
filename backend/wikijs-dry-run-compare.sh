#!/usr/bin/env bash
# Run Wiki.js dry-run from backend/ cwd (delegates to repo-root script).
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/wikijs-dry-run-compare.sh" "$@"
