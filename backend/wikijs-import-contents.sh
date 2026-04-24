#!/usr/bin/env bash
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/wikijs-import-contents.sh" "$@"
