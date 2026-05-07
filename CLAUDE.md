# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Monorepo, three runtime services sharing one Postgres+pgvector:

- `backend/` — Go Fiber API. Owns wiki/FAQ/activity/indexing; **proxies `/api/chat/*` to the Python service** via `PYTHON_CHATBOT_URL`.
- `carmen-chatbot/` — Python FastAPI RAG (intent → hybrid retrieval pgvector+FTS+RRF → LLM), streams NDJSON.
- `frontend/user/` — Next.js App Router. Talks only to the Go backend.
- `contents/<bu>/...` — markdown source-of-truth (the Go indexer reads this into `<bu>.documents` / `<bu>.document_chunks`).

### Multi-BU model (the big idea)
Each Business Unit is a Postgres **schema** registered in `public.business_units`. Routing is by `?bu=<slug>`. Same slug used everywhere: `business_units.slug`, schema name, `contents/<slug>/` folder.

- Slug regex: `^[a-zA-Z_][a-zA-Z0-9_]*$` — **no dashes** (it's a schema name).
- `contents/training_center/<module>/...` collapses to a single BU `training_center`.
- Push to `main` under `contents/**` triggers `.github/workflows/auto-provision-sync-reindex.yml` → provision/deprovision + sync + reindex via the backend admin API.
- FAQ is the exception: lives in `public.faq_*`, seeded separately via `scripts/build_faq_seed_sql.py`.

### Embedding dimension
Vector column dim must match `VECTOR_DIMENSION` env and the embed model. Migrations carry 1536/2000/4096 variants — pick one path per `backend/migrations/README.md`. New BUs created via `create_bu_tables()` inherit whatever dimension the function was last redefined with.

## Commands

```bash
# Backend (from backend/)
make run | make dev | make build | make test
go test ./tests/... -run TestName -v                    # single test

# Backend CLI ops (server binary doubles as a CLI)
go run cmd/server/main.go reindex <bu>|all
go run cmd/server/main.go reset index <bu>|all          # truncate <bu>.documents/document_chunks
go run cmd/server/main.go reset all                     # truncate public activity/chat tables

# Frontend (from frontend/user/)
npm run dev | npm run build | npm run lint | npm test

# Chatbot (from carmen-chatbot/)
python start_server.py                                  # or: uvicorn backend.main:app --reload
pytest

# Whole stack
docker compose --env-file .env.docker up --build
./scripts/migrate-docker.sh                             # first-time migrations (psql via db container)

# Content ops
./scripts/provision-bu.sh <bu>                          # API_BASE + ADMIN_KEY env required
./scripts/sync-wiki-and-reindex-bu.sh <bu>
```

Health: `:8080/health` (Go), `:8000/api/health` (Python). Swagger: `:8080/swagger/index.html`.

## Non-obvious conventions

- **Run migrations with `psql`, not `./server migrate`.** The Go migrate splits on `;` and corrupts files with `DO $$ … $$` / PL/pgSQL (notably `0002_setup_multi_bu.sql`). Use `scripts/migrate-docker.sh`. Order is in `backend/migrations/README.md`.
- **Admin/internal endpoints need header auth.** `X-Admin-Key` (`ADMIN_API_KEY`) for ops; `X-Internal-API-Key` (`INTERNAL_API_KEY`) for backend↔chatbot.
- **Markdown frontmatter is parsed** — every file in `contents/` needs the YAML block (`title/description/published/date/tags/editor: markdown/dateCreated`). Optional second YAML block with `weight` orders the sidebar. See `HANDOVER-ADD-NEW-BU.md` §5.
- **Chatbot behavior is tuned via YAML**, not code: `carmen-chatbot/backend/config/{tuning,intents,path_rules,prompts}.yaml`.
- **Frontend API base** is resolved in `frontend/user/lib/config.ts` (`NEXT_PUBLIC_API_BASE` / `NEXT_PUBLIC_USE_REMOTE_API`). Selected BU lives in cookie `selected_bu`.

## Where to look next

- `HANDOVER-ADD-NEW-BU.md` — full BU runbook + markdown format
- `backend/migrations/README.md` — migration order + dimension variants
- `carmen-chatbot/{HANDOVER,TUNING_GUIDE,chatbot-flow}.md` — RAG internals
- Per-service `README.md` in `backend/`, `frontend/user/`, `carmen-chatbot/`
