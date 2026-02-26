# Project Manual — New Carmen

เวอร์ชัน: 1.0
วันที่: 2026-02-26
ผู้จัดทำ: ทีมพัฒนา New Carmen

หมายเหตุ: เอกสารนี้สรุปโค้ดและสถาปัตยกรรมจาก repository `new-carmen` (backend + frontend + wiki) ซึ่งจัดเก็บในโฟลเดอร์ของโปรเจค

---

สารบัญ

1. คำนำ
2. บทสรุปผู้บริหาร
3. ขอบเขตและวัตถุประสงค์
4. สถาปัตยกรรมระบบ (Architecture)
5. โครงสร้างโค้ดและโมดูลหลัก
6. รายการ API และตัวอย่าง Request/Response
7. ฐานข้อมูล (Schema & Migrations)
8. กระบวนการจัดการเนื้อหา (Wiki & Sync)
9. Workflow Git และการ Deploy เบื้องต้น
10. การตั้งค่าและรันระบบ (Quick start)
11. ปัญหาและข้อควรระวัง
12. ข้อเสนอแนะสำหรับพัฒนาเพิ่มเติม
13. เอกสารอ้างอิง (References)

---

1. คำนำ

เอกสารฉบับนี้จัดทำขึ้นเพื่อรวบรวมรายละเอียดเชิงเทคนิคของโปรเจค New Carmen ซึ่งเป็นระบบจัดการเอกสารพร้อมความสามารถค้นหาเชิงความหมาย (semantic search) ที่ผสานการใช้งาน LLM และ vector store โดยเอกสารจะครอบคลุมสถาปัตยกรรม การเชื่อมต่อ API โครงสร้างฐานข้อมูล การทำงานของ Wiki และการตั้งค่าสิ่งแวดล้อมสำหรับนักพัฒนาที่ต้องการนำโค้ดไปใช้งานต่อหรือทำงานร่วมกัน

2. บทสรุปผู้บริหาร

New Carmen ประกอบด้วย 3 ส่วนหลัก: (1) Wiki.js สำหรับจัดการเนื้อหา Markdown (host บน VM) (2) Backend — Go (Fiber) ให้บริการ REST API, indexing และเชื่อมต่อกับ Ollama/ChromaDB/Neon และ (3) Frontend — วางแผนใช้ Next.js สำหรับ UI ค้นหา/Chat (ยังไม่สมบูรณ์ใน repo)

3. ขอบเขตและวัตถุประสงค์

- รวบรวมและจัดทำเอกสารโครงสร้างโปรเจค รวม API, DB, workflow
- ให้แนวทางการติดตั้งและ migration เบื้องต้น
- ช่วยให้ทีม frontend สามารถใช้งาน API และ mock ได้

4. สถาปัตยกรรมระบบ (Architecture)

สรุปองค์ประกอบหลักและการไหลของข้อมูล (ดูรายละเอียดเพิ่มเติมที่ `docs/architecture.md`):

- Frontend (Next.js): UI สำหรับค้นหา/Chat
- Backend (Go + Fiber): API, Indexing, GitHub webhook, Ollama client
- Wiki.js: จัดการเนื้อหา Markdown → push ขึ้น GitHub
- N8N (แผน): Orchestration สำหรับสร้าง embedding และอัปเดต Vector DB
- ChromaDB / Postgres (pgvector): Vector store สำหรับ semantic search
- Ollama: LLM สำหรับ chat/embedding

Flow ย่อ:

1. ผู้ใช้แก้เนื้อหาใน Wiki.js → push ขึ้น GitHub
2. GitHub push → webhook (backend) หรือ N8N → backend ดึงไฟล์และสั่ง indexing
3. Indexing: ตัดแบ่งเนื้อหาเป็น chunk → เรียก Ollama Embedding → เก็บ `document_chunks` พร้อม embedding
4. ผู้ใช้ค้นหา → Frontend เรียก backend → backend query vector DB + เรียก Ollama เพื่อสรุป/ให้คำตอบ (RAG)

5. โครงสร้างโค้ดและโมดูลหลัก

- `backend/` — โค้ดหลักของ API (Go)
  - `cmd/server/main.go` — entry point (run server)
  - `internal/router/` — กำหนด routes ทั้งหมด
  - `internal/api/` — HTTP handlers
  - `internal/services/` — business logic: wiki_service, indexing_service, wiki_sync_service
  - `internal/database/` — การเชื่อมต่อ DB และ AutoMigrate helper
  - `pkg/ollama/` — client สำหรับเรียก Ollama (chat/embedding)

- `frontend/` — Next.js project (user app) (ยังไม่สมบูรณ์)
  - `frontend/user/lib/wiki-api.ts` — client functions ที่ frontend เรียกไปยัง backend

- `backend/migrations/` — ไฟล์ SQL migration (มีตัวอย่าง `0001_init_documents.sql`)

6. รายการ API และตัวอย่าง Request/Response

สรุป endpoint ที่มีในโค้ด (ดูเอกสารและตัวอย่างเต็มที่ `docs/api.md`):

- GET /health → {"status":"ok"}
- GET /api/system/status → {status: "ok", message: ""}
- GET /api/documents → คืนรายการเอกสารพร้อมจำนวน chunks
- Wiki endpoints:
  - GET /api/wiki/list
  - GET /api/wiki/categories
  - GET /api/wiki/category/:slug
  - GET /api/wiki/content/\*
  - GET /api/wiki/search?q=...
  - POST /api/wiki/sync
- POST /webhook/github → รับ GitHub push webhook, ตรวจ signature และ trigger sync + indexing
- POST /api/index/rebuild → เริ่ม reindex ทั้งหมด (background job)

หมายเหตุสำคัญ:

- ฝั่ง frontend เรียก `POST /api/chat/ask` แต่ใน backend ปัจจุบันยังไม่มี handler สำหรับ endpoint นี้ — ถ้าต้องการให้ใช้งานได้ต้องเพิ่ม handler ที่สืบค้น vector DB สร้าง context แล้วเรียก `pkg/ollama.Client.GenerateAnswer`

7. ฐานข้อมูล (Schema & Migrations)

สรุปจากโค้ดและ migration ที่เพิ่มไว้ (`backend/migrations/0001_init_documents.sql`):

- ตาราง `documents` — คอลัมน์: `id, path (unique), title, source, created_at, updated_at`
- ตาราง `document_chunks` — คอลัมน์: `id, document_id (FK), chunk_index, content, embedding (VECTOR), created_at`

ข้อสังเกต:

- ต้องติดตั้ง `pgvector` extension หรือ DB ต้องรองรับชนิด `VECTOR` (เช่น Neon + pgvector)
- โฟลเดอร์ `backend/migrations/` มีไฟล์ตัวอย่าง `0001_init_documents.sql` หากต้องการใช้ migration runner (เช่น `psql` หรือ flyway) ให้รันไฟล์นี้บนฐานข้อมูล

8. กระบวนการจัดการเนื้อหา (Wiki & Sync)

- `WikiService` อ่านไฟล์ markdown จาก path ที่กำหนดโดย `config.GetWikiContentPath()` (ค่าเริ่มต้น `./wiki-content`) และ fallback ไปยัง GitHub ถ้าไฟล์ไม่พบแบบ local
- `WikiSyncService` (ใช้ `pkg/github`) ดึง repo มาไว้ที่ local (git pull/clone)
- Webhook: เมื่อ GitHub push จะเรียก `/webhook/github` บน backend เพื่อตรวจ signature และ trigger sync → indexing

9. Workflow Git และการ Deploy เบื้องต้น

- Branches ที่พบ: `main`, `Git-+-wiki`, `wiki-content` และ remotes `origin`, `docscarmen` (เพิ่มเติม)
- แนะนำ workflow: feature branches → PR → merge to `main`. แยก branch สำหรับ wiki content (เช่น `wiki-content`) เพื่อป้องกัน trigger ที่ไม่ตั้งใจ
- ตั้ง GitHub webhook ชี้ไปที่ backend `/webhook/github` และตั้ง `GITHUB_WEBHOOK_SECRET` (env)

10. การตั้งค่าและรันระบบ (Quick start)

Prerequisites:

- Go 1.21+, PostgreSQL (Neon) with `pgvector` extension, Ollama running (หรือ endpoint ที่รองรับ model/embedding), Node 19+ for frontend

ตัวอย่างการรัน backend (local):

```bash
cd backend
go mod download
# สร้างไฟล์ .env ตาม .env.example
# รัน migrations (ด้วย psql หรือ runner ของคุณ)
# ตัวอย่างใช้ psql:
psql "$DATABASE_URL" -f backend/migrations/0001_init_documents.sql

# รัน server
go run cmd/server/main.go
```

Frontend (development):

```bash
cd frontend/user
npm install
npm run dev
```

11. ปัญหาและข้อควรระวัง

- Endpoint `POST /api/chat/ask` ถูกเรียกจาก frontend แต่ backend ยังไม่มี implementation — ต้องเพิ่ม handler และ logic vector search + RAG
- ต้องตรวจสอบ environment variables ใน `.env` (DB, GITHUB token/secret, OLLAMA_URL)
- การเก็บ embedding ใน Postgres ต้องสอดคล้องกับ dimension ของโมเดล embedding (แก้ค่า VECTOR(N) ใน migration)

12. ข้อเสนอแนะสำหรับพัฒนาเพิ่มเติม

- สร้าง OpenAPI spec (Swagger) เพื่อให้ frontend สามารถ mock และทดสอบได้ง่ายขึ้น
- เพิ่มโครงสร้าง CI/CD สำหรับรัน migration, build backend, และ deploy
- เพิ่ม unit/integration tests สำหรับ indexing, wiki parsing, และ webhook handler
- พัฒนา frontend Chat UI และเชื่อม `/api/chat/ask` ตามสเปค

13. เอกสารอ้างอิง (References)

- Repository files:
  - `README.md`
  - `PROJECT_OVERVIEW.md`
  - `backend/README.md`
  - `backend/internal/services/wiki_service.go`
  - `backend/internal/services/indexing_service.go`
  - `backend/pkg/ollama/client.go`
  - `frontend/user/lib/wiki-api.ts`
  - `backend/migrations/0001_init_documents.sql`

- ภายนอก:
  - pgvector: https://github.com/pgvector/pgvector
  - Ollama HTTP API documentation (local deployment) — internal docs

---

ไฟล์ที่สร้าง/อัปเดตโดยเอกสารนี้:

- `docs/architecture.md`, `docs/api.md`, `docs/db.md`, `docs/wiki.md`, `docs/git-workflow.md`, `docs/PROJECT_MANUAL.md`

หากต้องการ ผมสามารถ:

- แยกเอกสารนี้เป็น PDF/LaTeX ตามรูปแบบรายงานมหาวิทยาลัย
- สร้าง OpenAPI spec (YAML/JSON)
- เพิ่มตัวอย่าง implementation สำหรับ `POST /api/chat/ask`
