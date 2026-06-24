# Deploy backend ขึ้น Render (ครั้งแรก) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** deploy `backend/` (Go Fiber) ขึ้น Render เป็น Docker web service ตัวแรก ผ่าน `render.yaml` Blueprint ชี้ remote dev DB เดิม แล้วให้ chatbot ตอบจาก content ที่ reindex ใหม่ได้ end-to-end ผ่าน frontend Vercel

**Architecture:** ใช้ Blueprint ที่มีอยู่ (Docker, free tier), แก้ path 2 ตัวใน render.yaml, กรอก secrets (reuse จาก dev `.env`), entrypoint รัน `0001` (idempotent) ตอน boot แล้ว clone content repo (public) มา reindex 3 BU ลง `public.*` ไม่ต้องแก้โค้ด Go

**Tech Stack:** Render (Docker web service), Go Fiber, PostgreSQL + pgvector, `render.yaml` Blueprint, Vercel (frontend)

## Global Constraints

ทุก task ต้องเคารพข้อจำกัดเหล่านี้ (คัดลอกจาก spec verbatim):

- **DB:** ใช้ remote dev DB เดิม (`backend/.env`: `DB_PORT=6432`, `DB_SSLMODE=require`), `DB_SCHEMA=public`, `VECTOR_DIMENSION=2000`
- **ห้ามรัน `0002_migrate_per_bu_to_public.sql` หรือ `0003`** — มี `DROP SCHEMA ... CASCADE` (destructive) entrypoint รัน **เฉพาะ `0001_init_schema.sql`** ซึ่ง idempotent
- **Render plan:** `free` (ยอมรับ spin-down + cold-start + re-clone)
- **Secrets:** reuse จาก `backend/.env` ทั้งหมด (key/ค่าเดียวกับ dev) — **ห้าม commit ค่า secret ลง git**
- **Content repo public** → clone-on-boot ไม่ต้องใช้ `GITHUB_TOKEN` (โค้ดไม่ inject token เข้า URL — ถ้า repo เป็น private จะพัง)
- **CORS:** `CORS_ORIGINS=https://knowledge-base-carmen.vercel.app`
- BU ที่ต้อง reindex: `blueledgers`, `carmen`, `training_center`
- Endpoint: reindex = `POST /api/index/rebuild?bu=<slug>` (header `X-Admin-Key`); chat = `POST /api/chat/ask?bu=<slug>` body `{"message":"...","lang":"th"}`

---

## File structure

- **Modify:** `render.yaml` (root) — env `GIT_REPO_PATH`, `WIKI_CONTENT_PATH` (Task 1 เท่านั้น)
- ไม่มีไฟล์โค้ดอื่นถูกแตะ (ยืนยันจาก spec: ไม่ต้องแก้ Go)
- Out of scope (ไม่อยู่ในแผนนี้): `backend/fly.toml`, `.env.fly.example`, `.dockerignore`, auto-provision workflow URL

---

## Task 1: แก้ path ใน render.yaml แล้ว merge เข้า main

**Files:**
- Modify: `render.yaml` (env entries `GIT_REPO_PATH`, `WIKI_CONTENT_PATH`)

**Interfaces:**
- Consumes: ไม่มี (เริ่มจาก render.yaml ปัจจุบัน)
- Produces: render.yaml บน `main` ที่ `GIT_REPO_PATH=/app/repo`, `WIKI_CONTENT_PATH=/app/repo/carmen_cloud` — Task 2 (Blueprint) จะอ่านไฟล์นี้

- [ ] **Step 1: แก้ env สองตัวใน render.yaml**

แก้บล็อก Wiki / Git ใน `render.yaml`:

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

ไม่แตะ field อื่น (`plan: free`, `DB_SCHEMA: public`, `VECTOR_DIMENSION: "2000"`, `DB_PORT: "6432"`, `DB_SSLMODE: require`, `CORS_ORIGINS`, `GITHUB_REPO_*`, LLM config คงเดิม)

- [ ] **Step 2: validate YAML parse + ค่าถูกต้อง**

Run:
```bash
python3 -c "import yaml; d=yaml.safe_load(open('render.yaml')); svc=d['services'][0]; env={e['key']:e.get('value') for e in svc['envVars']}; assert env['GIT_REPO_PATH']=='/app/repo', env['GIT_REPO_PATH']; assert env['WIKI_CONTENT_PATH']=='/app/repo/carmen_cloud', env['WIKI_CONTENT_PATH']; assert env['DB_SCHEMA']=='public'; assert env['VECTOR_DIMENSION']=='2000'; assert svc['plan']=='free'; print('render.yaml OK:', env['GIT_REPO_PATH'], '|', env['WIKI_CONTENT_PATH'])"
```
Expected: `render.yaml OK: /app/repo | /app/repo/carmen_cloud` (ไม่มี AssertionError)

- [ ] **Step 3: Commit**

```bash
git add render.yaml
git commit -m "chore(render): use /app/repo for GIT_REPO_PATH (Docker runtime path)

The previous /opt/render/project/src is a native-build path; in a Docker
web service the container WORKDIR is /app. Clone-on-boot writes content
to GIT_REPO_PATH, so use a guaranteed-writable /app/repo.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 4: Push + เปิด PR + merge เข้า main**

```bash
git push -u origin docs/deploy-backend-render-spec
gh pr create --title "Deploy backend to Render: render.yaml path fix + spec/plan" \
  --body "Fixes GIT_REPO_PATH/WIKI_CONTENT_PATH for Docker runtime + adds deploy spec/plan. See docs/superpowers/specs/2026-06-24-deploy-backend-render-design.md"
```
Expected: PR สร้างสำเร็จ → review → merge เข้า `main`
หลัง merge: `render.yaml` ที่ถูกต้องอยู่บน `main` พร้อมให้ Render Blueprint อ่าน

> ทำไมต้อง merge เข้า main ก่อน: Render Blueprint อ่าน `render.yaml` จาก branch ที่ connect (default `main`) ถ้าจะ deploy จาก feature branch ให้เลือก branch นั้นตอนสร้าง Blueprint แทน

---

## Task 2: สร้าง Render Blueprint + กรอก secrets + deploy ครั้งแรก

**Files:** ไม่มี (ทำบน Render dashboard — **user ต้อง login เอง**)

**Interfaces:**
- Consumes: `render.yaml` บน main (จาก Task 1); ค่า secret จาก `backend/.env`
- Produces: live service + public URL (เช่น `https://carmen-backend.onrender.com`) — Task 3 ใช้ URL นี้

> ทุก step ของ task นี้ **user เป็นคนกดบน Render dashboard** — assistant ให้ checklist + ค่าที่ต้องกรอก + log ที่ต้องเห็น แล้วช่วยอ่าน log ถ้าติด

- [ ] **Step 1: สร้าง Blueprint**

Render dashboard → **New → Blueprint** → connect repo `CarmenSoftware-organization/knowledge-base-carmen` → เลือก branch `main` → Render parse `render.yaml` เจอ service `carmen-backend`
Expected: เห็น service `carmen-backend` (Docker, plan free) ในหน้า Blueprint พร้อม list env ที่ต้องกรอก

- [ ] **Step 2: เตรียมค่า secret จาก dev .env (รันในเครื่อง — ไม่ส่งขึ้น git)**

Run (แสดง key=value ที่ต้อง copy ไปกรอก dashboard):
```bash
grep -E '^(DB_HOST|DB_USER|DB_PASSWORD|DB_NAME|JWT_SECRET|PRIVACY_HMAC_SECRET|ADMIN_API_KEY|INTERNAL_API_KEY|LLM_API_KEY|OPENROUTER_API_KEY|GITHUB_TOKEN)=' backend/.env
```
Expected: ได้ค่าทั้งหมด (ถ้า key ไหนว่าง/ไม่มี → จดไว้ แล้วหาค่าจริงก่อนกรอก)

- [ ] **Step 3: กรอก env ที่เป็น `sync: false` ใน dashboard**

กรอกตามนี้ (ค่าจาก Step 2):
- DB: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- App secrets (reuse dev): `JWT_SECRET`, `PRIVACY_HMAC_SECRET`, `ADMIN_API_KEY`, `INTERNAL_API_KEY`
- LLM: `LLM_API_KEY`, `OPENROUTER_API_KEY`
- GitHub: `GITHUB_TOKEN` (ใส่ได้ แต่ clone ไม่ใช้เพราะ repo public)
- `GOOGLE_TRANSLATE_API_KEY` → เว้นว่าง (`TRANSLATION_ENABLED=false` ตั้งไว้แล้ว)

Expected: ทุก `sync: false` มีค่า (ยกเว้น `GOOGLE_TRANSLATE_API_KEY`); ค่า non-secret (`value:` ใน yaml) Render เซ็ตอัตโนมัติ ไม่ต้องกรอก

- [ ] **Step 4: กด Deploy แล้วเฝ้า log ตามลำดับ**

ดู Render service log ต้องเห็นบรรทัดเหล่านี้ตามลำดับ:
- `[entrypoint] waiting for database ...` แล้วหายไป (= ติดต่อ DB ได้)
- `[entrypoint] applying schema (idempotent, via psql)...` (= `0001` รัน ไม่มี error)
- `[wiki-sync] cloned https://github.com/.../knowledge-base-carmen.git ... → /app/repo` (= clone สำเร็จ)
- `[wiki-sync] audit summary: bu=... source_md=... indexed_docs=...` (= server เริ่ม)
- Render health check `/health` เป็นเขียว → service = Live

Expected: status **Live** + ได้ public URL จด URL ไว้ใช้ Task 3

> ถ้า log ขั้น `applying schema` ขึ้น error เกี่ยวกับ DDL ผ่าน port 6432 (pooler ไม่รับ): ดู §11 ของ spec — อาจต้องชี้ migration ไป direct DB port ชั่วคราว assistant ช่วยอ่าน error ได้

---

## Task 3: Verify deployment (assistant รันให้เมื่อมี URL)

**Files:** ไม่มี (รัน curl/psql)

**Interfaces:**
- Consumes: public URL จาก Task 2; DB creds จาก `backend/.env`
- Produces: หลักฐานว่า backend serve content + chat ได้จริง (gate ก่อนถือว่า deploy สำเร็จ)

- [ ] **Step 1: export URL ของ service**

```bash
export SVC=https://carmen-backend.onrender.com   # แทนด้วย URL จริงจาก Task 2
```

- [ ] **Step 2: health check**

Run: `curl -fsS "$SVC/health"`
Expected: HTTP 200, body แสดงสถานะ healthy (exit code 0)

- [ ] **Step 3: system status (DB connected)**

Run: `curl -fsS "$SVC/api/system/status"`
Expected: HTTP 200, JSON แสดง DB connected (ไม่มี error การต่อ DB)

- [ ] **Step 4: GATE — verify embedding column เป็น vector(2000)**

Run (จาก root, โหลด creds จาก backend/.env):
```bash
set -a; . backend/.env; set +a
PGPASSWORD="$DB_PASSWORD" PGSSLMODE="$DB_SSLMODE" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
"SELECT format_type(atttypid, atttypmod) FROM pg_attribute WHERE attrelid='public.document_chunks'::regclass AND attname='embedding';"
```
Expected: `vector(2000)`
**ถ้าไม่ใช่ `vector(2000)` → หยุด** ไม่ reindex แก้ table ให้ dim ตรงก่อน (มี public table dim เก่าค้าง) แล้วค่อยทำ Step 5

- [ ] **Step 5: reindex ทั้ง 3 BU**

```bash
set -a; . backend/.env; set +a   # เอา ADMIN_API_KEY
for bu in blueledgers carmen training_center; do
  echo "== reindex $bu =="
  curl -fsS -X POST "$SVC/api/index/rebuild?bu=$bu" -H "X-Admin-Key: $ADMIN_API_KEY"
  echo
done
```
Expected: แต่ละ BU ตอบ 200 (เริ่ม reindex async) — ไม่ใช่ 401 (admin key ผิด) หรือ 409 (กำลังรันอยู่)

- [ ] **Step 6: รอ reindex เสร็จ + ตรวจ status**

Run: `curl -fsS "$SVC/api/index/rebuild/status?bu=carmen" -H "X-Admin-Key: $ADMIN_API_KEY"`
ทำซ้ำจน 3 BU ไม่ได้กำลังรันแล้ว (poll ทุก ~30s)
Expected: ทุก BU reindex เสร็จ ไม่มี error

- [ ] **Step 7: ตรวจ row ใน public.documents ครบ 3 BU**

```bash
set -a; . backend/.env; set +a
PGPASSWORD="$DB_PASSWORD" PGSSLMODE="$DB_SSLMODE" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
"SELECT bu.slug, count(d.*) FROM public.business_units bu LEFT JOIN public.documents d ON d.bu_id=bu.id WHERE bu.slug IN ('blueledgers','carmen','training_center') GROUP BY bu.slug ORDER BY bu.slug;"
```
Expected: ทั้ง 3 BU มี count > 0 (เทียบกับ `source_md` ใน audit log จาก Task 2)

- [ ] **Step 8: chat smoke test**

```bash
curl -fsS -X POST "$SVC/api/chat/ask?bu=carmen" \
  -H "Content-Type: application/json" \
  -d '{"message":"ระบบ Carmen ใช้ทำอะไร","lang":"th"}'
```
Expected: HTTP 200, JSON `{"answer": "...", "sources": [...]}` โดย `answer` ไม่ว่าง และ `sources` มีอย่างน้อย 1 รายการ
**ถ้า `sources` ว่าง** → retrieval ไม่เจอ chunk (ดู reindex/dim) — backend deploy แล้วแต่ content ยังไม่พร้อม

---

## Task 4: Wire frontend (Vercel) → backend ใหม่ + E2E

**Files:** ไม่มี (Vercel dashboard + optional render.yaml ถ้าต้องเพิ่ม origin)

**Interfaces:**
- Consumes: public URL จาก Task 2 (backend ที่ verify แล้วจาก Task 3)
- Produces: frontend Vercel เรียก backend ใหม่ได้ ไม่มี CORS error

- [ ] **Step 1: ตั้ง NEXT_PUBLIC_API_BASE บน Vercel**

Vercel dashboard → frontend project → Settings → Environment Variables → ตั้ง `NEXT_PUBLIC_API_BASE` = public URL ของ Render (scope Production + Preview) → Redeploy
Expected: frontend build ใหม่ผ่าน, ค่า env ติดใน bundle

- [ ] **Step 2: ยืนยัน CORS origin ตรงกับ Vercel domain**

ตรวจ `CORS_ORIGINS` ใน render.yaml = `https://knowledge-base-carmen.vercel.app` (ตรงกับ domain Vercel จริงจาก Step 1)
ถ้า frontend มี custom domain เพิ่ม → แก้ render.yaml `CORS_ORIGINS` เป็น comma-separated แล้ว re-deploy Render
Expected: origin ของ frontend อยู่ใน `CORS_ORIGINS`

- [ ] **Step 3: E2E test**

เปิด frontend (`https://knowledge-base-carmen.vercel.app`) → เลือก BU → ถาม chatbot คำถามจริง → ดู Network tab + Console
Expected: request ไปที่ Render URL, ตอบกลับ 200, มีคำตอบแสดง, **ไม่มี CORS error** ใน console

- [ ] **Step 4: Commit (ถ้ามีแก้ CORS_ORIGINS)**

ถ้า Step 2 แก้ render.yaml:
```bash
git add render.yaml
git commit -m "chore(render): add frontend origin to CORS_ORIGINS

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
ถ้าไม่แก้ → ข้าม step นี้

---

## Self-Review (ทำแล้ว)

**1. Spec coverage:** §3 approach → Task 1-2; §5 DB/migration → Global Constraints + Task 2 Step 4 + Task 3 Step 4; §6 content → Task 2 Step 4 (clone log) + Task 3 Step 5-7; §7 render.yaml fix → Task 1; §8 runbook → Task 2; §9 verification → Task 3; §10 frontend wiring → Task 4; §11 risks (pooler DDL, dim mismatch) → Task 2 Step 4 note + Task 3 Step 4 gate ครบทุก section

**2. Placeholder scan:** ไม่มี TBD/TODO; `SVC`/URL จริงเป็น runtime value (export ใน Task 3 Step 1) ไม่ใช่ placeholder ของ logic; ค่า secret อ้างอิง `backend/.env` ตาม constraint (ห้าม commit)

**3. Type/command consistency:** endpoint/param ตรงกับโค้ดที่ verify (`?bu=`, `X-Admin-Key`, body `{message,lang}`); BU slug 3 ตัวตรงกันทุก task; `GIT_REPO_PATH=/app/repo` ตรงกันใน Task 1 และ §7 ของ spec
