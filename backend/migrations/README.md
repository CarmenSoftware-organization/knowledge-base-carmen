# Database migrations (PostgreSQL + pgvector)

รัน **ครั้งเดียวต่อ DB ใหม่** หลัง container `db` ขึ้นแล้ว (และมี extension/pgvector พร้อมตามไฟล์)

## วิธีแนะนำ: `psql` ใน container `db`

รองรับ PL/pgSQL / `DO $$` / ฟังก์ชันยาว — ปลอดภัยกว่าการรันผ่าน `./server migrate` ของ Go ที่แยกคำสั่งด้วย `;` (อาจตัดคำสั่งผิดกับบางไฟล์)

จาก **root ของ repo** (หลัง `docker compose --env-file .env.docker up -d`):

```bash
# Bash / Git Bash
./scripts/migrate-docker.sh
```

```powershell
# PowerShell (ที่ root ของ repo)
.\scripts\migrate-docker.ps1
```

หรือรันทีละไฟล์ด้วยมือ (ตัวอย่าง user/db ตาม `.env.docker`):

```bash
docker compose --env-file .env.docker exec -T db psql -U postgres -d carmen_db -v ON_ERROR_STOP=1 < backend/migrations/0001_init_schema.sql
```

---

## Schema — ลำดับไฟล์ (`0001` → `0002`, embedding **2000**)

DB ใหม่รันตามลำดับ (idempotent, รันซ้ำได้):

```bash
./scripts/migrate-docker.sh        # หรือ .\scripts\migrate-docker.ps1
# หรือรันทีละไฟล์ตามลำดับ:
docker compose --env-file .env.docker exec -T db psql -U postgres -d carmen_db \
  -v ON_ERROR_STOP=1 < backend/migrations/0001_init_schema.sql
docker compose --env-file .env.docker exec -T db psql -U postgres -d carmen_db \
  -v ON_ERROR_STOP=1 < backend/migrations/0002_migrate_per_bu_to_public.sql
```

**`0001_init_schema.sql`** — สร้าง end-state ทั้งหมด: extension `vector`/`pgcrypto`, `public.business_units` (+ seed carmen/blueledgers), ตารางร่วม `public.documents`/`public.document_chunks` (keyed by `bu_id`, `VECTOR(2000)` + ivfflat + GIN FTS index), `public.chat_history` (+ trigger/`purge_expired_chat_history()`/`metrics`), `public.activity_logs`, และตาราง `faq_*`.

**`0002_migrate_per_bu_to_public.sql`** — (one-time, idempotent) คัดลอกข้อมูลจาก schema เก่าแบบ per-BU เข้า `public.documents`/`public.document_chunks` แล้ว drop schema เก่าทิ้ง; ปลอดภัย (no-op) บน DB ใหม่ที่ไม่มี schema เก่า

- **มิติ = 2000** ตรงกับ `VECTOR_DIMENSION` ใน `render.yaml` — ตั้ง `VECTOR_DIMENSION=2000` ให้ตรง
- BU ใหม่ provision ตอน runtime โดย INSERT แถวใน `public.business_units` (เอกสาร/chunk เป็นตารางร่วมใน `public` แยกด้วย `bu_id`)
- ไฟล์ migration เดิม (0001–0012) ถูกยุบรวมเป็นไฟล์นี้แล้ว; ใช้กับ **DB ใหม่** (DB เดิมที่ migrate แล้วไม่ต้องรันซ้ำ)

---

## อย่าใช้ Go binary `./server migrate` กับไฟล์นี้

`0001_init_schema.sql` มี PL/pgSQL (`DO $$ … $$`, ฟังก์ชัน, trigger) — ตัว `./server migrate` ของ Go แยกคำสั่งด้วย `;` จะตัดบล็อกเหล่านี้ผิดและทำให้คอร์รัปต์ ใช้ `psql` ตามวิธีแนะนำด้านบนเท่านั้น

---

## หลัง migration

- รัน **reindex** ตาม BU ถ้าโปรเจกต์ใช้ (ดู `README` / `cmd/server` ของ backend)
- ตั้ง `OPENROUTER_EMBED_MODEL` / `VECTOR_DIMENSION` ให้ตรงกับมิติในฐานข้อมูล

---

## Fly.io (backend)

- รายการ env ที่ควรตั้ง: `backend/.env.fly.example` (คัดลอกเป็น `.env.fly.local` แล้ว `fly secrets import`)
- รัน migration ครั้งแรกด้วย **PSQL / Beekeeper / Neon SQL Editor** ชี้ไป DB เดียวกับที่ใส่ใน `DB_*` — ลำดับไฟล์ตามตารางด้านบน

## Render (Production)

- **ไม่แนะนำ** ใช้ `preDeployCommand: ./server migrate` แบบรันทุกครั้งที่ deploy — บางไฟล์ (เช่น `0002`) มี PL/pgSQL ที่ binary แยกด้วย `;` ไม่ปลอดภัย
- รัน migration **ครั้งแรก** ผ่าน **Render Shell** ของ service `carmen-backend` หรือใช้ **PSQL** จากหน้า Database (เมนู Connect) แล้วรันคำสั่งจากไฟล์ `.sql` ตามลำดับในตารางด้านบน
- ตั้งค่า LLM env (`LLM_API_KEY`/`LLM_API_BASE`/`LLM_CHAT_MODEL`/`LLM_INTENT_MODEL`) บน `carmen-backend` ใน Dashboard แล้ว redeploy — ดูคอมเมนต์ใน `render.yaml` (chat ทำงาน native ใน Go backend ไม่มี service Python แยกแล้ว)

## Vercel (Frontend)

- Root Directory: `frontend`
- ตั้ง `NEXT_PUBLIC_API_BASE` = URL ของ Go backend บน Render (`https://knowledge-base-carmen-backend.onrender.com` — ให้ตรงกับที่ browser เรียก)
- โปรเจกต์มี `frontend/vercel.json` ตั้ง region **Singapore (`sin1`)**
