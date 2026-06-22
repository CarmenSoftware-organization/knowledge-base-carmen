# KB Carmen Monorepo

ระบบ Knowledge Base + AI Chat ของ Carmen/Blueledgers ในรูปแบบ monorepo

ประกอบด้วย:
- `frontend` — Next.js UI (KB, FAQ, Activity, Floating Chat)
- `backend` — Go Fiber API (wiki, index, faq, activity, native RAG chatbot)
- `scripts` — import Wiki.js, sync/reindex, FAQ seed, BU ops
- `contents` — markdown source ของเอกสารความรู้ จัดเป็น `contents/<bu-slug>/...`

## สถาปัตยกรรม

1. Frontend เรียก Go backend เป็นหลัก (`/api/wiki/*`, `/api/chat/*`, `/api/faq/*`, `/api/activity/*`, `/api/business-units`)
2. Go backend ให้บริการ `/api/chat/*` โดยตรง (native RAG — intent → hybrid retrieval pgvector+FTS+RRF → LLM → stream NDJSON)
3. Go backend ใช้ Postgres+pgvector ตัวเดียวกันกับส่วน wiki/index
4. เอกสารถูกอ่านจาก markdown ใน `contents/<bu>/...` แล้ว index ลง `<bu>.documents` / `<bu>.document_chunks`
5. FAQ แยกอยู่ใน `public.faq_*` (seed ด้วย `scripts/build_faq_seed_sql.py`)

### Multi-BU model

แต่ละ Business Unit คือ Postgres **schema** ที่ลงทะเบียนใน `public.business_units` — ใช้ slug เดียวกันทั้ง schema name และโฟลเดอร์ `contents/<slug>/`

- Slug ต้องตรง regex `^[a-zA-Z_][a-zA-Z0-9_]*$` (**ห้ามมี `-`** เพราะใช้เป็นชื่อ schema)
- เลือก BU ผ่าน query `?bu=<slug>` ในทุก endpoint
- รายละเอียดเพิ่ม BU ใหม่: ดู `HANDOVER-ADD-NEW-BU.md`

### Auto-provision (production)

มี workflow `.github/workflows/auto-provision-sync-reindex.yml` — push ไฟล์ใต้ `contents/**` เข้า `main` แล้วระบบจะ:
1. Detect BU ที่เปลี่ยนจาก path
2. เรียก `POST /api/business-units/provision` (สร้าง schema + tables)
3. เรียก `POST /api/wiki/sync` แล้ว `POST /api/index/rebuild?bu=<bu>`
4. ถ้าลบโฟลเดอร์ BU จนหมด จะ deprovision (drop schema)

ต้องตั้ง GitHub Actions secrets: `BACKEND_BASE_URL`, `BACKEND_ADMIN_API_KEY`

## Quick Start (Docker Compose)

```bash
cp docker-compose.env.example .env.docker
# แก้ค่า secrets ใน .env.docker เช่น OPENROUTER_API_KEY, JWT_SECRET, PRIVACY_HMAC_SECRET
docker compose --env-file .env.docker up --build
./scripts/migrate-docker.sh    # รัน migration ครั้งแรก (ใช้ psql ใน container db)
```

ตรวจ health:
```bash
curl http://localhost:8080/health        # Go backend
```

> **อย่าใช้** `./server migrate` กับไฟล์ที่มี PL/pgSQL (`DO $$...$$`) — มันจะตัด `;` ผิด ใช้ `migrate-docker.sh` หรือ `psql` ตรงๆ ตามลำดับใน `backend/migrations/README.md`

## Quick Start (Run แยกบริการ)

> **หมายเหตุ:** `docker compose` รันเฉพาะ `db` + `backend` — frontend รันแยกต่างหาก

```bash
# Backend (Go)
cd backend && go mod download && cp .env.example .env && make run

# Frontend (Next.js) — รันแยก (deploy บน Vercel)
cd frontend && npm install && npm run dev
```

คำสั่งหลักรายบริการอยู่ใน README ของแต่ละโฟลเดอร์ (`backend/`, `frontend/`)

## Deploy

| บริการ | Platform | วิธี |
|--------|----------|------|
| **Backend** (Go) | Render | `render.yaml` Blueprint — `carmen-backend` + `carmen-db` |
| **Frontend** (Next.js) | Vercel | เชื่อมต่อ repo + ตั้ง Root Directory = `frontend` |

Backend: หลัง push เปิด Render Blueprint แล้วตั้งค่า secret env ที่ `sync: false`  
Frontend: ตั้ง `NEXT_PUBLIC_API_BASE` = URL ของ Go backend บน Vercel

## Workflow อัปเดตข้อมูลความรู้

วิธีปกติ (production): commit markdown ใต้ `contents/<bu>/` แล้ว push เข้า `main` — workflow จัดการ provision/sync/reindex ให้อัตโนมัติ

วิธี manual:
```bash
# Sync wiki + reindex ทีละ BU
API_BASE=http://localhost:8080 ADMIN_KEY="<admin-key>" ./scripts/sync-wiki-and-reindex-bu.sh <bu>

# Seed FAQ tables
python3 scripts/build_faq_seed_sql.py --faq-dir contents/<bu>/faq --bu <bu> --out-sql scripts/seed_<bu>_faq.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/seed_<bu>_faq.sql
```

import จาก Wiki.js (ทางเลือก):
```bash
source ./scripts/wikijs-load-credentials.sh
CONTENTS_ROOT="$PWD/contents/<bu>" ./scripts/wikijs-import-contents.sh --dry-run --limit 20
CONTENTS_ROOT="$PWD/contents/<bu>" ./scripts/wikijs-import-contents.sh
```

## เอกสารย่อย

- `CLAUDE.md` — guidance สำหรับ Claude Code (สรุปสถาปัตยกรรม + gotchas)
- `HANDOVER-ADD-NEW-BU.md` — runbook เพิ่ม/ลบ BU + ฟอร์แมต markdown
- `USER_MANUAL_TH.md` — คู่มือผู้ใช้ภาษาไทย
- `backend/README.md`, `backend/migrations/README.md` — backend API + ลำดับ migration
- `frontend/README.md` — frontend routes + env
- RAG pipeline internals: ดู `docs/superpowers/plans/2026-06-22-chatbot-go-*`
