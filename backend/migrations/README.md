# Database migrations (PostgreSQL + pgvector)

รัน **ครั้งเดียวต่อ DB ใหม่** กับ Postgres ภายนอกที่ตั้งไว้ใน `backend/.env.docker` (ต้องมี extension/pgvector พร้อม)

## วิธีแนะนำ: `migrate-docker.sh` (psql กับ DB ภายนอก)

รองรับ PL/pgSQL / `DO $$` / ฟังก์ชันยาว — ปลอดภัยกว่าการรันผ่าน `./server migrate` ของ Go ที่แยกคำสั่งด้วย `;` (อาจตัดคำสั่งผิดกับบางไฟล์)

จาก **root ของ repo** (ตั้ง `DB_*` ใน `backend/.env.docker` ก่อน — สคริปต์ใช้ one-off pgvector container ต่อ DB ภายนอก ไม่ต้องมี psql บนเครื่อง):

```bash
# Bash / Git Bash
./scripts/migrate-docker.sh
```

```powershell
# PowerShell (เทียบเท่า migrate-docker.sh — migrate กับ DB ภายนอกตาม backend/.env.docker)
.\scripts\migrate-docker.ps1
```

หรือส่ง path ไฟล์เป็น argument (apply ทีละไฟล์ตามต้องการ):

```bash
./scripts/migrate-docker.sh backend/migrations/0001_init_schema.sql
```

---

## Schema — ไฟล์เดียว `0001_init_schema.sql` (idempotent, embedding **2000**)

DB ใหม่รันไฟล์เดียว (idempotent, รันซ้ำได้):

```bash
./scripts/migrate-docker.sh        # ไม่ใส่ arg = apply 0001_init_schema.sql
```

**`0001_init_schema.sql`** — สร้าง end-state ทั้งหมด: extension `vector`/`pgcrypto`, `public.business_units` (+ seed carmen/blueledgers), ตารางร่วม `public.documents`/`public.document_chunks` (keyed by `bu_id`, `VECTOR(2000)` + ivfflat + GIN FTS index), `public.chat_history` (+ trigger/`purge_expired_chat_history()`/`metrics`), `public.activity_logs`, และตาราง `faq_*`. **UUID-native**: ทุก PK เป็น `UUID PRIMARY KEY DEFAULT gen_random_uuid()` และทุก FK (`bu_id`, `doc_id`, ฯลฯ) เป็น `UUID` — DB ใหม่ได้ UUID ทันที

- **มิติ = 2000** ตรงกับ `VECTOR_DIMENSION` ใน `render.yaml` — ตั้ง `VECTOR_DIMENSION=2000` ให้ตรง
- BU ใหม่ provision ตอน runtime โดย INSERT แถวใน `public.business_units` (id เป็น UUID, เอกสาร/chunk เป็นตารางร่วมใน `public` แยกด้วย `bu_id` ซึ่งเป็น UUID เช่นกัน)
- ไฟล์ migration ในอดีต (การยุบ schema per-BU → public, และแปลง INT → UUID) ถูกรวมเข้าไฟล์นี้แล้ว — `0001` เป็น schema ปลายทางไฟล์เดียวที่ต้องรัน; DB เดิมที่ migrate ครบแล้วรันซ้ำได้ (idempotent ไม่เปลี่ยนข้อมูล)

---

## อย่าใช้ Go binary `./server migrate` กับไฟล์นี้

`0001_init_schema.sql` มี PL/pgSQL (`DO $$ … $$`, ฟังก์ชัน, trigger) — ตัว `./server migrate` ของ Go แยกคำสั่งด้วย `;` จะตัดบล็อกเหล่านี้ผิดและทำให้คอร์รัปต์ ใช้ `psql` ตามวิธีแนะนำด้านบนเท่านั้น

---

## หลัง migration

- รัน **reindex** ตาม BU ถ้าโปรเจกต์ใช้ (ดู `README` / `cmd/server` ของ backend)
- ตั้ง `OPENROUTER_EMBED_MODEL` / `VECTOR_DIMENSION` ให้ตรงกับมิติในฐานข้อมูล

---

## Render (Production)

- **ไม่แนะนำ** ใช้ `preDeployCommand: ./server migrate` แบบรันทุกครั้งที่ deploy — `0001_init_schema.sql` มี PL/pgSQL (`DO $$`) ที่ binary แยกด้วย `;` ไม่ปลอดภัย (entrypoint รัน `0001` ผ่าน `psql` อยู่แล้ว)
- รัน migration **ครั้งแรก** ผ่าน **Render Shell** ของ service `carmen-backend` หรือใช้ **PSQL** จากหน้า Database (เมนู Connect) แล้วรัน `0001_init_schema.sql`
- ตั้งค่า LLM env (`LLM_API_KEY`/`LLM_API_BASE`/`LLM_CHAT_MODEL`/`LLM_INTENT_MODEL`) บน `carmen-backend` ใน Dashboard แล้ว redeploy — ดูคอมเมนต์ใน `render.yaml` (chat ทำงาน native ใน Go backend ไม่มี service Python แยกแล้ว)

## Vercel (Frontend)

- Root Directory: `frontend-next`
- ตั้ง `NEXT_PUBLIC_API_BASE` = URL ของ Go backend บน Render (`https://carmen-backend-4o9h.onrender.com` — ให้ตรงกับที่ browser เรียก)
- โปรเจกต์มี `frontend-next/vercel.json` ตั้ง region **Singapore (`sin1`)**
