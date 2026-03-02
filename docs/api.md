# คู่มือ API (สรุป)

รายการ endpoints ที่พบในโค้ด (backend/internal/\*):

- GET /health
  - ไฟล์: `backend/internal/router/health_routes.go`
  - คำอธิบาย: Health check (returns {"status":"ok"})

- GET /api/system/status
  - ไฟล์: `backend/internal/router/public_system_routes.go` → handler `backend/internal/api/system_handler.go`
  - คำอธิบาย: ตรวจสถานะ backend (SystemStatusResponse)

- GET /api/documents
  - ไฟล์: `backend/internal/router/documents_routes.go` → handler `backend/internal/api/documents_handler.go`
  - คำอธิบาย: คืนรายการเอกสารจากตาราง `documents` พร้อมจำนวน chunks

- Wiki related:
  - GET /api/wiki/list — `backend/internal/api/wiki_handler.go` (List)
  - GET /api/wiki/categories — (ListCategories)
  - GET /api/wiki/category/:slug — (GetCategory)
  - GET /api/wiki/content/\* — (GetContent) — ดึงเนื้อหา markdown
  - GET /api/wiki/search?q=... — (Search) — full-text search แบบเรียบง่าย
  - POST /api/wiki/sync — (Sync) — trigger git pull และอัปเดท local wiki content
  - Static: /wiki-assets → served from `config.GetWikiContentPath()`

- POST /webhook/github
  - ไฟล์: `backend/internal/router/webhook_routes.go` → handler `backend/internal/api/github_webhook_handler.go`
  - คำอธิบาย: รับ GitHub push webhook, ตรวจ signature (HMAC-SHA256) ถ้า branch ตรงตาม config จะเรียก sync และ background indexing

- POST /api/index/rebuild
  - ไฟล์: `backend/internal/router/indexing_routes.go` → handler `backend/internal/api/indexing_handler.go`
  - คำอธิบาย: เริ่ม reindex ทั้งหมดแบบ background (HTTP 202 returned)

พารามิเตอร์สำคัญ / behavior:

- Webhook: ตรวจหัว `X-GitHub-Event` == "push" และตรวจ HMAC signature กับ `GITHUB_WEBHOOK_SECRET` หากตั้งค่าไว้
- Indexing: `IndexAll` จะอ่านไฟล์ markdown จาก `GetWikiContentPath()` และตัดแบ่งเป็น chunk ขนาด ~4000 chars ก่อนเรียก Ollama Embedding

ข้อเสนอแนะเพื่อเอกสารต่อ:

- เพิ่มตัวอย่าง request/response แต่ละ endpoint (ตัวอย่าง JSON) เพื่อให้นักพัฒนาฝั่ง frontend เข้าใจ payload
- ระบุโค้ดสถานที่จัดการ authentication/authorization ถ้ามี (ปัจจุบัน public endpoints ที่อ่าน wiki/health/docs เป็น public)

---

## ตัวอย่าง Request / Response (ตัวอย่างจริงจากโค้ด)

### 1) GET /health

Request:

- GET /health

Response 200:

```json
{ "status": "ok" }
```

### 2) GET /api/system/status

Request:

- GET /api/system/status

Response 200:

```json
{
  "status": "ok",
  "message": ""
}
```

### 3) GET /api/documents

Request:

- GET /api/documents

Response 200 (จาก `documents_handler.List`):

```json
{
  "items": [
    {
      "id": 1,
      "path": "configuration/CF-company_profile.md",
      "title": "CF company profile",
      "source": "wiki",
      "chunk_count": 3,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-02T00:00:00Z"
    }
  ]
}
```

### 4) Wiki list / content / search

- GET /api/wiki/list
  - Response 200:

  ```json
  {
    "items": [
      {
        "path": "configuration/CF-company_profile.md",
        "title": "CF company profile",
        "published": true
      }
    ]
  }
  ```

- GET /api/wiki/content/:path
  - ตัวอย่าง: `GET /api/wiki/content/configuration/CF-company_profile.md`
  - Response 200 (ตาม `WikiContent`):

  ```json
  {
    "path": "configuration/CF-company_profile.md",
    "title": "Company Profile",
    "description": "...",
    "published": true,
    "date": "2024-01-01",
    "content": "# Heading\nContent...",
    "tags": ["config", "company"]
  }
  ```

- GET /api/wiki/search?q=keyword
  - Request: `GET /api/wiki/search?q=leave`
  - Response 200:

  ```json
  {
    "items": [
      {
        "path": "ar/AR-invoice.md",
        "title": "AR invoice",
        "snippet": "...matching snippet..."
      }
    ]
  }
  ```

- POST /api/wiki/sync
  - Trigger การ sync จาก Git แล้วตอบ 200 เมื่อสำเร็จ:
  ```json
  { "ok": true, "message": "synced" }
  ```

### 5) POST /webhook/github

Headers ที่คาดหวัง:

- `X-GitHub-Event: push`
- `X-Hub-Signature-256: sha256=...` (ถ้ามี `GITHUB_WEBHOOK_SECRET` ตั้งค่าไว้)

Payload (ตัวอย่าง):

```json
{
  "ref": "refs/heads/main"
}
```

Behavior:

- Handler จะตรวจ `ref` เทียบกับ `GITHUB_WEBHOOK_BRANCH` ใน config หากตรงจะเรียก `sync` และสั่ง indexing แบบ background

### 6) POST /api/index/rebuild

Request: `POST /api/index/rebuild`

Response 202 (ทันที):

```json
{ "message": "reindex started (running in background)" }
```

### 7) Chat / RAG

หมายเหตุ: ฝั่ง frontend (`frontend/user/lib/wiki-api.ts`) เรียก `POST /api/chat/ask` (body: `{question, preferredPath?}`) แต่ในโค้ด backend ปัจจุบันยังไม่พบ handler สำหรับ `/api/chat/ask`.

หากต้องการเปิดใช้งาน ให้เพิ่ม handler ที่:

- รับ JSON `{ "question": "...", "preferredPath": "optional/path.md" }`
- Flow แนะนำ:
  1. Query vector DB เพื่อหา top-k chunks
  2. ประกอบ context และเรียก `pkg/ollama.Client.GenerateAnswer(context, question)`
  3. คืน JSON เช่น `{answer, sources:[{articleId,title}], needDisambiguation?, options?}`

ตัวอย่าง request (frontend):

```json
{ "question": "วิธีปิดงวดบัญชี?", "preferredPath": "gl/c-close_period.md" }
```

ตัวอย่าง response (ตัวอย่างเสนอ):

```json
{
  "answer": "1) ไปที่เมนู GL → Close Period\n2) เลือก company → Click Close",
  "sources": [{ "articleId": 123, "title": "GL - Close Period" }]
}
```

---

ข้อเสนอแนะเพิ่มเติม:

- สร้างสเปค OpenAPI (หรือ Postman collection) สำหรับทุก endpoint เพื่อให้ frontend สามารถ mock และทดสอบได้เร็วขึ้น
