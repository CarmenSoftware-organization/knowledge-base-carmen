#!/usr/bin/env node
/**
 * Copy เนื้อจาก wiki-import/carmen_cloud ไปที่ root ของ repo เป็นโฟลเดอร์ carmen_cloud
 * (สำหรับให้ Wiki.js ดึงจาก Git มาเป็นหน้า)
 *
 * รันหลัง: node scripts/wiki-import-from-carmencloud.js
 * จากนั้น: git add carmen_cloud && git commit && git push แล้วไปกด Sync/Pull ใน Wiki.js
 *
 * รัน: node scripts/copy-wiki-import-to-repo.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'wiki-import', 'carmen_cloud');
const DST = path.join(ROOT, 'carmen_cloud');

if (!fs.existsSync(SRC)) {
  console.error('ไม่พบ wiki-import/carmen_cloud — รัน node scripts/wiki-import-from-carmencloud.js ก่อน');
  process.exit(1);
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

if (fs.existsSync(DST)) {
  console.log('ลบ carmen_cloud เดิมที่ root...');
  fs.rmSync(DST, { recursive: true });
}

console.log('Copy wiki-import/carmen_cloud -> carmen_cloud (ที่ root)...');
copyRecursive(SRC, DST);
console.log('เสร็จแล้ว. ขั้นตอนถัดไป:');
console.log('  1) git add carmen_cloud');
console.log('  2) git commit -m "docs: นำเข้า carmen_cloud สำหรับ Wiki.js"');
console.log('  3) git push');
console.log('  4) ใน Wiki.js: Administration → Storage → Git → กด Sync / Pull from target');
