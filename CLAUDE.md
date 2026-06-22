# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Monorepo, two runtime services sharing one Postgres+pgvector:

- `backend/` — Go Fiber API. Owns wiki/FAQ/activity/indexing **and the native RAG chatbot at `/api/chat/*`** (intent → hybrid retrieval pgvector+FTS+RRF → LLM, streams NDJSON). The chatbot is tuned via YAML in `backend/config/{tuning,intents,path_rules,prompts}.yaml` (no code change/restart for tuning). The former Python `carmen-chatbot/` service was migrated into the Go backend and removed.
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

# Chatbot is native in the Go backend — no separate service.
# DB/LLM-gated chat tests: RUN_DB_TESTS=1 go test ./tests/parity/... ./internal/services/... (needs reachable DB + LLM key)

# Whole stack
docker compose --env-file .env.docker up --build
./scripts/migrate-docker.sh                             # first-time migrations (psql via db container)

# Content ops
./scripts/provision-bu.sh <bu>                          # API_BASE + ADMIN_KEY env required
./scripts/sync-wiki-and-reindex-bu.sh <bu>
```

Health: `:8080/health` (Go backend, serves `/api/chat/*` natively). Swagger: `:8080/swagger/index.html`.

## Non-obvious conventions

- **Run migrations with `psql`, not `./server migrate`.** The Go migrate splits on `;` and corrupts files with `DO $$ … $$` / PL/pgSQL (notably `0002_setup_multi_bu.sql`). Use `scripts/migrate-docker.sh`. Order is in `backend/migrations/README.md`.
- **Admin/internal endpoints need header auth.** `X-Admin-Key` (`ADMIN_API_KEY`) for ops; `X-Internal-API-Key` (`INTERNAL_API_KEY`) for internal record-history.
- **Markdown frontmatter is parsed** — every file in `contents/` needs the YAML block (`title/description/published/date/tags/editor: markdown/dateCreated`). Optional second YAML block with `weight` orders the sidebar. See `HANDOVER-ADD-NEW-BU.md` §5.
- **Chatbot behavior is tuned via YAML**, not code: `backend/config/{tuning,intents,path_rules,prompts}.yaml`. Native chat endpoints are flag-free (always native); the RAG flow lives in `backend/internal/api/chat_stream_flow.go` + `internal/services/{retrieval,intent_router_service,query_rewrite,prompt}_service.go`.
- **Frontend API base** is resolved in `frontend/user/lib/config.ts` (`NEXT_PUBLIC_API_BASE` / `NEXT_PUBLIC_USE_REMOTE_API`). Selected BU lives in cookie `selected_bu`.

## Where to look next

- `HANDOVER-ADD-NEW-BU.md` — full BU runbook + markdown format
- `backend/migrations/README.md` — migration order + dimension variants
- `docs/superpowers/plans/2026-06-22-chatbot-go-*` — the Python→Go chatbot migration specs/plans (RAG internals, parity notes)
- Per-service `README.md` in `backend/`, `frontend/user/`
