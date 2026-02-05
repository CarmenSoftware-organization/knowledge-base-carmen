# API สำหรับ Frontend (ระบบไม่ใช้ DB)

## ข้อกำหนดสำคัญ

**ระบบนี้ไม่ใช้ DB** — API ที่อ่านจาก PostgreSQL ไม่ได้เปิดใช้

---

## API ที่ backend เราให้ใช้ได้ (ไม่ใช้ DB)

ฐาน URL = `http://localhost:8080` (หรือที่ deploy backend)

### System

| Method | Endpoint | ใช้ทำอะไร |
|--------|----------|-----------|
| GET | `/health` | health check |
| GET | `/api/system/status` | เช็คสถานะ backend |

### ข้อมูล carmen-cloud จาก repo (branch wiki-content)

Backend อ่านจากโฟลเดอร์ local (`GIT_REPO_PATH`) หรือจาก GitHub API (branch ตาม `GITHUB_BRANCH` — ตั้งเป็น `wiki-content` ได้)

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/wiki/list` | `{ "items": [ { "path": "docs/hello.md", "title": "hello" }, ... ] }` |
| GET | `/api/wiki/content/*path` | `{ "path": "...", "title": "...", "content": "เนื้อหา markdown" }` |

**ตัวอย่าง**
- `GET /api/wiki/list` → รายการไฟล์ .md ทั้งหมด
- `GET /api/wiki/content/docs/guide.md` → เนื้อหาไฟล์ `docs/guide.md`

**หมายเหตุ:** path ใน `content` เป็น path สัมพันธ์ใน repo (เช่น `folder/file.md`) ไม่มี leading slash

### แชทบอท (เมื่อเชื่อม Chroma แล้ว)

| Method | Endpoint | ใช้ทำอะไร |
|--------|----------|-----------|
| POST | `/api/chat/ask` | ถามคำถาม (body: `{"question":"..."}`) → คืน answer + sources |

---

## การตั้งค่า backend

- **โฟลเดอร์ local:** ตั้ง `GIT_REPO_PATH=./wiki-content` (หรือ path ที่ clone repo ไว้) — backend จะ list/อ่านไฟล์จากนี้ก่อน
- **Fallback เป็น GitHub:** ถ้าโฟลเดอร์ไม่มีหรือว่าง backend จะเรียก GitHub API — ตั้ง `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_BRANCH=wiki-content` (และ `GITHUB_TOKEN` ถ้าเป็น private repo)

---

## สรุป

- **ดึงข้อมูล carmen-cloud ไปแสดง:** ใช้ **GET /api/wiki/list** และ **GET /api/wiki/content/*path**
- **ที่ frontend ใช้ได้จาก backend:** `/health`, `/api/system/status`, `/api/wiki/list`, `/api/wiki/content/*` และเมื่อเชื่อม Chroma แล้วใช้ `/api/chat/ask`
