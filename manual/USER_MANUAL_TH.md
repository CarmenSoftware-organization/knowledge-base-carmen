# คู่มือการใช้งานระบบ KB-Carmen (ฉบับภาษาไทย)

เอกสารนี้สรุปการทำงานทั้งระบบของโปรเจค `knowledge-base-carmen` แบบ end-to-end:
- Frontend (เว็บ Knowledge Base + Chat Widget)
- Backend (Go API + native RAG chatbot)
- ขั้นตอนเพิ่ม/ซิงก์ข้อมูลไป Wiki.js และ PostgreSQL
- คำสั่งใช้งานหลักสำหรับทีม Dev/Ops/Content

---

## 1) ภาพรวมสถาปัตยกรรมระบบ

ระบบประกอบด้วย 4 ชั้นหลัก:

1. **Content Source (Git Repo / Markdown)**
   - ไฟล์เนื้อหาอยู่ใน `contents/<bu>/...` (เช่น `contents/carmen`, `contents/blueledgers`)
   - ใช้เป็น source of truth ของเอกสาร

2. **Wiki.js Layer**
   - ใช้สคริปต์นำเข้า Markdown ไปยัง Wiki.js
   - เหมาะสำหรับการจัดการหน้าเอกสารในระบบ Wiki

3. **Backend + Database Layer**
   - Go Backend (`backend`) เป็น API กลาง รวม native RAG chatbot ที่ `/api/chat/*`
   - PostgreSQL + pgvector เก็บ:
     - ดัชนีเอกสาร (`public.documents`, `public.document_chunks` แยกแต่ละ BU ด้วยคอลัมน์ `bu_id`)
     - แชต/กิจกรรม (`public.chat_history`, `public.activity_logs`)
     - FAQ tree (`public.faq_*`)

4. **Frontend Layer**
   - Next.js (`frontend-next`) แสดงบทความ KB, FAQ, Activity และ Chat Widget
   - เรียก API ที่ Go Backend เป็นหลัก

---

## 2) โครงสร้างโฟลเดอร์ที่สำคัญ

- `backend/` — Go Fiber API + migrations + reindex/sync logic + native RAG chatbot
- `frontend-next/` — Next.js App Router UI
- `scripts/` — ชุดสคริปต์ import/sync/reindex/seed FAQ
- `contents/` — ไฟล์ markdown เนื้อหาความรู้

---

## 3) การไหลของข้อมูล (Data Flow)

### 3.1 Flow แสดงบทความ KB

1. ผู้ใช้เปิดหน้าเว็บ (`frontend-next`)
2. Frontend เรียก Go API เช่น:
   - `/api/wiki/categories`
   - `/api/wiki/category/:slug`
   - `/api/wiki/content/*`
3. Go Backend อ่านเนื้อหาจาก local wiki content path และ/หรือ GitHub content
4. ส่ง markdown + metadata กลับ Frontend เพื่อ render

### 3.2 Flow แชตบอท

1. ผู้ใช้พิมพ์คำถามใน Floating Chat
2. Frontend ยิง `POST /api/chat/stream` ไป Go Backend
3. Go Backend ประมวลผล native RAG pipeline:
   - Intent detection
   - Query rewrite (กรณี follow-up)
   - Retrieval จาก PostgreSQL (`documents/chunks`) ผ่าน hybrid search (pgvector + FTS + RRF)
   - สร้าง prompt + เรียก LLM
   - ส่งผลแบบ NDJSON stream (`chunk`, `status`, `sources`, `suggestions`, `done`)
4. Frontend แสดงผลแบบพิมพ์ทีละตัว + แหล่งอ้างอิง

### 3.3 Flow อัปเดตข้อมูลความรู้

1. แก้ไฟล์ markdown ใน `contents/<bu>/...`
2. (ทางเลือก) import ไป Wiki.js ด้วยสคริปต์
3. เรียก backend sync + reindex
4. Go สร้าง/อัปเดต index ใน `public.documents` และ `public.document_chunks` (แยกด้วย `bu_id`)
5. Chatbot ใช้ดัชนีใหม่ตอบคำถาม

---

## 4) Business Unit (BU) และ Multi-tenant

ระบบรองรับหลาย BU เช่น `carmen`, `blueledgers`, `training_center`

- แต่ละ BU = **แถว** ใน `public.business_units` (`id` = `bu_id` ชนิด UUID) — ทุกตารางข้อมูล (`documents`, `document_chunks`, `chat_history`, `activity_logs`, `faq_*`) อยู่ใน schema `public` แยกแต่ละ BU ด้วยคอลัมน์ `bu_id`
- ทุก id/FK เป็น **UUID** (UUIDv7 generate ฝั่ง Go ด้วย `uuid.NewV7()`)
- ใช้ slug เดียวกันทั้ง `business_units.slug`, routing key (`?bu=<slug>`) และโฟลเดอร์ `contents/<slug>/`
- Slug ต้องตรง regex `^[a-zA-Z_][a-zA-Z0-9_]*$` (slug = ชื่อโฟลเดอร์ `contents/<slug>/` + routing key)
- เลือก BU ผ่าน query `?bu=<slug>` (frontend เก็บค่าใน cookie `selected_bu`)
- การ reindex ต้องระบุ BU ให้ชัดเจนเพื่อไม่ให้ผิด tenant
- รายละเอียดการเพิ่ม/ลบ BU: ดู `HANDOVER-ADD-NEW-BU.md`

---

## 5) การติดตั้งและรันระบบ

## 5.1 วิธีเร็วสุด: Docker Compose (แนะนำ)

> **หมายเหตุ:** `docker compose` (อยู่ที่ `backend/`) รันเฉพาะ `backend` — ต่อ Postgres ภายนอกผ่าน `backend/.env.docker`; frontend รันแยกต่างหาก (deploy บน Vercel)

จาก `backend/`:

```bash
cd backend
cp docker-compose.env.example .env.docker
# แก้ค่าใน .env.docker: DB_* (Postgres ภายนอก) + secrets เช่น OPENROUTER_API_KEY, JWT_SECRET, PRIVACY_HMAC_SECRET, GITHUB_TOKEN
docker compose --env-file .env.docker up --build
```

รัน migration ครั้งแรก (กับ DB ภายนอก, จาก root ของ repo):

```bash
./scripts/migrate-docker.sh
```

> ⚠️ **อย่าใช้** `./server migrate` กับไฟล์ที่มี PL/pgSQL (`DO $$...$$` เช่น `0001_init_schema.sql`, `0003_convert_ids_to_uuid.sql`) — Go binary ตัด `;` ผิด ใช้ `migrate-docker.sh` (ผ่าน psql) หรือ `psql` ตรงๆ ตามลำดับใน `backend/migrations/README.md`

health check:

```bash
curl http://localhost:8080/health
```

## 5.2 รันแยกบริการแบบ Local

> **หมายเหตุ:** `docker compose` (อยู่ที่ `backend/`) รันเฉพาะ `backend` — ต่อ Postgres ภายนอกผ่าน `backend/.env.docker`; frontend รันแยกต่างหาก (deploy บน Vercel)

### Backend (Go)

```bash
cd backend
go mod download
cp .env.example .env
go run cmd/server/main.go
```

คำสั่งผ่าน Makefile:

```bash
cd backend
make run
make dev
make test
make build
```

### Frontend (Next.js) — รันแยก / deploy บน Vercel

```bash
cd frontend
npm install
npm run dev
```

คำสั่งหลัก:

```bash
npm run build
npm run start
npm run lint
npm test
```

---

## 6) Environment Variables สำคัญ

## 6.1 Backend (Go)

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SCHEMA`
- `ADMIN_API_KEY` (ใช้กับ endpoint admin)
- `INTERNAL_API_KEY` (internal record-history)
- `PRIVACY_HMAC_SECRET` (hash user id)
- `GIT_REPO_PATH`, `WIKI_CONTENT_PATH`
- `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_BRANCH`
- `OPENROUTER_API_KEY`, `OPENROUTER_EMBED_MODEL`
- `LLM_API_KEY`, `LLM_API_BASE`, `LLM_CHAT_MODEL`, `LLM_INTENT_MODEL`, `LLM_EMBED_MODEL` (native RAG chatbot)
- `LLM_FALLBACK_MODEL` (optional — retry เมื่อ chat model หลักล่ม), `MAX_PROMPT_TOKENS`
- `VECTOR_DIMENSION` (ต้องตรงกับ schema DB)
- `RATE_LIMIT_PER_MINUTE` (per-IP), `DAILY_REQUEST_LIMIT` (daily cap, 0 = ไม่จำกัด)
- `CHAT_CONFIG_DIR` (โฟลเดอร์ YAML tuning/intents/path_rules/prompts), `CHAT_MAX_CONTEXT_CHARS`, `CHAT_MAX_CHUNK_CONTENT`, `CHAT_HISTORY_ENABLED`

## 6.2 Frontend

- `NEXT_PUBLIC_API_BASE` (ชี้ไป Go backend)
- `NEXT_PUBLIC_USE_REMOTE_API` (กรณี dev แต่ต้องการใช้ remote API)

---

## 7) คู่มือการเพิ่ม/อัปเดตข้อมูล Wiki.js + PostgreSQL

### 7.0 วิธีหลัก (production): push เข้า main

แค่ commit markdown ใต้ `contents/<bu>/` แล้ว push เข้า `main` — workflow `.github/workflows/auto-provision-sync-reindex.yml` จะทำให้อัตโนมัติ:

1. Detect BU ที่เปลี่ยนจาก path
2. `POST /api/business-units/provision` (insert แถวใน `public.business_units` — ไม่มีการสร้าง schema)
3. `POST /api/wiki/sync`
4. `POST /api/index/rebuild?bu=<bu>` ทุก BU ที่เปลี่ยน

ถ้าลบโฟลเดอร์ BU จนไม่เหลือไฟล์ → workflow จะ **deprovision** (ลบแถว BU — `documents`/`document_chunks` cascade ตาม `bu_id`) อัตโนมัติ

ต้องตั้ง GitHub Actions secrets: `BACKEND_BASE_URL`, `BACKEND_ADMIN_API_KEY`

### 7.A วิธี manual (dev/local) — ลำดับที่แนะนำ

1. ตรวจ/โหลด credential
2. dry-run compare
3. import ไป Wiki.js
4. sync + reindex ไปฐานข้อมูล
5. ตรวจผล audit/status

## 7.1 โหลด Wiki.js Credential

```bash
source ./scripts/wikijs-load-credentials.sh
```

สคริปต์จะดึงค่า token/url จาก env หรือไฟล์ token แล้ว export ไว้ใช้ต่อ

## 7.2 Dry Run ก่อน import

```bash
./scripts/wikijs-dry-run-compare.sh
```

หรือเฉพาะ BU:

```bash
CONTENTS_ROOT="$PWD/contents/blueledgers" ./scripts/wikijs-dry-run-compare.sh
```

## 7.3 Import Markdown ไป Wiki.js

```bash
./scripts/wikijs-import-contents.sh --dry-run --limit 20
./scripts/wikijs-import-contents.sh
```

เฉพาะ BU:

```bash
CONTENTS_ROOT="$PWD/contents/carmen" ./scripts/wikijs-import-contents.sh
```

หมายเหตุ:
- script นี้เน้น create/update
- path บางไฟล์อาจถูก normalize/slugify

## 7.4 Sync Repo + Reindex ลง DB ต่อ BU

```bash
API_BASE=http://localhost:8080 ADMIN_KEY="<admin-key>" ./scripts/sync-wiki-and-reindex-bu.sh blueledgers
```

สคริปต์จะ:
1) `POST /api/wiki/sync`  
2) `POST /api/index/rebuild?bu=<bu>`

## 7.5 กรณี rename/delete เยอะ ให้ clear index ก่อน

```bash
cd backend
go run ./cmd/server/main.go reset index blueledgers
go run ./cmd/server/main.go reindex blueledgers
```

---

## 8) FAQ (public.faq_*) กับ Vector Index ต่างกันอย่างไร

มี 2 data surface แยกกัน:

1. **FAQ tables (`public.faq_*`)**
   - ใช้กับหน้า/endpoint FAQ
   - เติมข้อมูลผ่าน `build_faq_seed_sql.py` + `psql`

2. **Vector index (`public.documents`, `public.document_chunks` แยกด้วย `bu_id`)**
   - ใช้กับ semantic retrieval ของ chatbot/search
   - เติมผ่าน flow sync/reindex

ดังนั้นถ้าต้องการให้ทั้ง FAQ UI และ Chat RAG อัปเดตพร้อมกัน มักต้องทำทั้งสองขั้นตอน

---

## 9) ขั้นตอน Seed FAQ เข้า PostgreSQL

ตัวอย่าง Blueledgers:

```bash
python3 ./scripts/build_faq_seed_sql.py \
  --faq-dir contents/blueledgers/faq \
  --bu blueledgers \
  --out-sql scripts/seed_blueledgers_faq.sql

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/seed_blueledgers_faq.sql
```

ตัวอย่าง Carmen:

```bash
python3 ./scripts/build_faq_seed_sql.py \
  --faq-dir contents/carmen/faq \
  --bu carmen \
  --out-sql scripts/seed_carmen_faq.sql

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/seed_carmen_faq.sql
```

หมายเหตุ:
- default ของ script จะ purge FAQ เดิมของ BU นั้นก่อน
- ถ้าไม่ต้องการ purge ใช้ `--no-purge`

---

## 10) API สำคัญที่ใช้บ่อย

## 10.1 Backend ทั่วไป

- `GET /health`
- `GET /api/system/status`
- `GET /api/business-units`

## 10.2 Wiki / Content

- `GET /api/wiki/categories`
- `GET /api/wiki/sidebar`
- `GET /api/wiki/category/:slug`
- `GET /api/wiki/content/*`
- `GET /api/wiki/search`
- `POST /api/wiki/sync` (ต้องมี `X-Admin-Key`)
- `GET /api/wiki/sync/audit` (ต้องมี `X-Admin-Key`)

## 10.3 Index

- `POST /api/index/rebuild?bu=...` (`X-Admin-Key`)
- `GET /api/index/rebuild/status?bu=...` (`X-Admin-Key`)

## 10.4 Chat

- `POST /api/chat/ask` (sync style)
- `POST /api/chat/stream` (stream style)
- `DELETE /api/chat/clear/:room_id`
- `POST /api/chat/feedback/:message_id`

## 10.5 FAQ

- `GET /api/faq/modules`
- `GET /api/faq/:module`
- `GET /api/faq/:module/:sub/:category`

---

## 11) คำสั่งตรวจสอบและดีบักที่ควรรู้

เช็คสถานะ index:

```bash
curl -H "X-Admin-Key: <admin-key>" "http://localhost:8080/api/index/rebuild/status?bu=carmen"
```

เช็ค sync audit:

```bash
curl -H "X-Admin-Key: <admin-key>" "http://localhost:8080/api/wiki/sync/audit"
```

ทดสอบ health:

```bash
curl http://localhost:8080/health
```

---

## 12) Operational Runbook (ฉบับสั้น)

**Production** — แค่ push เข้า `main` (auto-provision workflow ทำงานต่อ)

**Manual** เมื่อมีการอัปเดต markdown:

```bash
# (ทางเลือก) import ไป Wiki.js ด้วย
source ./scripts/wikijs-load-credentials.sh
CONTENTS_ROOT="$PWD/contents/<bu>" ./scripts/wikijs-import-contents.sh --dry-run --limit 20
CONTENTS_ROOT="$PWD/contents/<bu>" ./scripts/wikijs-import-contents.sh

# Sync repo + reindex
API_BASE=http://localhost:8080 ADMIN_KEY="<admin-key>" ./scripts/sync-wiki-and-reindex-bu.sh <bu>
```

ถ้าเพิ่ม BU ใหม่แบบ manual:

```bash
API_BASE=http://localhost:8080 ADMIN_KEY="<admin-key>" ./scripts/provision-bu.sh <bu>
```

ถ้าลบ BU แบบ manual:

```bash
API_BASE=http://localhost:8080 ADMIN_KEY="<admin-key>" ./scripts/deprovision-bu.sh <bu>
```

ถ้ามีการลบ/ย้ายไฟล์จำนวนมาก (clear index ก่อน reindex):

```bash
cd backend
go run ./cmd/server/main.go reset index <bu>
go run ./cmd/server/main.go reindex <bu>
```

ถ้ามี FAQ ใหม่:

```bash
python3 ./scripts/build_faq_seed_sql.py --faq-dir contents/<bu>/faq --bu <bu> --out-sql scripts/seed_<bu>_faq.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/seed_<bu>_faq.sql
```

---

## 13) หมายเหตุสำคัญด้านความปลอดภัย/การใช้งาน

- ตั้งค่า `PRIVACY_HMAC_SECRET` ให้แข็งแรง
- `ADMIN_API_KEY`/`INTERNAL_API_KEY` ห้าม hardcode ในโค้ดหรือ push ขึ้น repo
- ใน production ควรจำกัด `CORS_ORIGINS` เฉพาะโดเมนจริง
- ตรวจให้ `VECTOR_DIMENSION` ตรงกับ column ใน DB migration
- หาก backend รันบนเครื่องอื่น จำไว้ว่าการ sync จาก git ใช้ไฟล์ที่เครื่อง backend ดึงได้จริง

---

## 14) เช็กลิสต์ก่อนขึ้น Production

- [ ] ตั้งค่า secrets ครบ (`OPENROUTER_API_KEY`, `JWT_SECRET`, `PRIVACY_HMAC_SECRET`, `GITHUB_TOKEN`)
- [ ] `VECTOR_DIMENSION` ตรงกับมิติของ column ใน DB (canonical = **2000** ใน `0001_init_schema.sql`)
- [ ] รัน migrations ครบ (ผ่าน psql ตามลำดับใน `backend/migrations/README.md`)
- [ ] ทดสอบ `health` ของ Go backend (`curl http://.../health`)
- [ ] ทดสอบ `/api/wiki/sync` + `/api/index/rebuild`
- [ ] ทดสอบ chat stream + feedback
- [ ] ทดสอบ FAQ API
- [ ] ทดสอบ CORS จาก frontend domain จริง
- [ ] ตั้ง GitHub Actions secrets `BACKEND_BASE_URL` + `BACKEND_ADMIN_API_KEY` (ถ้าใช้ auto-provision workflow)

---

## 15) เอกสารอ้างอิงเพิ่มเติม

- `../README.md` — Quick start + ภาพรวมสั้น
- `../CLAUDE.md` — guidance สำหรับ Claude Code
- `HANDOVER-ADD-NEW-BU.md` — runbook เพิ่ม/ลบ BU + ฟอร์แมต markdown
- `../backend/migrations/README.md` — ลำดับ migration + dimension variants
- RAG pipeline internals: ดู `../docs/superpowers/plans/2026-06-22-chatbot-go-*`

