#!/usr/bin/env bash
# ซิงก์ wiki (git pull ตาม config) แล้วสร้าง embedding ใหม่ใน schema `carmen`
#
# จาก root โปรเจกต์:
#   ล้าง index เก่าก่อน แล้วค่อยซิงก์ + rebuild (แนะนำเมื่อย้ายโครงสร้างไฟล์หรือลบบทความ):
#     CLEAR_INDEX=1 ADMIN_KEY=... ./scripts/sync-wiki-and-reindex-carmen.sh
#
#   ไม่ล้าง (อัปเดตเฉพาะ path ที่ยังมีใน repo — path ที่หายไปอาจค้างใน DB):
#     ADMIN_KEY=... ./scripts/sync-wiki-and-reindex-carmen.sh
#
#   โหลดคีย์จาก backend/.env:
#     set -a && source backend/.env && set +a && CLEAR_INDEX=1 ./scripts/sync-wiki-and-reindex-carmen.sh
#
# แบบไม่ต้องรัน HTTP (ดึง markdown จาก repo ตาม GIT_REPO_PATH ใน .env โดยตรง):
#   cd backend && go run ./cmd/server/main.go reset index carmen && go run ./cmd/server/main.go reindex carmen
#
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE="${API_BASE:-http://localhost:8080}"
ADMIN_KEY="${ADMIN_KEY:-${ADMIN_API_KEY:-}}"

if [[ "${CLEAR_INDEX:-0}" == "1" ]]; then
  echo "==> Truncate carmen.documents (CASCADE → document_chunks)"
  (cd "$REPO/backend" && go run ./cmd/server/main.go reset index carmen)
  echo ""
fi

if [[ -z "${ADMIN_KEY}" ]]; then
  echo "ERROR: ตั้ง ADMIN_KEY หรือ ADMIN_API_KEY (หรือ source backend/.env) — ต้องใช้กับ /api/wiki/sync และ /api/index/rebuild"
  exit 1
fi

echo "==> POST ${API_BASE}/api/wiki/sync"
curl -sS -f -H "X-Admin-Key: ${ADMIN_KEY}" -X POST "${API_BASE}/api/wiki/sync"
echo ""

echo "==> POST ${API_BASE}/api/index/rebuild?bu=carmen  (รันใน background บนเซิร์ฟเวอร์)"
curl -sS -f -H "X-Admin-Key: ${ADMIN_KEY}" -X POST "${API_BASE}/api/index/rebuild?bu=carmen"
echo ""

echo "Done. ดู log backend ว่า [index/rebuild] completed (carmen)"
