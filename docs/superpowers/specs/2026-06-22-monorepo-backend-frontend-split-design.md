# Design — จัดระเบียบ monorepo เป็น 2 project (backend → Render, frontend → Vercel)

**วันที่:** 2026-06-22
**สถานะ:** อนุมัติดีไซน์แล้ว (รอ review spec ก่อนทำ implementation plan)

## เป้าหมาย (Goal)

จัดระเบียบ repo ให้ `backend/` และ `frontend/` เป็น 2 project ที่ build Docker แยกตัวเองได้ชัดเจน,
เก็บกวาดไฟล์ขยะ/กำพร้า, และแยกเส้นทาง deploy: **backend → Render, frontend → Vercel**
โดยยังคงเป็น **git repo เดียว (monorepo)** และคง coupling ระหว่าง backend ↔ `contents/` ไว้

## บริบทปัจจุบัน (ที่สำรวจมา)

- มี `backend/Dockerfile` และ `frontend/user/Dockerfile` แยกกันอยู่แล้ว ทั้งคู่ `COPY . .` จาก context ของตัวเอง → **self-contained อยู่แล้ว** (`docker build ./backend` / `./frontend/user` รันได้โดยไม่พึ่ง root)
- `frontend/` ซ้อนชั้นเป็น `frontend/user/` โดยมีแค่ `user/` ตัวเดียวข้างใน + ไฟล์กำพร้า (`.DS_Store`, stub `package-lock.json` 87 bytes)
- `next.config.mjs` ใส่ `output: "standalone"` **เฉพาะเมื่อ `DOCKER_BUILD=1`** → รองรับทั้ง Vercel native build (ไม่มี flag) และ Docker standalone build พร้อมกันอยู่แล้ว
- `frontend/user/vercel.json` ตั้งค่า native Next.js build ไว้แล้ว (`framework: nextjs`, region `sin1`)
- `render.yaml` ปัจจุบัน deploy **ทั้ง** backend และ frontend เป็น Docker service บน Render
- `docker-compose.yml` รัน db + backend + frontend
- backend (`config.go:438`) บังคับว่า **production ต้องตั้ง `CORS_ORIGINS` แบบ explicit** (ใช้ `*` ไม่ได้)

### ไฟล์ขยะ/กำพร้าที่ยืนยันแล้ว

| ไฟล์ | สถานะ | การจัดการ |
|---|---|---|
| `public/` (root, 37 ไฟล์) | เป็น subset ซ้ำ **ทั้งหมด** ของ `frontend/user/public/` (58 ไฟล์); ไม่มีโค้ดอ้างถึง | ลบ |
| `package-lock.json` (root, 632KB) | กำพร้า — ไม่มี root `package.json` | ลบ |
| `backend/package-lock.json` (86 bytes) | กำพร้า — backend เป็น Go | ลบ |
| `frontend/package-lock.json` (stub 87 bytes) | กำพร้า — ไม่มี `package.json` คู่ | ลบ (เป็นส่วนหนึ่งของ flatten) |
| `backend/go1.22.5.linux-amd64.tar.gz` (68MB) | tarball ถูก commit เข้า git | ลบจาก tree (Phase 1) + ล้าง history (Phase 2) |

### จุดที่อ้าง `frontend/user` (ต้องจัดการ)

- `docker-compose.yml:86` — `context: ./frontend/user` → **ลบทั้ง service** (ดูด้านล่าง)
- `render.yaml:100-101` — `dockerContext`/`dockerfilePath` → **ลบทั้ง service** (ดูด้านล่าง)
- docs: `PROJECT_OVERVIEW.md`, `README.md`, `USER_MANUAL_TH.md`, `CLAUDE.md`, `backend/migrations/README.md`, `frontend/user/README.md` → แก้ path เป็น `frontend`

## โครงสร้างเป้าหมาย (Target layout)

```
knowledge-base-carmen/            ← git repo เดียว (monorepo)
├── backend/        Go Fiber — Docker build จาก ./backend (deploy → Render)
│   └── Dockerfile
├── frontend/       Next.js — flatten จาก frontend/user/ (deploy → Vercel, native build)
│   ├── Dockerfile  (คงไว้สำหรับ build manual / self-host — ไม่ถูก wire ใน orchestration)
│   └── vercel.json
├── contents/       markdown source — backend อ่าน runtime ผ่าน /repo mount + เป็น workflow trigger — คงที่ root
├── scripts/        ops (migrate/provision/sync) — orchestrate ทั้ง stack — คงที่ root
├── docs/           specs/docs
├── .github/workflows/
├── docker-compose.yml   db + backend เท่านั้น (ลบ service frontend)
├── render.yaml          carmen-backend เท่านั้น (ลบ carmen-frontend)
├── go.work
└── CLAUDE.md / README.md / PROJECT_OVERVIEW.md / USER_MANUAL_TH.md
```

ถูกลบ: `public/`, `package-lock.json` (root), `backend/package-lock.json`, `backend/go1.22.5.linux-amd64.tar.gz`

## แนวทางการลงมือ: สองเฟส (Approach A)

แยก "ส่วนที่ review ได้" (Phase 1, PR ปกติ) ออกจาก "ส่วนอันตรายที่ review ไม่ได้" (Phase 2, force-push history rewrite) อย่างชัดเจน

---

### Phase 1 — Reorg (feature branch + PR ปกติ)

**1a. Flatten `frontend/user/` → `frontend/`**
1. ลบ `frontend/package-lock.json` (stub) และ `frontend/.DS_Store` ก่อน (กัน path collide ตอน move)
2. `git mv` ทุกไฟล์ใน `frontend/user/` ขึ้นมาที่ `frontend/` รวม dotfiles (`.dockerignore`, `.gitignore`) เพื่อรักษา git history
3. ลบโฟลเดอร์ `frontend/user/` ที่ว่างทิ้ง
4. **ไม่แก้ภายใน** `Dockerfile` / `vercel.json` / `next.config.mjs` — path เป็น relative ต่อ context อยู่แล้ว

**1b. `docker-compose.yml` — ลบ service `frontend`**
- ลบ block `frontend:` ทั้งก้อน (context, ports, environment `NEXT_PUBLIC_API_BASE`, depends_on)
- เหลือ `db` + `backend`; ref `./frontend/user` หายไปเอง
- local dev: รัน frontend แยกด้วย `cd frontend && npm run dev`

**1c. `render.yaml` — ลบ service `carmen-frontend`**
- ลบ block `carmen-frontend` ทั้งก้อน (รวม `dockerContext: ./frontend/user`)
- ที่ `carmen-backend`: เปลี่ยน `CORS_ORIGINS` จาก `"*"` → Vercel frontend domain (explicit; production ต้องการ)

**1d. Docs — แก้ `frontend/user` → `frontend` + อัปเดตคำอธิบาย stack**
- ไฟล์: `PROJECT_OVERVIEW.md`, `README.md`, `USER_MANUAL_TH.md`, `CLAUDE.md`, `backend/migrations/README.md`, `frontend/README.md`
- ปรับคำอธิบายให้ตรง: docker-compose ไม่มี frontend แล้ว; local รัน frontend ด้วย `npm run dev`; deploy split (backend→Render, frontend→Vercel)
- ใน `backend/migrations/README.md`: เปลี่ยน Vercel "Root Directory: `frontend/user`" → `frontend`

**1e. Cleanup (ลบจาก tree)**
- ลบ `public/`, `package-lock.json` (root), `backend/package-lock.json`
- ลบ `backend/go1.22.5.linux-amd64.tar.gz` จาก tree
- เพิ่ม `.gitignore`: ignore `*.tar.gz` (อย่างน้อยใน `backend/`) และกัน root `package-lock.json` กลับมา

---

### Phase 2 — History rewrite (ops step แยก หลัง Phase 1 merge + นัดทีม)

1. ทำบน clone ใหม่สดของ main (หลัง Phase 1 merge แล้ว)
2. `git-filter-repo --path backend/go1.22.5.linux-amd64.tar.gz --invert-paths` (ล้าง blob 68MB ออกทุก commit)
3. `git push --force` ไป main
4. แจ้งทีมให้ re-clone หรือ `git fetch && git reset --hard origin/main` (commit hash เปลี่ยนทั้งหมด)

**เงื่อนไข/ความเสี่ยง:**
- ต้อง **ไม่มี PR/branch ค้าง** ตอนทำ (ไม่งั้น merge ยากเพราะ history แตก) → นัดเวลาทำ
- เป็น destructive + force-push → ทำหลัง Phase 1 stable แล้วเท่านั้น
- ต้องมี `git-filter-repo` ติดตั้ง (`brew install git-filter-repo`)

---

## Manual actions นอก repo (ต้องทำเพื่อให้ deploy ทำงาน)

- **Vercel dashboard:**
  - เปลี่ยน Project → Settings → Root Directory: `frontend/user` → `frontend`
  - ตั้ง env `NEXT_PUBLIC_API_BASE` = URL backend บน Render (เช่น `https://knowledge-base-carmen-backend.onrender.com`)
- **Render dashboard / render.yaml:**
  - ใส่ Vercel production domain ใน `CORS_ORIGINS` ของ backend

## Verification (Phase 1)

- [ ] `docker compose --env-file .env.docker config` parse ผ่าน (ไม่มี service frontend, ไม่มี error)
- [ ] `docker build -f backend/Dockerfile backend/` ผ่าน
- [ ] `docker build -f frontend/Dockerfile frontend/` ผ่าน (standalone mode)
- [ ] `cd frontend && npm ci && npm run build` ผ่าน (Vercel-style native build)
- [ ] `cd backend && go build ./...` ผ่าน
- [ ] `grep -rn "frontend/user"` เหลือ 0 (ยกเว้นบันทึก history ที่ตั้งใจไว้ ถ้ามี)
- [ ] `git ls-files | grep -E 'public/|go1.22.5|^package-lock.json|backend/package-lock.json'` = ว่าง
- [ ] frontend ยังมีไฟล์ครบ (`frontend/package.json`, `frontend/app/`, `frontend/public/` 58 ไฟล์, `frontend/vercel.json`)

## Out of scope (ไม่ทำในงานนี้)

- ไม่แก้ `WIKI_CONTENT_PATH` (ของเดิมชี้ `carmen_cloud` ที่ไม่มีจริง — เป็น bug คนละเรื่อง)
- ไม่ย้าย `contents/` หรือ `scripts/` (เป็นของกลางที่ root โดยตั้งใจ)
- ไม่แก้ logic ของ backend/frontend ใดๆ
- ไม่แตะ CI workflows (ไม่ได้อ้าง `frontend/user`)
- ไม่แยกเป็น 2 git repo (ตัดสินใจคง monorepo)
