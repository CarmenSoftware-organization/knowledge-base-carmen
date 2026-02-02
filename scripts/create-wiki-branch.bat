@echo off
REM สร้าง branch ใหม่ (wiki-content) ที่มีเฉพาะโฟลเดอร์ carmen_cloud สำหรับให้ Wiki.js ดึง
REM รันจาก root โปรเจค new-carmen

set BRANCH=wiki-content
if not "%~1"=="" set BRANCH=%~1

if not exist carmen_cloud (
  echo ไม่พบโฟลเดอร์ carmen_cloud
  echo รัน node scripts/wiki-import-from-carmencloud.js และ node scripts/copy-wiki-import-to-repo.js ก่อน
  exit /b 1
)

echo สร้าง branch: %BRANCH% (เฉพาะ carmen_cloud)
git checkout --orphan %BRANCH%
git reset
git add carmen_cloud
git commit -m "Wiki content: carmen_cloud only"
git push -u origin %BRANCH%
git checkout main

echo.
echo เสร็จแล้ว. ใน Wiki.js: ไปที่ Storage -^> Git -^> เปลี่ยน Branch เป็น "%BRANCH%" -^> APPLY -^> Sync / Import Everything
