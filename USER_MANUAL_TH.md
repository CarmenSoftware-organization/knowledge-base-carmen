# คู่มือการใช้งานระบบ KB-Carmen (ฉบับภาษาไทย)

เอกสารนี้สรุปการทำงานทั้งระบบของโปรเจค `kb-carmen` แบบ end-to-end:
- Frontend (เว็บ Knowledge Base + Chat Widget)
- Backend (Go API)
- Chatbot Service (Python FastAPI + RAG)
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
   - Go Backend (`backend`) เป็น API กลาง
   - PostgreSQL + pgvector เก็บ:
     - ดัชนีเอกสาร (`<bu>.documents`, `<bu>.document_chunks`)
     - แชต/กิจกรรม (`public.chat_history`, `public.activity_logs`)
     - FAQ tree (`public.faq_*`)

4. **Chatbot Layer**
   - Python Chatbot (`carmen-chatbot`) ทำงาน RAG/Intent/Stream
   - Go Backend ทำหน้าที่ proxy บาง endpoint ไปยัง Python

5. **Frontend Layer**
   - Next.js (`frontend/user`) แสดงบทความ KB, FAQ, Activity และ Chat Widget
   - เรียก API ที่ Go Backend เป็นหลัก

---

## 2) โครงสร้างโฟลเดอร์ที่สำคัญ

- `backend/` — Go Fiber API + migrations + reindex/sync logic
- `frontend/user/` — Next.js App Router UI
- `carmen-chatbot/` — Python FastAPI chatbot + RAG pipeline
- `scripts/` — ชุดสคริปต์ import/sync/reindex/seed FAQ
- `contents/` — ไฟล์ markdown เนื้อหาความรู้

---

## 3) การไหลของข้อมูล (Data Flow)

### 3.1 Flow แสดงบทความ KB

1. ผู้ใช้เปิดหน้าเว็บ (`frontend/user`)
2. Frontend เรียก Go API เช่น:
   - `/api/wiki/categories`
   - `/api/wiki/category/:slug`
   - `/api/wiki/content/*`
3. Go Backend อ่านเนื้อหาจาก local wiki content path และ/หรือ GitHub content
4. ส่ง markdown + metadata กลับ Frontend เพื่อ render

### 3.2 Flow แชตบอท

1. ผู้ใช้พิมพ์คำถามใน Floating Chat
2. Frontend ยิง `POST /api/chat/stream` ไป Go Backend
3. Go proxy ไป Python Chatbot (`PYTHON_CHATBOT_URL`)
4. Python ทำ pipeline:
   - Intent detection
   - Query rewrite (กรณี follow-up)
   - Retrieval จาก PostgreSQL (`documents/chunks`)
   - สร้าง prompt + เรียก LLM
   - ส่งผลแบบ NDJSON stream (`chunk`, `status`, `sources`, `suggestions`, `done`)
5. Frontend แสดงผลแบบพิมพ์ทีละตัว + แหล่งอ้างอิง

### 3.3 Flow อัปเดตข้อมูลความรู้

1. แก้ไฟล์ markdown ใน `contents/<bu>/...`
2. (ทางเลือก) import ไป Wiki.js ด้วยสคริปต์
3. เรียก backend sync + reindex
4. Go สร้าง/อัปเดต index ใน `<bu>.documents` และ `<bu>.document_chunks`
5. Chatbot ใช้ดัชนีใหม่ตอบคำถาม

---

## 4) Business Unit (BU) และ Multi-tenant

ระบบรองรับหลาย BU เช่น `carmen`, `blueledgers`

- โครงสร้าง index แยก schema ต่อ BU ใน Postgres
- เลือก BU ผ่าน query/header/cookie (`bu`, `X-BU-Slug`, `selected_bu`)
- การ reindex ต้องระบุ BU ให้ชัดเจนเพื่อไม่ให้ผิด tenant

---

## 5) การติดตั้งและรันระบบ

## 5.1 วิธีเร็วสุด: Docker Compose (แนะนำ)

จาก root repo:

```bash
cp docker-compose.env.example .env.docker
# แก้ค่าที่จำเป็นใน .env.docker เช่น OPENROUTER_API_KEY, JWT_SECRET, PRIVACY_HMAC_SECRET, GITHUB_TOKEN
docker compose --env-file .env.docker up --build
```

รัน migration ครั้งแรก:

```bash
./scripts/migrate-docker.sh
```

health check:

```bash
curl http://localhost:8080/health
curl http://localhost:8000/api/health
```

## 5.2 รันแยกบริการแบบ Local

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

### Chatbot (Python)

```bash
cd carmen-chatbot
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python start_server.py
```

หรือ:

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend (Next.js)

```bash
cd frontend/user
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
- `PYTHON_CHATBOT_URL` (URL Python chatbot)
- `GIT_REPO_PATH`, `WIKI_CONTENT_PATH`
- `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_BRANCH`
- `OPENROUTER_API_KEY`, `OPENROUTER_EMBED_MODEL`

## 6.2 Chatbot (Python)

- `LLM_API_KEY`, `LLM_API_BASE`
- `LLM_CHAT_MODEL`, `LLM_INTENT_MODEL`, `LLM_EMBED_MODEL`
- `DB_*` (เชื่อม PostgreSQL)
- `VECTOR_DIMENSION` (ต้องตรงกับ schema DB)
- `GO_BACKEND_URL`, `GO_BACKEND_INTERNAL_API_KEY`
- `PRIVACY_HMAC_SECRET` (ต้องใช้ค่าเดียวกับ Go)
- `RATE_LIMIT_PER_MINUTE`, `DAILY_REQUEST_LIMIT`

## 6.3 Frontend

- `NEXT_PUBLIC_API_BASE` (ชี้ไป Go backend)
- `NEXT_PUBLIC_USE_REMOTE_API` (กรณี dev แต่ต้องการใช้ remote API)

---

## 7) คู่มือการเพิ่ม/อัปเดตข้อมูล Wiki.js + PostgreSQL

ลำดับที่แนะนำ:

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

2. **Vector index (`<bu>.documents`, `<bu>.document_chunks`)**
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
curl http://localhost:8000/api/health
```

---

## 12) Operational Runbook (ฉบับสั้น)

เมื่อมีการอัปเดต markdown:

```bash
source ./scripts/wikijs-load-credentials.sh
CONTENTS_ROOT="$PWD/contents/<bu>" ./scripts/wikijs-import-contents.sh --dry-run --limit 20
CONTENTS_ROOT="$PWD/contents/<bu>" ./scripts/wikijs-import-contents.sh
API_BASE=http://localhost:8080 ADMIN_KEY="<admin-key>" ./scripts/sync-wiki-and-reindex-bu.sh <bu>
```

ถ้ามีการลบ/ย้ายไฟล์จำนวนมาก:

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

- ตั้งค่า `PRIVACY_HMAC_SECRET` ให้แข็งแรงและใช้ค่าเดียวกันระหว่าง Go + Python
- `ADMIN_API_KEY`/`INTERNAL_API_KEY` ห้าม hardcode ในโค้ดหรือ push ขึ้น repo
- ใน production ควรจำกัด `CORS_ORIGINS` เฉพาะโดเมนจริง
- ตรวจให้ `VECTOR_DIMENSION` ตรงกับ column ใน DB migration
- หาก backend รันบนเครื่องอื่น จำไว้ว่าการ sync จาก git ใช้ไฟล์ที่เครื่อง backend ดึงได้จริง

---

## 14) เช็กลิสต์ก่อนขึ้น Production

- [ ] ตั้งค่า secrets ครบ (`OPENROUTER_API_KEY`, `JWT_SECRET`, `PRIVACY_HMAC_SECRET`, `GITHUB_TOKEN`)
- [ ] รัน migrations ครบ
- [ ] ทดสอบ `health` ของ Go/Python
- [ ] ทดสอบ `/api/wiki/sync` + `/api/index/rebuild`
- [ ] ทดสอบ chat stream + feedback
- [ ] ทดสอบ FAQ API
- [ ] ทดสอบ CORS จาก frontend domain จริง

