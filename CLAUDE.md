# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

Monorepo with three runtime services plus tooling:

- `backend/` — Go Fiber API (wiki, indexing, chat proxy, FAQ, activity, BU admin, GitHub webhook)
- `carmen-chatbot/` — Python FastAPI RAG service (intent → retrieval → LLM, NDJSON streaming)
- `frontend/user/` — Next.js App Router UI (KB browse, FAQ, activity, floating chat)
- `scripts/` — import/convert/seed/sync utilities (shell + Python)
- `contents/` — markdown source-of-truth, organized as `contents/<bu-slug>/...`
- `backend/migrations/` — numbered `.sql` files (PL/pgSQL); ordering is documented in `backend/migrations/README.md`
- `go.work` — Go workspace pinning `./backend`

## Big-Picture Architecture

Request flow:
1. Browser → Next.js frontend → Go backend (`/api/wiki/*`, `/api/chat/*`, `/api/faq/*`, `/api/activity/*`, `/api/business-units`)
2. Go backend handles wiki/FAQ/activity/indexing directly against Postgres, and **proxies chat** to the Python service (`PYTHON_CHATBOT_URL`, e.g. `http://chatbot:8000`).
3. Python chatbot runs intent routing → query rewrite → hybrid retrieval (pgvector + FTS + RRF) → LLM generation, returning NDJSON events (`status`, `chunk`, `sources`, `suggestions`, `done`).
4. Both backends share the same Postgres+pgvector instance.

Data lifecycle for KB content:
- Author edits markdown in `contents/<bu>/...` (or via Wiki.js → git sync).
- Push to `main` triggers `.github/workflows/auto-provision-sync-reindex.yml`, which:
  detects changed BUs from `contents/<bu>/...` paths → calls `POST /api/business-units/provision` → `POST /api/wiki/sync` → `POST /api/index/rebuild?bu=<bu>`. Deleting a BU folder triggers `deprovision` (drops the schema).
- The Go indexing service writes documents/embeddings into `<bu>.documents` and `<bu>.document_chunks` (per-BU schema). FAQ lives in `public.faq_*`, seeded separately.

### Multi-BU model (critical)
Each Business Unit is a Postgres **schema** (e.g. `carmen`, `blueledgers`) registered in `public.business_units`. Frontend/backend route by `?bu=<slug>` and resolve content from `contents/<slug>/`. `create_bu_tables('<slug>')` (defined in migration `0002`) provisions per-BU tables.

BU slug must match `^[a-zA-Z_][a-zA-Z0-9_]*$` — **no dashes** (it becomes a Postgres schema name). Use the same slug across `business_units.slug`, schema name, and `contents/<slug>` folder.

`contents/training_center/<module>/...` is a special case: all paths under `training_center/` collapse to BU `training_center` (see `extract_bu` in the workflow).

### Embedding dimension gotcha
Vector column dimension must match `VECTOR_DIMENSION` env and the LLM embed model. Migrations include 1536 (default), 2000, and 4096 variants — only run the variant matching your stack. See `backend/migrations/README.md` for the correct order. New BUs created via `create_bu_tables()` use whatever dimension the function was last redefined with.

## Common Commands

### Backend (Go) — run from `backend/`
```bash
make run                                  # go run cmd/server/main.go
make dev                                  # air hot-reload (requires `air`)
make build
make test                                 # go test ./tests/... -v
make test-coverage
go test ./tests/... -run TestName -v      # single test
```

The server binary is also a CLI for ops:
```bash
go run cmd/server/main.go migrate <path>           # run a single SQL file (avoid for PL/pgSQL — use psql)
go run cmd/server/main.go reindex <bu>|all
go run cmd/server/main.go reset index <bu>|all     # truncate <bu>.documents / document_chunks
go run cmd/server/main.go reset all                # truncate public activity/chat tables
```

Swagger regen (after editing handler annotations):
```bash
cd backend/cmd/server
go run github.com/swaggo/swag/cmd/swag@v1.16.4 init -g main.go -o ../../docs -d .,../../internal/apidoc,../../internal/models
```
Swagger UI: `http://localhost:8080/swagger/index.html`.

### Frontend — run from `frontend/user/`
```bash
npm run dev
npm run build && npm run start
npm run lint
npm test                                  # jest
npm test -- path/to/file.test.ts          # single test
```

### Chatbot — run from `carmen-chatbot/`
```bash
python start_server.py
# or:
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pytest                                    # config in pytest.ini
pytest path/to/test_file.py::test_name
```

### Whole stack (Docker)
```bash
cp docker-compose.env.example .env.docker     # then fill secrets
docker compose --env-file .env.docker up --build
./scripts/migrate-docker.sh                   # first-time DB migrations (uses psql in the db container)
```

Health: `curl http://localhost:8080/health` (Go) and `curl http://localhost:8000/api/health` (Python).

### Content workflow
```bash
# Manual provision/deprovision (bypassing the GH Actions workflow)
API_BASE=http://localhost:8080 ADMIN_KEY="<admin-key>" ./scripts/provision-bu.sh <bu>
API_BASE=http://localhost:8080 ADMIN_KEY="<admin-key>" ./scripts/deprovision-bu.sh <bu>

# Sync wiki content from git + reindex one BU
ADMIN_KEY="<admin-key>" ./scripts/sync-wiki-and-reindex-bu.sh <bu>

# Convert .docx → .md (generic)
pip install -r scripts/requirements-kb-convert.txt
python scripts/kb_docx_to_md.py --input <docx-dir> --output contents/<bu>

# Seed FAQ tables for a BU
python3 scripts/build_faq_seed_sql.py --faq-dir contents/<bu>/faq --bu <bu> --out-sql scripts/seed_<bu>_faq.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/seed_<bu>_faq.sql
```

## Conventions That Aren't Obvious From The Code

- **Run migrations with `psql`, not `./server migrate`.** The Go migrate command splits on `;`, which breaks files containing `DO $$ ... $$` / PL/pgSQL functions (notably `0002_setup_multi_bu.sql`). Use `scripts/migrate-docker.sh` or `psql` directly. Order is in `backend/migrations/README.md`.
- **Admin/internal endpoints require API key headers.** `X-Admin-Key` (matches backend `ADMIN_API_KEY`) for ops endpoints; `X-Internal-API-Key` (`INTERNAL_API_KEY`) for backend↔chatbot calls. The GitHub Actions workflow uses `BACKEND_BASE_URL` + `BACKEND_ADMIN_API_KEY` secrets.
- **Markdown frontmatter is parsed.** Files in `contents/` start with a YAML frontmatter block (`title`, `description`, `published`, `date`, `tags`, `editor: markdown`, `dateCreated`). An optional second YAML block with `weight` controls sidebar ordering. See `HANDOVER-ADD-NEW-BU.md` §5 for the exact shape.
- **Images** under `contents/<bu>/_images/...` and linked relative; backend serves them via `/wiki-assets/*`. Don't inline-base64 images — use the `_images/<article>/...` layout produced by `kb_docx_to_md.py`.
- **Frontend API base resolution** lives in `frontend/user/lib/config.ts` and toggles between local and remote via `NEXT_PUBLIC_API_BASE` / `NEXT_PUBLIC_USE_REMOTE_API`. Selected BU is stored in cookie `selected_bu`.
- **Chatbot tunables are YAML, not code.** `carmen-chatbot/backend/config/{tuning,intents,path_rules,prompts}.yaml` drive retrieval and prompt behavior; prefer editing these over hard-coding in Python.
- Production cautions in `backend/cmd/server/main.go`: warns if `PYTHON_CHATBOT_URL` is loopback or a placeholder. When deploying, set it to the public URL of the chatbot service.

## Reference Docs In-Repo

- `README.md` — high-level run/deploy instructions (Thai)
- `HANDOVER-ADD-NEW-BU.md` — full runbook for adding/removing a BU and the markdown format
- `USER_MANUAL_TH.md` — end-user manual (Thai)
- `backend/README.md`, `frontend/user/README.md`, `carmen-chatbot/README.md` — per-service docs
- `backend/migrations/README.md` — migration ordering and dimension variants
- `carmen-chatbot/HANDOVER.md`, `carmen-chatbot/TUNING_GUIDE.md`, `carmen-chatbot/chatbot-flow.md` — RAG pipeline details
