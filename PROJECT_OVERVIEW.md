---
title: PROJECT_OVERVIEW
description: ภาพรวมโครงสร้างและ tech stack ของระบบ KB Carmen
published: true
editor: markdown
---

# โครงสร้างโปรเจคทั้งระบบ & Tech Stack

## ภาพรวมระบบ

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              ผู้ใช้ (User)                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  Frontend (Next.js)   │
                        │  frontend/user        │
                        └───────────┬───────────┘
                                    │ HTTPS
                                    ▼
                        ┌───────────────────────┐
                        │  Go Backend (Fiber)   │
                        │  backend/             │
                        │  - wiki / faq /       │
                        │    activity /         │
                        │    indexing           │
                        │  - proxies /api/chat  │
                        └─┬───────────────────┬─┘
                          │                   │
                          │                   │ /api/chat/stream
                          ▼                   ▼
              ┌───────────────────────┐  ┌───────────────────────┐
              │  Postgres + pgvector  │  │  Python FastAPI       │
              │  (Neon / Render)      │◄─┤  carmen-chatbot/      │
              │                       │  │  - intent router      │
              │  <bu>.documents       │  │  - hybrid retrieval   │
              │  <bu>.document_chunks │  │  - LLM generation     │
              │  public.faq_*         │  └───────────┬───────────┘
              │  public.chat_history  │              │
              │  public.activity_logs │              │ embeddings + LLM
              └───────────▲───────────┘              ▼
                          │                ┌───────────────────────┐
                          │                │  OpenRouter           │
                          │                │  (chat / intent /     │
                          │                │   embedding model)    │
                          │                └───────────────────────┘
                          │
                ┌─────────┴──────────┐
                │  GitHub Actions    │
                │  contents/** push  │
                │  → provision +     │
                │    sync + reindex  │
                └────────────────────┘
```

---

## ฝั่งต่างๆ ในระบบ

| ฝั่ง | บทบาท | สถานะ |
|------|--------|--------|
| **Frontend** | Next.js App Router — KB browse, FAQ, Activity, floating chat widget | ✅ ใช้งานจริง |
| **Go Backend** | Fiber API — wiki/faq/activity/indexing + proxy `/api/chat/*` ไป Python | ✅ ใช้งานจริง |
| **Python Chatbot** | FastAPI RAG — intent + retrieval + LLM, NDJSON streaming | ✅ ใช้งานจริง |
| **Postgres + pgvector** | metadata + vector index + chat history + activity logs | ✅ Neon / Render Postgres |
| **OpenRouter** | LLM (chat/intent) + embedding service | ✅ ผ่าน `LLM_*` env |
| **GitHub Actions** | Auto provision/sync/reindex เมื่อ push `contents/**` เข้า main | ✅ `.github/workflows/auto-provision-sync-reindex.yml` |
| **Wiki.js** (optional) | UI สำหรับ author markdown — sync ลง git | ⚙️ ใช้กับบาง BU เท่านั้น |

---

## Tech Stack แยกตามฝั่ง

### Frontend
| รายการ | เทคโนโลยี |
|--------|-----------|
| Framework | Next.js (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS + Radix UI |
| i18n | next-intl (th/en) |
| Markdown | react-markdown + remark/rehype |
| Test | Jest + React Testing Library |

### Go Backend
| รายการ | เทคโนโลยี |
|--------|-----------|
| Language | Go 1.25 (workspace ใน `go.work`) |
| Framework | Fiber v2 |
| ORM | GORM (เฉพาะบางส่วน — ส่วนใหญ่ใช้ raw SQL) |
| โครงสร้าง | `internal/{api,router,services,database,middleware,config,security,...}` |
| External | OpenRouter (embed), GitHub (sync), Python chatbot (proxy) |

### Python Chatbot
| รายการ | เทคโนโลยี |
|--------|-----------|
| Framework | FastAPI + uvicorn |
| Architecture | Pure Python orchestration (ไม่ใช้ LangChain) — ดู `HANDOVER.md` |
| Retrieval | pgvector + Postgres FTS + Reciprocal Rank Fusion |
| Config | YAML (`backend/config/{tuning,intents,path_rules,prompts}.yaml`) |

### Database
| รายการ | เทคโนโลยี |
|--------|-----------|
| Engine | PostgreSQL + pgvector |
| Hosting | Neon / Render Postgres / local docker |
| Schema-per-tenant | แต่ละ BU = schema เช่น `carmen.documents`, `blueledgers.documents` |
| Migrations | ไฟล์ SQL ใน `backend/migrations/` รันด้วย `psql` |

### Multi-BU Model
- แต่ละ Business Unit (BU) = Postgres schema ลงทะเบียนใน `public.business_units`
- ใช้ slug เดียวกันทั้ง schema name, `business_units.slug`, โฟลเดอร์ `contents/<slug>/`
- Slug ต้องตรง regex `^[a-zA-Z_][a-zA-Z0-9_]*$` — ห้ามมี `-`
- เลือก BU ผ่าน query `?bu=<slug>` ในทุก endpoint

---

## โครงสร้างโฟลเดอร์ (repo)

```
kb-carmen/
├── backend/                  # Go Fiber API
│   ├── cmd/server/main.go    # entry point + CLI ops (migrate/reindex/reset)
│   ├── internal/
│   │   ├── api/              # request handlers
│   │   ├── router/           # route registration
│   │   ├── services/         # business logic (wiki/indexing/chat/faq/activity)
│   │   ├── database/         # connection + raw SQL helpers
│   │   ├── security/         # API key auth, schema validation
│   │   ├── middleware/       # CORS, request id, recovery
│   │   ├── config/           # env loader
│   │   └── nlp/              # text utilities
│   ├── migrations/           # numbered .sql files (PL/pgSQL friendly)
│   └── pkg/                  # github + openrouter clients
├── carmen-chatbot/
│   └── backend/
│       ├── api/              # FastAPI routes
│       ├── core/             # rate limit, errors, settings
│       ├── llm/              # chat_service, intent_router, retrieval, llm_client
│       └── config/           # YAML tunables (hot-reload สำหรับบางไฟล์)
├── frontend/user/            # Next.js App Router
│   ├── app/                  # routes (KB, FAQ, activity, admin, chat)
│   ├── components/           # UI primitives + chat widget
│   ├── lib/                  # API clients, config
│   └── messages/             # next-intl translations
├── scripts/                  # import / sync / seed / provision utilities
├── contents/                 # markdown source-of-truth (per-BU folder)
├── .github/workflows/        # auto-provision-sync-reindex + wiki-content-merge
├── docker-compose.yml
└── render.yaml               # Render Blueprint
```

---

## Flow สำคัญ

### 1. แสดงบทความ KB
1. Browser เปิด `frontend/user`
2. เรียก `/api/wiki/categories?bu=<slug>` → `/api/wiki/content/*` ที่ Go backend
3. Go backend อ่าน markdown จาก `WIKI_CONTENT_PATH` (เช่น `/repo/contents/<bu>`) + metadata จาก `<bu>.documents`
4. ส่ง markdown + assets กลับให้ frontend render

### 2. ถามแชต
1. User พิมพ์ใน floating chat → frontend ยิง `POST /api/chat/stream`
2. Go backend proxy ไป Python (`PYTHON_CHATBOT_URL`)
3. Python ทำ pipeline: intent → query rewrite (ถ้ามี history) → translate (ถ้าไม่ใช่ไทย) → hybrid retrieval (pgvector + FTS + RRF + path boost) → LLM
4. ส่ง NDJSON events (`status`, `chunk`, `sources`, `suggestions`, `done`) กลับ
5. Python บันทึก `public.chat_history` (มี HMAC mask + token tracking)

### 3. อัปเดตเนื้อหา
1. Author commit markdown ใต้ `contents/<bu>/` แล้ว push เข้า `main`
2. GitHub Actions workflow `auto-provision-sync-reindex.yml`:
   - Detect BU ที่เปลี่ยนจาก path
   - `POST /api/business-units/provision` (สร้าง schema + tables ถ้ายังไม่มี)
   - `POST /api/wiki/sync` (pull ลง working copy ของ Go backend)
   - `POST /api/index/rebuild?bu=<bu>` (re-embed + write `<bu>.document_chunks`)
3. ถ้าลบโฟลเดอร์ BU จนหมด → `deprovision` (drop schema)

---

## เอกสารอ้างอิงเพิ่มเติม

- `README.md` — quick start
- `CLAUDE.md` — guidance สำหรับ Claude Code
- `USER_MANUAL_TH.md` — คู่มือผู้ใช้/ops
- `HANDOVER-ADD-NEW-BU.md` — runbook เพิ่ม/ลบ BU + ฟอร์แมต markdown
- `backend/migrations/README.md` — ลำดับ migration + dimension variants
- `carmen-chatbot/{TUNING_GUIDE,HANDOVER,chatbot-flow}.md` — RAG pipeline
