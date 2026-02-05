# ข้อมูล carmen-cloud: Wiki → Chroma (chatbot) และการแสดงบนเว็บ

## ข้อกำหนด: ระบบไม่ใช้ DB

**ระบบนี้ไม่ใช้ DB** — การออกแบบด้านล่างไม่พึ่ง PostgreSQL

---

## สรุปบทบาท

| ส่วน | หน้าที่ |
|------|----------|
| **Wiki** | Admin CRUD ข้อมูล carmen-cloud (แหล่งข้อมูลหลัก) |
| **ChromaDB** | เก็บข้อมูล carmen-cloud เป็น vector embed สำหรับ **chatbot** เท่านั้น |
| **เว็บหน้าบ้าน (frontend)** | แสดงข้อมูล carmen-cloud ให้ **user ดูอย่างเดียว** (read-only) |

คำถาม: **จะเอาข้อมูลจาก carmen-cloud ไปใส่ในฝั่งเว็บ (ให้ user ดู) ยังไง?**

**Wiki ไม่มี API** — เอกสารที่ Wiki sync อยู่ที่ **git repo บน branch `wiki-content`** เท่านั้น

---

## ทางเดียวที่ทำได้: Backend อ่านจาก repo (branch wiki-content)

```
Wiki (admin CRUD) ──sync──► git repo, branch wiki-content
                                    │
                                    ├──► Backend index เข้า ChromaDB (สำหรับ chatbot)
                                    │
                                    └──► Backend อ่านจาก repo แล้วตอบ API ให้ frontend
                                         (อ่านจากโฟลเดอร์ GIT_REPO_PATH หรือ GitHub API — ไม่ใช้ DB)
```

- **แหล่งข้อมูลสำหรับ frontend:** repo branch **wiki-content** (ที่ Wiki sync อยู่)
- **Backend ต้องทำ:** อ่านรายการไฟล์/เนื้อหาจาก repo นั้น (local clone ที่ `./wiki-content` หรือ GitHub API) แล้ว expose เป็น API เช่น GET /api/wiki/list, GET /api/wiki/content/:path
- **Frontend:** เรียก API ของ backend เพื่อดึงรายการและเนื้อหาบทความไปแสดง
- ข้อควรระวัง: ถ้าอ่านจาก GitHub API ทุก request อาจช้า/โดน rate limit — ถ้า clone repo ไว้ที่ backend (GIT_REPO_PATH) แล้วอ่านจากไฟล์จะควบคุมได้ดีกว่า

---

## สรุป

- **ไม่ใช้ DB** และ **Wiki ไม่มี API**
- ข้อมูล carmen-cloud อยู่ที่ **repo branch `wiki-content`** อย่างเดียว
- **การแสดงบนเว็บ:** ให้ backend มี **API ที่อ่านจาก repo (branch wiki-content)** แล้วตอบ JSON ให้ frontend
- **ChromaDB:** ใช้กับ **chatbot เท่านั้น** — index จาก repo branch เดียวกัน

รายการ API ที่ frontend ใช้ได้จาก backend (เมื่อไม่ใช้ DB) อยู่ใน **[API_FOR_FRONTEND.md](./API_FOR_FRONTEND.md)**
