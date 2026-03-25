#!/usr/bin/env bash
# ดึง wiki จาก git ลงเครื่อง แล้วสร้าง vector ใหม่เฉพาะ BU carmen (ไม่ใช้ webhook)
#
# ใช้งาน (จาก root โปรเจกต์):
#   ./scripts/sync-wiki-and-reindex-carmen.sh
# จากโฟลเดอร์ backend/:
#   ./scripts/sync-wiki-and-reindex-carmen.sh
#   ../scripts/sync-wiki-and-reindex-carmen.sh
# ตัวแปร:
#   API_BASE=http://127.0.0.1:8080 ./scripts/sync-wiki-and-reindex-carmen.sh
#
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8080}"

echo "==> POST ${API_BASE}/api/wiki/sync"
curl -sS -X POST "${API_BASE}/api/wiki/sync"
echo ""

echo "==> POST ${API_BASE}/api/index/rebuild?bu=carmen  (รันใน background บนเซิร์ฟเวอร์)"
curl -sS -X POST "${API_BASE}/api/index/rebuild?bu=carmen"
echo ""

echo "Done. ดู log backend ว่า [index/rebuild] completed (carmen)"
