# Monorepo Backend/Frontend Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** จัดระเบียบ monorepo ให้ `backend/` (deploy→Render) และ `frontend/` (deploy→Vercel) เป็น 2 project ที่ชัดเจน, flatten `frontend/user/`→`frontend/`, ลบ frontend ออกจาก orchestration, เก็บกวาดไฟล์ขยะ, แล้ว (เฟส 2) ล้าง git history

**Architecture:** repo เดียว (monorepo) คงไว้ — backend ยังผูกกับ `contents/` ผ่าน `/repo` mount. Phase 1 เป็น PR ปกติ (file moves + config edits + cleanup ที่ review/revert ได้). Phase 2 เป็น ops step แยก (history rewrite + force-push) ทำหลัง merge

**Tech Stack:** Go (Fiber) backend, Next.js frontend, Docker, Render (backend), Vercel (frontend native build), git-filter-repo

## Global Constraints

- monorepo เดียว — ห้ามแยกเป็น 2 git repo
- `contents/`, `scripts/`, orchestration files (`docker-compose.yml`, `render.yaml`) คงที่ root
- frontend Docker standalone เปิดเฉพาะ `DOCKER_BUILD=1` (มีใน `next.config.mjs` แล้ว) — ห้ามแก้ให้ standalone เสมอ (จะพัง Vercel native build)
- production ต้องตั้ง `CORS_ORIGINS` แบบ explicit (backend `config.go:438`) — ห้ามใช้ `*` ใน render.yaml
- ห้ามแตะ `WIKI_CONTENT_PATH`, logic ของ backend/frontend, และ CI workflows
- ทุก task จบด้วย commit; Phase 1 (Task 1-6) อยู่บน branch `feat/monorepo-backend-frontend-split`

---

## Phase 1 — Reorg (PR)

### Task 1: Flatten `frontend/user/` → `frontend/`

**Files:**
- Delete: `frontend/package-lock.json` (stub 87 bytes), `frontend/.DS_Store`, `frontend/user/.DS_Store`
- Move (git mv, รักษา history): ทุกไฟล์ใน `frontend/user/` → `frontend/`
- Remove dir: `frontend/user/`

**Interfaces:**
- Produces: project root ใหม่ของ frontend คือ `frontend/` (มี `package.json`, `app/`, `public/` 58 ไฟล์, `vercel.json`, `Dockerfile`, `next.config.mjs`, `.dockerignore`, `.gitignore`)

- [ ] **Step 1: ลบ stub + DS_Store แล้ว flatten**

รันจาก repo root:
```bash
git rm -f frontend/package-lock.json
rm -f frontend/.DS_Store frontend/user/.DS_Store
git mv frontend/user/.dockerignore frontend/.dockerignore
git mv frontend/user/.gitignore  frontend/.gitignore
git mv frontend/user/* frontend/
rmdir frontend/user
```
(หมายเหตุ: `frontend/user/` ไม่มี `node_modules`/`.next` — ตรวจแล้ว ไม่ต้องเคลียร์ก่อน)

- [ ] **Step 2: ตรวจว่าโครงสร้างถูกต้อง**

```bash
test -f frontend/package.json && test -d frontend/app && test -f frontend/vercel.json \
  && test -f frontend/Dockerfile && test -f frontend/next.config.mjs && echo "files OK"
test ! -e frontend/user && echo "user dir gone"
echo "public files: $(ls frontend/public | wc -l)"   # คาดหวัง 58
git status --short | grep -c '^R' && echo "(git เห็นเป็น rename)"
```
Expected: `files OK`, `user dir gone`, `public files: 58`, มี rename หลายรายการ

- [ ] **Step 3: Build ตรวจว่า frontend ยังทำงาน (Vercel-style native build)**

```bash
cd frontend && npm ci && npm run build && cd ..
```
Expected: build สำเร็จ (ไม่มี error เรื่อง path/missing file)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: flatten frontend/user → frontend

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: ลบ service `frontend` ออกจาก `docker-compose.yml`

**Files:**
- Modify: `docker-compose.yml` (ลบ block `frontend:` บรรทัด ~84-98; แก้ comment header)

**Interfaces:**
- Consumes: ไม่มี (อิสระจาก Task 1)
- Produces: compose เหลือ `db` + `backend`; local รัน frontend แยกด้วย `cd frontend && npm run dev`

- [ ] **Step 1: ลบทั้ง block `frontend:`**

ลบข้อความนี้ออกจาก `docker-compose.yml` (อยู่ก่อน `volumes:`):
```yaml
  frontend:
    build:
      context: ./frontend/user
      dockerfile: Dockerfile
      args:
        DOCKER_BUILD: "1"
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-3000}:3000"
    environment:
      NEXT_PUBLIC_API_BASE: ${NEXT_PUBLIC_API_BASE:-http://localhost:8080}
    depends_on:
      backend:
        condition: service_healthy
```
ให้เหลือ `  backend:` … ต่อด้วย `volumes:` / `  pgdata:` ทันที

- [ ] **Step 2: แก้ comment header ให้ตรง**

ในส่วน comment ด้านบน เปลี่ยนบรรทัด:
```
# Stack: db → backend (Go, native RAG chatbot at /api/chat/*) → frontend
```
เป็น:
```
# Stack: db → backend (Go, native RAG chatbot at /api/chat/*)
# Frontend ไม่อยู่ใน compose แล้ว — รัน local ด้วย `cd frontend && npm run dev`, deploy → Vercel
```

- [ ] **Step 3: ตรวจว่า compose ยัง valid และไม่มี frontend**

```bash
docker compose -f docker-compose.yml config >/dev/null && echo "compose valid"
docker compose -f docker-compose.yml config | grep -c 'frontend' && echo "(ควรเป็น 0)"
grep -c 'frontend/user' docker-compose.yml   # คาดหวัง 0
```
Expected: `compose valid`; grep frontend = 0; `frontend/user` = 0
(ถ้าไม่มี docker ในเครื่อง: ตรวจด้วย `python3 -c "import yaml,sys; yaml.safe_load(open('docker-compose.yml')); print('yaml ok')"`)

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "chore(compose): drop frontend service (now Vercel-only)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: ลบ `carmen-frontend` ออกจาก `render.yaml` + ตั้ง backend CORS

**Files:**
- Modify: `render.yaml` (ลบ block `carmen-frontend` บรรทัด ~95-110; แก้ `CORS_ORIGINS` บรรทัด ~92-93; แก้ comment header บรรทัด 5)

**Interfaces:**
- Consumes: ไม่มี
- Produces: render.yaml เหลือ service `carmen-backend` เท่านั้น; CORS อนุญาต Vercel domain

- [ ] **Step 1: ลบทั้ง block `carmen-frontend`**

ลบข้อความนี้ออกจาก `render.yaml` (ท้ายไฟล์):
```yaml
  # ─── Frontend (Next.js in Docker) ──────────────────────────────────────────
  - type: web
    name: carmen-frontend
    runtime: docker
    plan: free
    dockerContext: ./frontend/user
    dockerfilePath: ./frontend/user/Dockerfile
    healthCheckPath: /
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_API_BASE
        fromService:
          type: web
          name: carmen-backend
          envVarKey: RENDER_EXTERNAL_URL
```

- [ ] **Step 2: เปลี่ยน `CORS_ORIGINS` ของ backend จาก `*` เป็น Vercel domain**

หา:
```yaml
      - key: CORS_ORIGINS
        value: "*"
```
แก้เป็น (← แทนด้วย Vercel production domain จริงของคุณ คั่นด้วย comma ได้):
```yaml
      - key: CORS_ORIGINS
        value: "https://knowledge-base-carmen.vercel.app"
```

- [ ] **Step 3: แก้ comment header**

ลบบรรทัด (บรรทัด 5):
```
#   carmen-frontend  -> Docker (Next.js)
```
และเพิ่มหมายเหตุใต้รายการ services:
```
# Frontend deploy แยกที่ Vercel (native Next.js build) — ไม่อยู่ใน blueprint นี้
```

- [ ] **Step 4: ตรวจ**

```bash
python3 -c "import yaml; d=yaml.safe_load(open('render.yaml')); names=[s['name'] for s in d['services']]; print(names); assert names==['carmen-backend'], names; print('render OK')"
grep -c 'frontend/user' render.yaml   # คาดหวัง 0
grep -A1 'CORS_ORIGINS' render.yaml | grep -v '"\*"' && echo "CORS not wildcard"
```
Expected: `['carmen-backend']`, `render OK`, frontend/user = 0, CORS ไม่ใช่ `*`

- [ ] **Step 5: Commit**

```bash
git add render.yaml
git commit -m "chore(render): backend-only blueprint; explicit CORS for Vercel frontend

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: อัปเดต docs (`frontend/user` → `frontend` + คำอธิบาย stack/deploy)

**Files:**
- Modify: `CLAUDE.md`, `README.md`, `USER_MANUAL_TH.md`, `PROJECT_OVERVIEW.md`, `backend/migrations/README.md`, `frontend/README.md`

**Interfaces:**
- Consumes: โครงสร้างใหม่จาก Task 1-3
- Produces: docs สอดคล้องกับโครงสร้างจริง

- [ ] **Step 1: แทน path `frontend/user` → `frontend` ทุก doc**

```bash
for f in CLAUDE.md README.md USER_MANUAL_TH.md PROJECT_OVERVIEW.md backend/migrations/README.md frontend/README.md; do
  sed -i '' 's#frontend/user#frontend#g' "$f"
done
```
(Linux: ใช้ `sed -i` ไม่มี `''`)

- [ ] **Step 2: แก้คำอธิบาย stack/deploy แบบ semantic**

แก้ด้วยมือในจุดต่อไปนี้:
- `README.md` + `USER_MANUAL_TH.md`: ที่อธิบายขั้นรัน local เป็น `cd frontend && npm install && npm run dev` (Task 1 ทำให้ path ถูกแล้ว) และเพิ่มหมายเหตุว่า docker-compose รันแค่ db+backend, frontend รันแยก/ deploy ที่ **Vercel**, backend deploy ที่ **Render**
- `backend/migrations/README.md`: บรรทัด Vercel "Root Directory" ให้เป็น `frontend` (sed ทำให้แล้ว) — ตรวจว่าอ่านรู้เรื่อง
- `PROJECT_OVERVIEW.md`: ถ้ามี ASCII diagram โชว์ `frontend/user` ให้เป็น `frontend`

- [ ] **Step 3: ตรวจ**

```bash
grep -rn "frontend/user" CLAUDE.md README.md USER_MANUAL_TH.md PROJECT_OVERVIEW.md backend/migrations/README.md frontend/README.md
```
Expected: ไม่มีผลลัพธ์ (0 บรรทัด)

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md README.md USER_MANUAL_TH.md PROJECT_OVERVIEW.md backend/migrations/README.md frontend/README.md
git commit -m "docs: update paths + stack/deploy desc for backend(Render)/frontend(Vercel)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Cleanup ไฟล์ขยะ/กำพร้า + `.gitignore`

**Files:**
- Delete: `public/` (37 ไฟล์), `package-lock.json` (root), `backend/package-lock.json`, `backend/go1.22.5.linux-amd64.tar.gz`
- Modify: `.gitignore` (root) และ/หรือ `backend/.gitignore`

**Interfaces:**
- Consumes: ไม่มี
- Produces: tree สะอาด; tarball/lock ที่ลบจะไม่ถูก track อีก

- [ ] **Step 1: ลบไฟล์ออกจาก tree**

```bash
git rm -r public
git rm package-lock.json backend/package-lock.json
git rm backend/go1.22.5.linux-amd64.tar.gz
```

- [ ] **Step 2: เพิ่ม .gitignore กันกลับมา**

เพิ่มท้าย `backend/.gitignore`:
```
# downloaded Go toolchain tarballs — ห้าม commit (เคยมี 68MB หลุดเข้า history)
*.tar.gz
```
เพิ่มท้าย root `.gitignore`:
```
# root ไม่มี Node project — กัน lockfile กำพร้าหลุดกลับมา
/package-lock.json
```

- [ ] **Step 3: ตรวจว่าไม่มีไฟล์เป้าหมายเหลือ track**

```bash
git ls-files | grep -E '^public/|^package-lock\.json$|^backend/package-lock\.json$|go1\.22\.5' && echo "FAIL: ยังมีหลุด" || echo "clean"
```
Expected: `clean`

- [ ] **Step 4: ตรวจว่า frontend (ผู้ใช้ public จริง) ยังครบ**

```bash
echo "frontend/public: $(ls frontend/public | wc -l)"   # ยัง 58
test -f frontend/package-lock.json && echo "frontend lock OK"
```
Expected: 58, `frontend lock OK`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove orphan public/, stray lockfiles, 68MB go tarball; gitignore

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Full-stack verify + เปิด PR (ปิด Phase 1)

**Files:** ไม่มีไฟล์ใหม่ (ขั้นตรวจ + PR)

- [ ] **Step 1: Build ทั้งสอง project แยกกัน**

```bash
docker build -f backend/Dockerfile backend/   -t carmen-backend:verify
docker build -f frontend/Dockerfile frontend/ -t carmen-frontend:verify
cd backend && go build ./... && cd ..
```
Expected: ทั้ง 3 คำสั่งสำเร็จ
(ถ้าไม่มี docker: ข้าม build image แต่ต้องผ่าน `go build ./...` และ `cd frontend && npm run build` จาก Task 1)

- [ ] **Step 2: ตรวจ verification checklist รวมจาก spec**

```bash
grep -rn "frontend/user" . --include="*.yml" --include="*.yaml" --include="*.md" --include="*.json" \
  | grep -v node_modules | grep -v "docs/superpowers" || echo "no frontend/user refs"
git ls-files | grep -E '^public/|go1\.22\.5|^package-lock\.json$' || echo "no orphan files"
```
Expected: `no frontend/user refs` (ยกเว้นใน spec/plan ที่อ้างถึงโดยตั้งใจ), `no orphan files`

- [ ] **Step 3: Push + เปิด PR**

```bash
git push -u origin feat/monorepo-backend-frontend-split
gh pr create --title "Reorg: split monorepo into backend(Render)/frontend(Vercel)" \
  --body "$(cat <<'EOF'
Phase 1 ของ reorg (spec: docs/superpowers/specs/2026-06-22-monorepo-backend-frontend-split-design.md)

- flatten frontend/user → frontend
- ลบ frontend ออกจาก docker-compose + render.yaml (frontend → Vercel native build)
- backend CORS_ORIGINS เป็น explicit Vercel domain
- cleanup: public/ (ซ้ำ), lockfile กำพร้า ×2, go tarball 68MB
- docs อัปเดต path + deploy split

⚠️ หลัง merge ต้องทำ Phase 2 (history rewrite ล้าง blob 68MB) เป็น ops step แยก + นัดทีม
⚠️ Manual: Vercel Root Directory → frontend, NEXT_PUBLIC_API_BASE → Render URL; ใส่ Vercel domain จริงใน render.yaml CORS_ORIGINS

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Expected: PR ถูกสร้าง

---

## Phase 2 — History rewrite (ops step แยก, ทำหลัง Phase 1 merge)

### Task 7: ล้าง blob 68MB ออกจาก git history

> ⚠️ **ไม่ใช่ PR** — เป็น destructive force-push. ทำเมื่อ: (1) Phase 1 merge เข้า main แล้ว (2) ไม่มี PR/branch ค้างอื่น (3) นัดทีมแล้ว

**Files:** git history (ทั้ง repo)

- [ ] **Step 1: ติดตั้งเครื่องมือ + clone ใหม่สด**

```bash
brew install git-filter-repo   # ถ้ายังไม่มี
cd /tmp && rm -rf kb-rewrite
git clone https://github.com/CarmenSoftware-organization/knowledge-base-carmen.git kb-rewrite
cd kb-rewrite
```

- [ ] **Step 2: ยืนยันว่า blob อยู่ใน history จริง**

```bash
git rev-list --all --objects | grep 'go1.22.5.linux-amd64.tar.gz' && echo "พบใน history"
```
Expected: พบอย่างน้อย 1 บรรทัด

- [ ] **Step 3: ล้าง blob ออกทุก commit**

```bash
git filter-repo --path backend/go1.22.5.linux-amd64.tar.gz --invert-paths --force
```

- [ ] **Step 4: ตรวจว่า history สะอาด + ขนาดลด**

```bash
git rev-list --all --objects | grep 'go1.22.5.linux-amd64.tar.gz' && echo "FAIL ยังอยู่" || echo "history clean"
du -sh .git
```
Expected: `history clean`; `.git` เล็กลงชัดเจน

- [ ] **Step 5: ตั้ง remote กลับ + force-push**

```bash
git remote add origin https://github.com/CarmenSoftware-organization/knowledge-base-carmen.git
git push origin --force --all
git push origin --force --tags
```

- [ ] **Step 6: แจ้งทีม re-sync**

ส่งให้ทีม: commit hash เปลี่ยนทั้งหมดแล้ว ให้ทุกคนรัน
```bash
git fetch origin && git reset --hard origin/main
```
หรือ re-clone ใหม่ (อย่า `git pull` ธรรมดา — จะ merge history เก่ากลับ)

---

## Manual actions นอก repo (หลัง Phase 1 deploy)

- **Vercel dashboard:** Project → Settings → Root Directory: `frontend/user` → `frontend`; ตั้ง env `NEXT_PUBLIC_API_BASE` = URL backend บน Render (เช่น `https://knowledge-base-carmen-backend.onrender.com`)
- **Render:** ยืนยัน `CORS_ORIGINS` ตรงกับ Vercel production domain จริง

---

## Self-Review (เทียบกับ spec)

- **Spec coverage:** flatten→T1 · compose drop FE→T2 · render drop FE + CORS→T3 · docs→T4 · cleanup+gitignore→T5 · verify/PR→T6 · history rewrite→T7 · manual actions→ section ท้าย ✓ ครบทุก section
- **Placeholder scan:** ไม่มี TBD/TODO; CORS value ใช้ค่าจริง (Vercel domain) + หมายเหตุให้แทนด้วย domain จริง ✓
- **Type/path consistency:** path `frontend/` ใช้ตรงกันทุก task; ชื่อ service `carmen-backend`/`frontend` สอดคล้อง; คำสั่ง verify อ้างไฟล์ที่ task ก่อนหน้าสร้างจริง ✓
