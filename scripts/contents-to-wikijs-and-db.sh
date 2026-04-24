#!/usr/bin/env bash
#
# 1) Push all markdown under contents/ into Wiki.js (GraphQL create/update).
# 2) If API_BASE and ADMIN_KEY are set: POST /api/wiki/sync (git pull on server) and
#    POST /api/index/rebuild?bu=... for each top-level folder under contents/.
#
# สำหรับขั้น (2) บน server: เนื้อหาใน Git ต้องอัปเดตก่อน (commit + push) ไม่อย่างนั้น
# git pull ดึงของเก่า — หรือรัน backend บนเครื่องเดียวกับ repo นี้โดย GIT_REPO_PATH ชี้ repo นี้
#
# Usage:
#   ./scripts/contents-to-wikijs-and-db.sh
#   ./scripts/contents-to-wikijs-and-db.sh -- --dry-run
#   API_BASE=http://127.0.0.1:8080 ADMIN_KEY=... ./scripts/contents-to-wikijs-and-db.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT/scripts/wikijs-import-contents.sh" "$@"

if [[ -z "${API_BASE:-}" ]]; then
  echo ""
  echo "DB step skipped (no API_BASE). To also sync DB after Wiki.js:"
  echo "  1) Commit + push contents/ ถ้า backend ดึงจาก Git บน server"
  echo "  2) API_BASE=http://127.0.0.1:8080 ADMIN_KEY=<ADMIN_API_KEY> $ROOT/scripts/contents-to-wikijs-and-db.sh"
  exit 0
fi
KEY="${ADMIN_KEY:-${ADMIN_API_KEY:-}}"
if [[ -z "$KEY" ]]; then
  echo "DB step skipped: set ADMIN_KEY or ADMIN_API_KEY for curl."
  exit 0
fi

if [[ -f "$ROOT/backend/.env" ]]; then
  set -a
  set +u
  # shellcheck disable=SC1090
  source "$ROOT/backend/.env" 2>/dev/null || true
  set -u
  set +a
fi
KEY="${ADMIN_KEY:-${ADMIN_API_KEY:-}}"

echo ""
echo "==> POST $API_BASE/api/wiki/sync  (git pull ที่ฝั่งเซิร์ฟเวอร์)"
curl -sS -f -H "X-Admin-Key: $KEY" -X POST "$API_BASE/api/wiki/sync" || {
  echo "api/wiki/sync failed" >&2
  exit 1
}
echo ""

for bu in $(ls -1 "$ROOT/contents" 2>/dev/null | sort); do
  [[ -d "$ROOT/contents/$bu" ]] || continue
  echo "==> POST /api/index/rebuild?bu=$bu"
  curl -sS -f -H "X-Admin-Key: $KEY" -X POST "$API_BASE/api/index/rebuild?bu=$bu" || true
  echo ""
done
echo "Started reindex per BU. Check backend logs for completion."
