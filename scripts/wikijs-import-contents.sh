#!/usr/bin/env bash
# Import contents/**/*.md into Wiki.js (GraphQL). See scripts/wikijs_import_contents.py
# Credentials: same as wikijs-dry-run-compare (backend/.env, .wikijs.token, TTY prompt).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1090
source "$ROOT/scripts/wikijs-load-credentials.sh"
export CONTENTS_ROOT="${CONTENTS_ROOT:-$ROOT/contents}"
exec python3 "$ROOT/scripts/wikijs_import_contents.py" "$@"
