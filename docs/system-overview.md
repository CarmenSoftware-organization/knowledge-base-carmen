# ภาพรวมระบบ Carmen Knowledge Base + RAG Chatbot

เอกสารนี้อธิบายการทำงานของทั้งระบบตั้งแต่การนำข้อมูลเข้า wiki การเชื่อมต่อ และการทำงานต่างๆ จนถึงแชทบอท

---

## 1. ภาพรวมสถาปัตยกรรม

```
[ GitHub repo branch: wiki-content ]
           │
           │ push → Webhook
           ▼
[ Backend Go (Fiber) ]
   │
   ├─ WikiSyncService.Sync()     → git pull ลงโฟลเดอร์ wiki-content
   ├─ WikiService                 → อ่าน .md จาก local หรือ GitHub API
   ├─ IndexingService.IndexAll() → อ่าน wiki → แบ่ง chunk → embed (Ollama) → เขียนลง Postgres
   └─ ChatHandler.Ask()           → embed คำถาม → ค้น pgvector → ส่ง context + คำถามให้ Ollama → ตอบ
           │
           ├──────────────────────► [ Postgres + pgvector ]  (documents, document_chunks)
           ├──────────────────────► [ Ollama ]              (embed model + chat model)
           │
[ Frontend Next.js ]  ◄── API (wiki, documents, chat/ask)
```

---

## 2. ข้อมูลเข้า (Wiki)

### 2.1 แหล่งที่มาของข้อมูล

- **โฟลเดอร์ local:** `wiki-content` (ตั้งค่าใน `.env` เป็น `GIT_REPO_PATH` เช่น `./wiki-content`)
- **แหล่ง sync:** Repo GitHub ตาม `GIT_REPO_URL` และ branch `GITHUB_BRANCH` (เช่น `wiki-content`)
- เนื้อหาคู่มือเป็นไฟล์ **Markdown (.md)** อยู่ใน repo หรือโฟลเดอร์นี้

### 2.2 การอ่านรายการและเนื้อหา (WikiService)

- **ListMarkdown()**  
  - ลองอ่านจาก **โฟลเดอร์ local** ก่อน (`filepath.Walk` ใน `repoPath`)  
  - ถ้า local ไม่มีหรือ error → fallback ไป **GitHub API** (รายการไฟล์จาก branch ที่กำหนด)  
  - เรียง path A–Z แล้วคืนเป็น `[]WikiEntry` (path, title)
- **GetContent(path)**  
  - อ่านเนื้อหาไฟล์ .md ตาม path  
  - ลองจาก **local** ก่อน ถ้าไม่มีค่อยดึงจาก **GitHub API**  
  - คืนเป็น `WikiContent` (path, title, content)
- **ListCategories()**  
  - ใช้ผลจาก ListMarkdown แล้วดึง **segment แรกของ path** เป็น slug หมวด (unique, เรียง A–Z)
- **ListByCategory(slug)**  
  - เลือกเฉพาะ entry ที่ path ขึ้นต้นด้วย `slug/` (หรือเท่ากับ slug)  
  - คืนเป็นรายการบทความในหมวด (slug, title, path)

การเชื่อมต่อที่ใช้:
- Config: `config.AppConfig.Git` (RepoPath, RepoURL) และ `config.AppConfig.GitHub` (Token, Branch ฯลฯ)
- GitHub: `pkg/github` เรียก GitHub API สำหรับ list ไฟล์และอ่านเนื้อหา

---

## 3. การเชื่อมต่อ (Connections)

### 3.1 Backend (Go + Fiber)

- **พอร์ต:** จาก `.env` เช่น `SERVER_PORT=8080`
- **Config:** โหลดจาก `.env` ผ่าน `config.Load()` → `config.AppConfig` (Server, Database, Ollama, GitHub, Git)

### 3.2 ฐานข้อมูล (Postgres + pgvector)

- **การเชื่อมต่อ:** DSN จาก `config.AppConfig.Database` (Host, Port, User, Password, DB_NAME, SSLMode)  
  ใช้ใน `database.Connect()` (GORM)
- **ตารางที่ใช้กับ RAG:**
  - **documents** — หนึ่งแถวต่อหนึ่งเอกสาร (path, title, source, created_at, updated_at)
  - **document_chunks** — แต่ละแถวคือหนึ่ง chunk (document_id, chunk_index, content, **embedding** vector 768 มิติ, created_at)

### 3.3 Ollama

- **URL:** จาก `.env` เช่น `OLLAMA_URL` (ได้ทั้ง local หรือ VM หัวหน้า)
- **สองแบบการเรียก:**
  - **Embed:** `OLLAMA_EMBED_MODEL` (เช่น nomic-embed-text) ใช้สร้าง vector ของข้อความ (สำหรับ index และคำถาม)
  - **Chat:** `OLLAMA_CHAT_MODEL` (เช่น gemma3:1b) ใช้สร้างคำตอบจาก prompt (context + คำถาม)
- **Client:** `pkg/ollama` — `NewEmbedClient()` และ `NewClient()` เรียก API ของ Ollama (และรองรับ `OLLAMA_INSECURE_SKIP_VERIFY` ถ้าใช้ TLS self-signed)

### 3.4 Frontend (Next.js)

- **Base URL ไป Backend:** จาก `NEXT_PUBLIC_API_URL` หรือ default `http://localhost:8080`
- เรียก API ผ่าน `frontend/user/lib/wiki-api.ts` (wiki, documents, chat)

---

## 4. การแอคชั่นต่างๆ (Actions)

### 4.1 การอัปเดตโฟลเดอร์ wiki (Sync)

- **ทางเลือกที่ 1: GitHub Webhook**  
  - เมื่อมี **push** ไป branch ที่กำหนด (เช่น `wiki-content`)  
  - GitHub ส่ง POST มาที่ **Webhook URL** ที่ตั้งไว้  
  - Backend รับที่ route ที่ลงทะเบียนใน `RegisterWebhook` (เช่น POST สำหรับ webhook)
- **Handler (HandlePush):**
  1. ตรวจ event = `push` และ (ถ้ามี) ตรวจ HMAC จาก `GITHUB_WEBHOOK_SECRET`
  2. ตรวจว่า `payload.Ref` ตรงกับ branch ที่กำหนด
  3. เรียก **WikiSyncService.Sync()** → ทำ **git pull** (หรือ clone ถ้ายังไม่มี) ที่ `GIT_REPO_PATH`
  4. เรียก **IndexingService.IndexAll()** ใน goroutine (พร้อม timeout) เพื่อ reindex ทั้งก้อน
  5. ตอบ JSON กลับทันที (ไม่รอ index จบ)
- ผล: โฟลเดอร์ wiki-content อัปเดต และข้อมูลใน Postgres/pgvector ถูก rebuild ตามเนื้อหาล่าสุด

### 4.2 การ Reindex เอง (ไม่ผ่าน Webhook)

- **Route:** `POST /api/index/rebuild`
- **Handler:** เรียก **IndexingService.IndexAll(ctx)** ใน goroutine (timeout 5 นาที) แล้วตอบ **202 Accepted** + `{"message":"reindex started (running in background)"}`
- **IndexAll ทำอะไร:**
  1. เรียก **WikiService.ListMarkdown()** ได้รายการ .md ทั้งหมด
  2. แต่ละไฟล์: เรียก **indexSingle(path)**
     - **GetContent(path)** อ่านเนื้อหา
     - **Upsert** แถวใน `documents` (path, title, source)
     - **แบ่งเนื้อหา** เป็น chunk ไม่เกิน `maxChunkChars` (4000 ตัวอักษร) ต่อชิ้น พยายามตัดที่ newline
     - แต่ละ chunk: เรียก **Ollama Embed API** ได้ vector 768 มิติ
     - ลบ chunk เก่าของ doc นั้นใน `document_chunks` แล้ว **INSERT** chunk ใหม่ (document_id, chunk_index, content, embedding)
  3. ถ้า embed ล้มเหลวหรือได้ vector ว่าง → skip ไฟล์นั้น (log แล้วไปไฟล์ถัดไป)

### 4.3 API สำหรับ Frontend (Wiki)

- **GET /api/wiki/list**  
  - เรียก `WikiService.ListMarkdown()`  
  - คืน `{ "items": [ { "path", "title", ... } ] }` เรียงตาม path
- **GET /api/wiki/categories**  
  - เรียก `WikiService.ListCategories()`  
  - คืน `{ "items": [ { "slug": "..." } ] }`
- **GET /api/wiki/category/:slug**  
  - เรียก `WikiService.ListByCategory(slug)`  
  - คืน `{ "category", "items": [ { "slug", "title", "path" } ] }`
- **GET /api/wiki/content/***  
  - เรียก `WikiService.GetContent(path)`  
  - คืน `{ "path", "title", "content", ... }`

การเชื่อมต่อ: Frontend เรียก backend ตาม `NEXT_PUBLIC_API_URL`; backend ใช้ WikiService ซึ่งอ่านจาก local หรือ GitHub ตามที่อธิบายในหัวข้อ 2

### 4.4 API รายการเอกสารที่ index แล้ว

- **GET /api/documents**  
  - Query Postgres: `documents` join นับจำนวน chunk ใน `document_chunks`  
  - คืน `{ "items": [ { "id", "path", "title", "source", "chunk_count", "created_at", "updated_at" } ] }` เรียง path, id  
  - ใช้โชว์หน้าบ้านว่า “มีเอกสารอะไรในระบบ RAG บ้าง”

---

## 5. แชทบอท (RAG) — ตั้งแต่คำถามถึงคำตอบ

### 5.1 จุดเข้า

- **Frontend:** หน้า `/chat` — ผู้ใช้พิมพ์คำถามแล้วกดส่ง  
  - เรียก `askChat(question)` ใน `wiki-api.ts`  
  - ส่ง **POST /api/chat/ask** body `{ "question": "..." }`
- **Backend:** `ChatHandler.Ask(c)` รับ body แล้วดึง `question`

### 5.2 ขั้นตอนใน Backend (Ask)

1. **สร้าง embedding ของคำถาม**  
   - เรียก **embedLLM.Embedding(question)** → ยิงไป Ollama Embed API  
   - ได้ `[]float32` ความยาว 768  
   - แปลงเป็น string รูปแบบ pgvector (เช่น `[0.1,-0.2,...]`) ด้วย `utils.Float32SliceToPgVector`

2. **ตัด topic จากคำถาม (ไม่ hardcode)**  
   - เรียก **buildPathFilterFromQuestion(question)**  
   - ใช้รายการ **topicPathRules**: แต่ละ rule มีคำสำคัญ (เช่น vendor, configuration, ar, ap, asset, gl) และเงื่อนไข path (เช่น `d.path ILIKE '%vendor%'`, `%configuration%`, `%AR-%` ฯลฯ)  
   - ถ้าคำถามมีคำใน rule ใด → สร้าง **WHERE (d.path ILIKE ... OR ...)** ตาม rule นั้น  
   - ถ้าไม่ match rule ใด → ไม่ใส่ WHERE (ค้นทั้งก้อน)

3. **ค้น vector ใน Postgres**  
   - Query ตัวอย่าง:  
     `SELECT d.path, d.title, dc.content FROM document_chunks dc JOIN documents d ON dc.document_id = d.id [WHERE ...] ORDER BY dc.embedding <-> $1::vector LIMIT 10`  
   - ใช้ระยะ **cosine distance** (`<->`) ระหว่าง embedding คำถามกับ `dc.embedding`  
   - ได้สูงสุด 10 แถว (path, title, content) เรียงจากใกล้ที่สุด

4. **รวม context และ sources**  
   - ต่อเนื้อหาแต่ละแถวเป็นข้อความยาว (จำกัดความยาวรวมและต่อ chunk เพื่อกัน prompt ยาวเกิน)  
   - เก็บ list **sources** จาก path/title ของแต่ละ chunk ที่ใช้

5. **สร้างคำตอบด้วย Ollama**  
   - เรียก **llm.GenerateAnswer(context, question)**  
   - ใน `pkg/ollama`: ส่ง prompt ไป Ollama **Chat API** โดยบอกให้ “ตอบจาก Context เท่านั้น สรุปกระชับ ไม่ใส่คำว่า Context หรือ --- Context --- ในคำตอบ ถ้าไม่มีข้อมูลให้บอกไม่พบ”  
   - ได้ข้อความคำตอบกลับมา

6. **ตอบกลับ**  
   - คืน JSON `{ "answer": "...", "sources": [ { "articleId", "title" } ] }`  
   - Frontend แสดงคำตอบและรายการอ้างอิง

### 5.3 การเชื่อมต่อที่ใช้ในแชท

- **Postgres:** อ่านจาก `document_chunks` + `documents` (embedding และเนื้อหา)
- **Ollama:**  
  - ครั้งที่ 1: Embed model สำหรับ embedding คำถาม  
  - ครั้งที่ 2: Chat model สำหรับสร้างคำตอบจาก context + question

---

## 6. สรุป Flow หลัก

| ขั้นตอน | สิ่งที่เกิดขึ้น | การเชื่อมต่อที่ใช้ |
|--------|----------------|---------------------|
| 1) ข้อมูลเข้า wiki | ไฟล์ .md อยู่ใน repo/โฟลเดอร์ wiki-content; อัปเดตได้ด้วย git pull (มือหรือ webhook) | Git, GitHub API (ถ้าใช้) |
| 2) Sync (ถ้าใช้ webhook) | Push → Webhook → Sync() → git pull | GitHub → Backend → โฟลเดอร์ local |
| 3) Index | POST /api/index/rebuild หรือหลัง webhook → IndexAll() → อ่าน wiki, chunk, embed, เขียน DB | WikiService, Ollama (embed), Postgres |
| 4) โชว์ wiki / รายการ | GET /api/wiki/*, GET /api/documents | Frontend → Backend → WikiService หรือ DB |
| 5) ถามแชท | POST /api/chat/ask → embed คำถาม, ค้น pgvector (อาจกรอง path ตาม topic), สร้าง context, ส่ง Ollama chat → คืน answer + sources | Backend ↔ Postgres (vector search), Backend ↔ Ollama (embed + chat) |

ทั้งระบบทำงานแบบนี้: ข้อมูลเข้า wiki (local/GitHub) → sync/index เข้า Postgres (pgvector) → แชทบอทใช้ embedding + vector search + Ollama เพื่อตอบจากคู่มือที่ index ไว้ โดยไม่ hardcode หมวดในโค้ด (ใช้ topicPathRules แบบ data-driven แทน)
