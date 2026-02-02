@echo off
REM ย้ายเอกสารจาก llHorizonll/docscarmencloud เข้า new-carmen
REM รันจาก root โปรเจค (หรือ cd ไปที่โฟลเดอร์ที่มี backend, docs ฯลฯ)

cd /d "%~dp0\.."

echo 1^) Clone repo เก่า...
if exist temp-docs rmdir /s /q temp-docs
git clone --depth 1 https://github.com/llHorizonll/docscarmencloud.git temp-docs

echo 2^) สร้างโฟลเดอร์ปลายทาง...
if not exist docs\carmen_cloud mkdir docs\carmen_cloud

echo 3^) Copy จาก repo เก่า...
if exist temp-docs\docs\carmen_cloud (
  xcopy /e /y temp-docs\docs\carmen_cloud\* docs\carmen_cloud\
) else if exist temp-docs\docs (
  xcopy /e /y temp-docs\docs\* docs\carmen_cloud\
) else (
  echo ไม่พบโฟลเดอร์ docs ใน repo เก่า
  dir temp-docs
  rmdir /s /q temp-docs
  exit /b 1
)

echo 4^) ลบ clone ชั่วคราว...
rmdir /s /q temp-docs

echo 5^) เสร็จแล้ว — กรุณา commit + push เอง:
echo    git add docs/carmen_cloud
echo    git commit -m "docs: ย้ายเอกสารจาก docscarmencloud (docs/carmen_cloud)"
echo    git push
