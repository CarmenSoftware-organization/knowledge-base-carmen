# Deploy backend ขึ้น Render (ครั้งแรก) — Design

- **วันที่:** 2026-06-24
- **สถานะ:** อนุมัติ design แล้ว รอ review spec
- **ขอบเขต:** deploy `backend/` (Go Fiber) ขึ้น Render เป็น Docker web service ครั้งแรก โดยใช้ `render.yaml` Blueprint ที่มีอยู่

## 1. บริบท / สถานะปัจจุบัน

config สำหรับ Render เตรียมไว้แล้วเกือบครบ (จาก PR #14–18):

- `render.yaml` (root) — Blueprint แบบ Docker, `plan: free`, service เดียว `carmen-backend`, ชี้ external Postgres+pgvector, `healthCheckPath: /health`
- `backend/Dockerfile` — multi-stage (golang:1.25-alpine → alpine:3.19), runtime image มี `psql`/`git`/`wget`, copy `server`+`migrations`+`config`+`docker-entrypoint.sh`, HEALTHCHECK ที่ `/health`
- `backend/docker-entrypoint.sh` — รอ DB (pg_isready, สูงสุด 30 ครั้ง) → `psql -f migrations/0001_init_schema.sql` (idempotent) → `exec ./server`

**ยังไม่มี service บน Render เลย** — งานนี้คือ deploy ครั้งแรก

### ข้อเท็จจริงที่ verify จากโค้ดแล้ว (หลักฐานประกอบ design)

1. **Content มาตอน runtime ด้วย clone-on-boot** — production mode (`cmd/server/main.go:119-125`) เรียก `WikiSyncService.Sync()` ตอน boot ซึ่ง `git clone --depth 1 -b <branch> <repoURL> <GIT_REPO_PATH>` (`internal/services/wiki_sync_service.go:80-93`) แล้ว reindex อ่าน markdown จาก disk → เขียนลง DB
2. **repo `CarmenSoftware-organization/knowledge-base-carmen` เป็น PUBLIC** — verify ด้วย `git ls-remote` แบบไม่ auth สำเร็จ ⇒ clone ทำงานได้**โดยไม่ต้องมี `GITHUB_TOKEN`** (โค้ดไม่ได้ inject token เข้า URL — `wiki_sync_service.go:34-39`; ถ้า repo ถูกเปลี่ยนเป็น private เมื่อใด clone จะพังทันที — ดู §10 Risks)
3. **`0001_init_schema.sql` เป็น dim 2000 และ idempotent** — `vector(2000)` ที่ `migrations/0001_init_schema.sql:52,69`; ทุก table/index เป็น `CREATE ... IF NOT EXISTS`, trigger เป็น `DROP ... IF EXISTS` ก่อน create, seed BU เป็น `ON CONFLICT DO NOTHING` ⇒ ไม่มี statement ทำลายข้อมูล
4. **`0002` เป็น destructive** — `migrations/0002_migrate_per_bu_to_public.sql` มี `DROP SCHEMA <slug> CASCADE` ⇒ **ห้ามรันในรอบนี้**
5. **DB_SCHEMA จัดการในโค้ด** — `internal/database/database.go:41-49` ตั้ง `search_path` ตามค่า `DB_SCHEMA` ตอนต่อ connection
6. **cold-start clone เบา** — `backend/server`/`bin` ไม่ถูก track ใน git, ไฟล์ใหญ่สุดใน tree ~800KB (รูปใน content), `--depth 1` ดึงแค่ HEAD tree ไม่เอา history 188M

## 2. การตัดสินใจ (decisions ที่ resolve แล้ว)

| ประเด็น | ตัดสิน |
|---|---|
| สถานะ | deploy ครั้งแรก พาทำตั้งแต่ต้น |
| Database | ใช้ remote dev DB เดิม (ตัวใน `backend/.env`, port 6432, dim 2000) — dev/prod ใช้ DB เดียวกัน (ยอมรับ trade-off) |
| Render plan | **Free ถาวร** (ยอมรับ spin-down + cold-start + re-clone) |
| Secrets | **reuse จาก `backend/.env` ทั้งหมด** (ใช้ key/ค่าเดียวกับ dev) |
| Frontend wiring | รวมเป็นขั้นสุดท้ายของ spec |
| render.yaml fix | แก้ `GIT_REPO_PATH`/`WIKI_CONTENT_PATH` ตามที่เสนอ |
| CORS domain | `https://knowledge-base-carmen.vercel.app` (คงเดิม) |

## 3. แนวทาง (approach)

**Render Blueprint จาก `render.yaml`** (IaC) — ไม่สร้าง service มือเปล่าใน dashboard, ไม่ใช้ Render API/CLI เพราะ config พร้อมแล้ว งานหลัก = แก้ `render.yaml` เล็กน้อย + runbook กรอก secrets + verify **ไม่ต้องแก้โค้ด Go**

> ผมสร้าง service บน Render แทนคุณไม่ได้ (ต้อง login dashboard) — deliverable คือ config ที่ตรวจแล้ว + runbook ทีละขั้น ให้คุณกดทำตาม จากนั้นผม verify ผ่าน `curl` หลังได้ public URL

## 4. สถาปัตยกรรมสิ่งที่ deploy

```
                 Render (free web service, Docker)
                 ┌─────────────────────────────────┐
  GitHub repo ──►│ carmen-backend                  │
  (public,       │  entrypoint: wait DB → 0001 →   │──► external Postgres+pgvector
   clone --depth │            exec ./server        │     (dev DB เดิม, public schema,
   1 on boot)    │  boot: WikiSyncService.Sync()   │      dim 2000, sslmode=require)
                 │  :8080  /health /api/chat/* ...  │
                 └─────────────────────────────────┘
                          ▲ HTTPS (CORS)
                          │
              Vercel frontend (knowledge-base-carmen.vercel.app)  ── แยก deploy
```

Service เดียว Go Fiber ใน Docker, `plan: free`, port 8080, health `/health` Frontend แยกอยู่ Vercel — ไม่อยู่ใน blueprint นี้

## 5. กลยุทธ์ DB + migration (จุดเสี่ยงสูงสุด)

- ชี้ **dev DB เดิม**, `DB_SCHEMA=public`, `VECTOR_DIMENSION=2000`
- entrypoint รัน `0001_init_schema.sql` อัตโนมัติ — idempotent → ปลอดภัยกับ DB ที่มีข้อมูล (create เฉพาะที่ยังไม่มี)
- **ไม่รัน `0002`/`0003`** — `0002` จะ `DROP SCHEMA carmen CASCADE` ⇒ schema `carmen` เดิมปล่อยไว้เฉย ๆ
- เติม `public.documents`/`public.document_chunks` ด้วยการ **reindex ใหม่ทั้ง 3 BU** (`blueledgers`, `carmen`, `training_center`) → non-destructive ได้ data สดจาก content repo
- **gate ก่อน reindex:** verify `public.document_chunks.embedding` เป็น `vector(2000)` จริง — กันกรณี DB เคยมี public table dim อื่นค้าง (ถ้า dim ไม่ตรง `0001` `CREATE IF NOT EXISTS` จะข้าม ทำให้เหลือ table dim ผิด → ต้องจัดการก่อน)

## 6. กลยุทธ์ content

clone-on-boot → disk → reindex อ่าน disk → เขียน DB repo public ⇒ **clone ไม่ต้องใช้ `GITHUB_TOKEN`** Disk บน free tier เป็น ephemeral แต่ไม่กระทบ: cold-start แต่ละครั้ง re-clone (`--depth 1` เบา), chat อ่านจาก DB (persistent) ⇒ reindex ทำครั้งเดียวพอ ไม่ต้องทำซ้ำทุก cold-start

## 7. การแก้ `render.yaml` (concrete)

```diff
-      - key: GIT_REPO_PATH
-        value: /opt/render/project/src
-      - key: WIKI_CONTENT_PATH
-        value: /opt/render/project/src/carmen_cloud
+      - key: GIT_REPO_PATH
+        value: /app/repo
+      - key: WIKI_CONTENT_PATH
+        value: /app/repo/carmen_cloud
```

- `GIT_REPO_PATH=/app/repo` — WORKDIR `/app` เขียนได้ชัวร์ใน Docker, เลี่ยง path แบบ native-build `/opt/render/project/src`
- `WIKI_CONTENT_PATH` — deprecated/ไม่ถูกใช้จริง (path resolution ใช้ `<GIT_REPO_PATH>/contents/<bu>`) แต่ตั้งให้ consistent กับ `GIT_REPO_PATH` ใหม่ ไม่ให้ค้าง path เก่า
- ไม่แตะ field อื่น: `plan: free`, `DB_SCHEMA: public`, `VECTOR_DIMENSION: "2000"`, `DB_PORT: "6432"`, `DB_SSLMODE: require`, `CORS_ORIGINS`, `GITHUB_REPO_*`, LLM config — ถูกต้องแล้วตามที่ verify

## 8. Runbook (deploy ครั้งแรก)

1. **แก้ `render.yaml`** ตาม §7 → push branch → merge เข้า `main` (Blueprint อ่านจาก branch ที่เลือก)
2. **Render dashboard → New → Blueprint** → connect repo `CarmenSoftware-organization/knowledge-base-carmen` → Render อ่าน `render.yaml` เจอ service `carmen-backend`
3. **กรอก env ที่เป็น `sync: false`** (copy ค่าจาก `backend/.env` — **ไม่เก็บค่าใน spec/git**):
   - DB: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - App secrets (reuse dev): `JWT_SECRET`, `PRIVACY_HMAC_SECRET`, `ADMIN_API_KEY`, `INTERNAL_API_KEY`
   - LLM: `LLM_API_KEY`, `OPENROUTER_API_KEY`
   - GitHub: `GITHUB_TOKEN` (ใส่ได้ แต่ clone ไม่ต้องใช้เพราะ repo public — จำเป็นเฉพาะ GitHub API/webhook)
   - `GOOGLE_TRANSLATE_API_KEY` — เว้นว่างได้ (`TRANSLATION_ENABLED=false`)
   - ค่า non-secret (`value:` ใน yaml) Render เซ็ตให้อัตโนมัติ ไม่ต้องกรอกมือ
4. **Deploy** → ดู Render log ตามลำดับ:
   - `[entrypoint] waiting for database ...` → ติดต่อ DB ได้
   - `[entrypoint] applying schema (idempotent, via psql)...` → `0001` ผ่าน
   - `[wiki-sync] cloned ... → /app/repo` → clone สำเร็จ
   - `[wiki-sync] audit summary: ...` → server เริ่ม
   - health check `/health` เขียว → deploy live ได้ public URL (เช่น `https://carmen-backend.onrender.com`)

## 9. Verification (evidence ก่อนเคลมว่าเสร็จ)

ทำตามลำดับ ต้องผ่านทุกข้อ:

1. `curl -fsS https://<svc>.onrender.com/health` → ตอบ healthy
2. `curl -fsS https://<svc>.onrender.com/api/system/status` → DB connected
3. **verify dim 2000** (ผ่าน psql ไป dev DB): ตรวจ `public.document_chunks.embedding` เป็น `vector(2000)` — ถ้าไม่ใช่ หยุดและแก้ก่อน reindex
4. **reindex 3 BU** ผ่าน admin API (`X-Admin-Key`): `POST /api/index/rebuild?bu=blueledgers`, `...=carmen`, `...=training_center` → รอ async เสร็จ
5. ตรวจ `public.documents` มี row ครบทั้ง 3 BU (เทียบกับ audit summary ใน log)
6. **chat smoke test:** `curl -X POST .../api/chat/ask` ด้วยคำถามจริง → ได้ `answer` + `sources` ไม่ว่าง
7. ตรวจ Render log ไม่มี error ระหว่างขั้น 1–6

## 10. Frontend wiring (ขั้นสุดท้าย)

หลัง backend verify ผ่าน:

1. **Vercel** → ตั้ง `NEXT_PUBLIC_API_BASE` = public URL ของ Render (prod + preview scope) → redeploy frontend
2. ยืนยัน `CORS_ORIGINS` ใน render.yaml = `https://knowledge-base-carmen.vercel.app` (ตรงกับ domain Vercel จริง) — ถ้า frontend มี custom domain เพิ่ม ให้ใส่เพิ่มใน `CORS_ORIGINS` (comma-separated)
3. **E2E test:** เปิด frontend → ลองถาม chatbot → ตอบจาก backend ใหม่ได้ ไม่มี CORS error ใน console

## 11. Risks & ข้อควรระวัง

- **repo เปลี่ยนเป็น private** → clone-on-boot พังเงียบ (โค้ดไม่ inject token เข้า URL) backend จะ boot ผ่านแต่ reindex หาไฟล์ไม่เจอ → ถ้าจะทำ private ต้องแก้โค้ดให้ inject `GITHUB_TOKEN` เข้า URL ก่อน (นอก scope รอบนี้)
- **free tier spin-down** → idle 15 นาทีแล้ว sleep, request แรกหลัง wake ช้า (~30-60s: cold start + re-clone) ยอมรับตาม decision
- **dev/prod แชร์ DB** → reindex จาก prod เขียนทับ public.* ที่ dev ก็ใช้ ระวัง reindex ชนกัน ยอมรับตาม decision
- **public table dim ไม่ตรง 2000** → §9 ข้อ 3 เป็น gate กันไว้แล้ว
- **DB port 6432** เป็น pooled connection (PgBouncer-style) — entrypoint ใช้ `pg_isready`/`psql` ผ่าน port เดียวกัน ปกติใช้ได้ ถ้า pooler ไม่รับ `psql` DDL ให้ migration อาจต้องชี้ direct port ชั่วคราว (เฝ้าดูใน log ขั้น `applying schema`)

## 12. Out of scope (note ไว้ ไม่ทำรอบนี้)

- ลบ leftover `backend/fly.toml`, `backend/.env.fly.example` (Fly.io เก่า)
- เพิ่ม `bin`/`server` ใน `backend/.dockerignore` (ลดขนาด build context)
- ชี้ `.github/workflows/auto-provision-sync-reindex.yml` (`API_BASE`) ไปยัง URL Render ใหม่ สำหรับ auto-provision เวลา push content
- แก้โค้ด inject `GITHUB_TOKEN` เข้า clone URL (เผื่อทำ repo private)
- ย้ายไป Render managed Postgres / แยก DB prod ออกจาก dev

## 13. Open questions

ไม่มี — decisions ครบ พร้อมเข้า implementation plan
