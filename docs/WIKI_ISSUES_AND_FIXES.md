# ปัญหาและทางแก้: เนื้อหาใน Wiki.js ไม่ครบ / ใช้งานไม่ได้

## 1. ลิงก์วิดีโอ (iframe) ไม่ขึ้น

**สาเหตุ:** ไฟล์ต้นฉบับใช้ HTML `<iframe>` สำหรับ YouTube แต่ Wiki.js โดยทั่วไป **ไม่ render iframe** (หรือ strip ออก) เพื่อความปลอดภัย

**ตัวอย่าง:** หน้า WB-install&config มีวิดีโอ 2 คลิปด้านล่าง — ใน Wiki.js ส่วนนี้จะไม่โผล่

**ทางแก้:**

- **ทางเลือก A (ใน Wiki.js):** ตรวจว่า **Administration → Modules → Rendering** มีตัวเลือก "Allow HTML" / "Allow iframe" / whitelist domain หรือไม่ ถ้ามี ให้เปิดหรือเพิ่ม `youtube.com` / `www.youtube.com`
- **ทางเลือก B (แก้ที่เนื้อหา):** แทนที่ `<iframe>...</iframe>` ด้วย **ลิงก์ Markdown** เพื่อให้อย่างน้อยมีลิงก์ให้คลิกไปดูวิดีโอ เช่น  
  `[Watch: Setup | การตั้งค่าก่อนเริ่มใช้งาน](https://www.youtube.com/watch?v=Y42UT8szy-M)`

ถ้าใช้ทาง B ต้องแก้ในไฟล์ต้นฉบับ (เช่น `docs/carmen_cloud/workbook/WB-install&config.md`) แล้วรันสคริปต์นำเข้าอีกครั้ง แล้วอัปเดต branch wiki-content

---

## 2. ชื่อไฟล์มี `&` → กลายเป็น slug (ไม่มี &)

**ต้นฉบับ:** `WB-install&config.md`  
**ใน Wiki.js:** path กลายเป็น `WB-installconfig` (สคริปต์แปลง `&` ออกเพื่อให้เป็น URL ที่ใช้ได้)

- URL ต้นฉบับ (Vercel): `/carmen_cloud/workbook/WB-install&config.html`
- URL ใน Wiki: `/en/carmen_cloud/workbook/WB-installconfig`

**สรุป:** ไม่ใช่ bug — เป็นการตั้งใจให้ slug ใช้ได้ใน URL ถ้าอยากให้ชื่อใกล้เคียงต้นฉบับ อาจใช้ `WB-install-config` แทน `WB-installconfig` ได้ (ต้องแก้ในสคริปต์และนำเข้าใหม่)

---

## 3. HTML อื่นใน Markdown (`<p>`, `<img>`, `<h3>`)

มีหลายไฟล์ใช้ HTML ปนกับ Markdown (เช่น `<p align="center">`, `<img src="./image-2.png">`)

- **Wiki.js:** บางตัวอาจ render ได้ บางตัวอาจถูก strip
- ถ้าหน้าไหนรูปหรือ layout ผิด: ลองเปลี่ยนเป็น Markdown ล้วน เช่น `![alt](image-2.png)` แทน `<img src="./image-2.png">`

---

## 4. รูปไม่โผล่

- ตรวจว่า path รูปใน .md ตรงกับที่เก็บใน repo (เช่น `image-20.png` อยู่ในโฟลเดอร์เดียวกับ .md)
- ใน Wiki ถ้าใช้ path แบบ `./image-20.png` อาจไม่ทำงาน ลองใช้ `image-20.png` (ไม่มี `./`)

---

## สรุปสิ่งที่ควรเช็ก

| ปัญหา | สาเหตุ | แก้ไข |
|--------|--------|--------|
| วิดีโอไม่ขึ้น | Wiki.js ไม่ render iframe | เปิด allow iframe ใน Wiki หรือแทนที่ iframe ด้วยลิงก์ Markdown |
| ชื่อ path ต่างจากต้นฉบับ | slug ลดอักขระพิเศษ (เช่น &) | ยอมรับหรือเปลี่ยนกฎ slug ในสคริปต์ |
| รูป/HTML ผิด | path รูปหรือ HTML ถูก strip | ใช้ Markdown รูป และตรวจ path รูป |

---

## การแทนที่ iframe ด้วยลิงก์ (ทาง B)

ถ้าเลือกแก้ที่เนื้อหา ให้เพิ่มหรือแทนที่ส่วนวิดีโอด้วยรูปแบบนี้:

```markdown
## Video ประกอบ

### Setup | การตั้งค่าก่อนเริ่มใช้งาน

- [Watch on YouTube: Setup Part 1](https://www.youtube.com/watch?v=Y42UT8szy-M)
- [Watch on YouTube: Setup Part 2](https://www.youtube.com/watch?v=y9eoJuLLfi8)
```

จากนั้นรัน `node scripts/wiki-import-from-carmencloud.js` และ `node scripts/copy-wiki-import-to-repo.js` แล้วอัปเดต branch wiki-content ตามขั้นตอนใน WIKI_IMPORT_CARMEN_CLOUD.md
