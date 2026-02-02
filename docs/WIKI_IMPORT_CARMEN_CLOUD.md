# นำข้อมูล carmen_cloud เข้า Wiki.js

## สิ่งที่ต้องมี

- เนื้อหาใน `docs/carmen_cloud/` (โฟลเดอร์ย่อย ap, gl, workbook ฯลฯ พร้อม .md และรูป)
- Wiki.js เชื่อม repo **new-carmen** แล้ว (Sync Bi-directional)
- Node.js (สำหรับรันสคริปต์)

---

## ขั้นตอน (ทำตามลำดับ)

### 1. แปลงเป็นรูปแบบ Wiki.js

รันสคริปต์เพื่อเพิ่ม frontmatter และ copy รูปไปที่ `wiki-import/carmen_cloud/`:

```bash
node scripts/wiki-import-from-carmencloud.js
```

ผลลัพธ์: โฟลเดอร์ **wiki-import/carmen_cloud/** มีไฟล์ .md แบบ Wiki + รูปในโฟลเดอร์เดียวกัน (path รูปใน .md ยังใช้ได้)

---

### 2. Copy ไปที่ root ของ repo

รันสคริปต์เพื่อ copy เนื้อจาก wiki-import ไปเป็นโฟลเดอร์ **carmen_cloud** ที่ root ของ repo:

```bash
node scripts/copy-wiki-import-to-repo.js
```

ผลลัพธ์: ที่ root ของ repo จะมีโฟลเดอร์ **carmen_cloud/** (โครง ap/, gl/, workbook/ ฯลฯ พร้อม .md และรูป)

---

### 3. Commit และ Push ขึ้น Git

```bash
git add carmen_cloud
git commit -m "docs: นำเข้า carmen_cloud สำหรับ Wiki.js"
git push
```

---

### 4. ใน Wiki.js — ดึงจาก Git

1. เข้า **Administration** (ไอคอนคน/การตั้งค่า)
2. ไปที่ **Storage** → เลือก **Git**
3. กด **Sync** หรือ **Pull from target** (แล้วแต่เวอร์ชัน)

Wiki จะดึงเนื้อจาก repo มา — ถ้า Wiki รองรับ path แบบโฟลเดอร์ คุณจะเห็นหน้าชุด **carmen_cloud** (เช่น `/carmen_cloud/ap/AP-vendor`, `/carmen_cloud/workbook/...`)

---

### 5. ถ้ารูปไม่โผล่ใน Wiki

- ตรวจว่าใน repo มีรูปอยู่ในโฟลเดอร์เดียวกับ .md (เช่น `carmen_cloud/ap/image-119.png`)
- Wiki บางเวอร์ชัน resolve รูปแบบ relative ต่อ path หน้าอัตโนมัติ
- ถ้าไม่โผล่ อาจต้องเปลี่ยน path ใน .md เป็น path จาก root ของ repo หรืออัปโหลดรูปเป็น asset ของ Wiki แล้วแก้ลิงก์

---

## สรุปคำสั่ง (รันทีเดียว)

```bash
node scripts/wiki-import-from-carmencloud.js
node scripts/copy-wiki-import-to-repo.js
git add carmen_cloud
git commit -m "docs: นำเข้า carmen_cloud สำหรับ Wiki.js"
git push
```

จากนั้นไปกด **Sync / Pull from target** ใน Wiki.js
