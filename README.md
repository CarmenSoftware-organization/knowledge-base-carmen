# KB Carmen Monorepo

ระบบ Knowledge Base + AI Chat ของ Carmen/Blueledgers ในรูปแบบ monorepo

ประกอบด้วย:
- `frontend/user` — Next.js UI (KB, FAQ, Activity, Floating Chat)
- `backend` — Go Fiber API (wiki, index, faq, activity, chat proxy)
- `carmen-chatbot` — Python FastAPI RAG chatbot (NDJSON stream)
- `scripts` — import Wiki.js, sync/reindex, FAQ seed, BU ops
- `contents` — markdown source ของเอกสารความรู้

## สถาปัตยกรรมการทำงาน

1. Frontend เรียก Go backend เป็นหลัก (`/api/wiki/*`, `/api/chat/*`, `/api/faq/*`)
2. Go backend proxy endpoint แชตหลักไป Python chatbot (`/api/chat/stream`)
3. Python chatbot ทำ intent + retrieval จาก PostgreSQL/pgvector แล้ว stream คำตอบกลับ
4. ข้อมูลเอกสารถูกอ่านจาก source markdown และถูก index ลง `<bu>.documents` / `<bu>.document_chunks`
5. FAQ แยกอีก surface ใน `public.faq_*` (seed ด้วย script SQL)

## โครงสร้างโปรเจค

```text
kb-carmen/
├── backend/
├── carmen-chatbot/
├── frontend/user/
├── scripts/
├── contents/
├── docker-compose.yml
└── render.yaml
```

## Quick Start (Docker Compose)

```bash
cp docker-compose.env.example .env.docker
# แก้ค่า secrets ใน .env.docker เช่น OPENROUTER_API_KEY, JWT_SECRET, PRIVACY_HMAC_SECRET
docker compose --env-file .env.docker up --build
./scripts/migrate-docker.sh
```

ตรวจ health:

```bash
curl http://localhost:8080/health
curl http://localhost:8000/api/health
```

## Quick Start (Run แยกบริการ)

### 1) Backend (Go)

```bash
cd backend
go mod download
cp .env.example .env
go run cmd/server/main.go
```

### 2) Chatbot (Python)

```bash
cd carmen-chatbot
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python start_server.py
```

### 3) Frontend (Next.js)

```bash
cd frontend/user
npm install
npm run dev
```

## คำสั่งหลักรายบริการ

### Backend (`backend`)

```bash
make run
make dev
make test
make build
```

### Frontend (`frontend/user`)

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
```

### Chatbot (`carmen-chatbot`)

```bash
pytest
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

## Workflow อัปเดตข้อมูลความรู้

### 1) Import markdown ไป Wiki.js

```bash
source ./scripts/wikijs-load-credentials.sh
CONTENTS_ROOT="$PWD/contents/carmen" ./scripts/wikijs-import-contents.sh --dry-run --limit 20
CONTENTS_ROOT="$PWD/contents/carmen" ./scripts/wikijs-import-contents.sh
```

### 2) Sync + Reindex ลง DB/vector

```bash
API_BASE=http://localhost:8080 ADMIN_KEY="<admin-key>" ./scripts/sync-wiki-and-reindex-bu.sh carmen
```

### 3) Seed FAQ tables (ถ้ามี FAQ ใหม่)

```bash
python3 ./scripts/build_faq_seed_sql.py --faq-dir contents/carmen/faq --bu carmen --out-sql scripts/seed_carmen_faq.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/seed_carmen_faq.sql
```

## เอกสารย่อย

- `backend/README.md` — backend API และ migration/indexing commands
- `frontend/user/README.md` — frontend routes, env, chat integration
- `carmen-chatbot/README.md` — RAG pipeline และ chatbot config
- `USER_MANUAL_TH.md` — คู่มือภาษาไทยแบบละเอียดทั้งระบบ
