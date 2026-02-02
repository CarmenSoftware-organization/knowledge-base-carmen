---
title: โครงสร้างและการใช้งานเอกสาร carmen_cloud
description: อธิบายความต่างระหว่าง docs/carmen_cloud กับ carmen_cloud และวิธีอัปเดตเนื้อหาให้ Wiki.js
published: false
---

## ภาพรวมโครงสร้าง

- `docs/carmen_cloud/`  
  - เป็น **ต้นฉบับ (source)** ของคู่มือ carmen_cloud ที่ใช้ในโปรเจกต์นี้  
  - ภายในมีโฟลเดอร์ย่อย เช่น `ap/`, `gl/`, `workbook/` ฯลฯ พร้อมไฟล์ `.md` และรูปภาพ  
  - เวลาจะแก้เนื้อหา ให้แก้ที่โฟลเดอร์นี้เป็นหลัก

- `carmen_cloud/` (อยู่ที่ root ของ repo)  
  - เป็น **ไฟล์ที่เตรียมไว้สำหรับให้ Wiki.js ใช้**  
  - โครงสร้างใกล้เคียง `docs/carmen_cloud/` แต่บางชื่อไฟล์/โครงสร้างถูกปรับให้เหมาะกับการเป็น URL ของ Wiki.js  
  - เนื้อหาในโฟลเดอร์นี้มักจะถูกสร้าง/อัปเดตจากสคริปต์ ไม่ควรแก้มือเป็นหลัก

สรุปสั้น ๆ:  
**แก้เนื้อหา → แก้ที่ `docs/carmen_cloud/`**  
**ให้ Wiki.js ใช้ → ดึงจาก `carmen_cloud/` ที่ root**

## Workflow การอัปเดตเนื้อหา

1. **แก้ไขเอกสาร**
   - แก้ไฟล์ `.md` หรือรูปภาพใน `docs/carmen_cloud/...` ตามหมวดที่ต้องการ

2. **สร้าง/อัปเดตโฟลเดอร์ `carmen_cloud/` สำหรับ Wiki.js ด้วยสคริปต์**

   ใช้สคริปต์ Node.js สองตัวนี้ (รันจาก root ของโปรเจกต์):

   ```bash
   node scripts/wiki-import-from-carmencloud.js
   node scripts/copy-wiki-import-to-repo.js
   ```

   อธิบายสั้น ๆ:

   - `scripts/wiki-import-from-carmencloud.js`  
     - อ่านไฟล์จาก `docs/carmen_cloud/...`  
     - เพิ่ม frontmatter / ปรับโครงให้เหมาะกับ Wiki.js  
     - วางผลลัพธ์ไว้ที่โฟลเดอร์กลาง (เช่น `wiki-import/carmen_cloud/...`)

   - `scripts/copy-wiki-import-to-repo.js`  
     - คัดลอกไฟล์จากโฟลเดอร์นำเข้า (เช่น `wiki-import/carmen_cloud/...`)  
     - วางลงในโฟลเดอร์ `carmen_cloud/...` ที่ root ของ repo ซึ่งเป็นชุดที่ Wiki.js จะใช้

3. **Commit + Push**
   - ตรวจสอบว่า `docs/carmen_cloud/...` และ `carmen_cloud/...` เป็นไปตามที่ต้องการ  
   - รัน `git add` แล้ว `git commit` และ `git push`

4. **ให้ Wiki.js ดึงเนื้อหา**
   - ในหน้า Administration ของ Wiki.js (Storage → Git) ให้สั่ง sync/pull จาก repo นี้  
   - Wiki.js จะเห็นโครงหน้าเริ่มที่โฟลเดอร์ `carmen_cloud/...`

## หมายเหตุเรื่อง branch

- **`main`**  
  - เก็บโค้ด + เอกสารเวอร์ชันหลักของโปรเจกต์  
  - ใช้อัปเดตเนื้อหา `docs/carmen_cloud/` ตามปกติ

- **`Git-+-wiki` (และ branch อื่นที่ใช้กับ Wiki)**  
  - ใช้ทดลอง/แก้ปัญหาเรื่อง merge, rebase, sync กับ Wiki.js  
  - โดยหลักการ เอกสารก็ยังใช้แนวคิดเดียวกัน:  
    - `docs/carmen_cloud/` = ต้นฉบับ  
    - `carmen_cloud/` = output สำหรับ Wiki.js

ถ้าหยุดใช้ Wiki.js ในอนาคต สามารถเก็บเฉพาะ `docs/carmen_cloud/` เป็นแหล่งเอกสารหลัก และพิจารณาลบโฟลเดอร์ `carmen_cloud/` ที่ root ได้ตามความเหมาะสมของทีม

