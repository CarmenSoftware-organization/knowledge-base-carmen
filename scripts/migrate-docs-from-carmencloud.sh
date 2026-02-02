#!/usr/bin/env bash
# ย้ายเอกสารจาก llHorizonll/docscarmencloud (docs/carmen_cloud) เข้า new-carmen
# รันจาก root โปรเจค: bash scripts/migrate-docs-from-carmencloud.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "1) Clone repo เก่า (แค่ดึงไฟล์)..."
rm -rf temp-docs 2>/dev/null || true
git clone --depth 1 https://github.com/llHorizonll/docscarmencloud.git temp-docs

echo "2) สร้างโฟลเดอร์ปลายทาง..."
mkdir -p docs/carmen_cloud

echo "3) Copy docs/carmen_cloud จาก repo เก่า..."
if [ -d "temp-docs/docs/carmen_cloud" ]; then
  cp -r temp-docs/docs/carmen_cloud/* docs/carmen_cloud/
elif [ -d "temp-docs/docs" ]; then
  cp -r temp-docs/docs/* docs/carmen_cloud/
else
  echo "ไม่พบโฟลเดอร์ docs หรือ docs/carmen_cloud ใน repo เก่า"
  ls -la temp-docs/
  rm -rf temp-docs
  exit 1
fi

echo "4) ลบ clone ชั่วคราว..."
rm -rf temp-docs

echo "5) เสร็จแล้ว — กรุณา commit + push เอง:"
echo "   git add docs/carmen_cloud"
echo "   git commit -m \"docs: ย้ายเอกสารจาก docscarmencloud (docs/carmen_cloud)\""
echo "   git push"
