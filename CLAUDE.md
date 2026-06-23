# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Monorepo, two runtime services sharing one Postgres+pgvector:

- `backend/` — Go Fiber API. Owns wiki/FAQ/activity/indexing **and the native RAG chatbot at `/api/chat/*`** (intent → hybrid retrieval pgvector+FTS+RRF → LLM, streams NDJSON). The chatbot is tuned via YAML in `backend/config/{tuning,intents,path_rules,prompts}.yaml` (no code change/restart for tuning). The former Python `carmen-chatbot/` service was migrated into the Go backend and removed. It also serves **PDF export at `/api/export/pdf`** (chat-answer HTML → PDF via a **Gotenberg** sidecar; see Non-obvious conventions).
- `frontend/` — Next.js App Router. Talks only to the Go backend.
- `contents/<bu>/...` — markdown source-of-truth (the Go indexer reads this into `public.documents` / `public.document_chunks` filtered by `bu_id`).

### Multi-BU model (the big idea)
Each Business Unit is a **row** in `public.business_units` (id = bu_id). All tenant tables (`documents`, `document_chunks`, `chat_history`, `activity_logs`, `faq_*`) live in the `public` schema and filter by `bu_id`. Routing is by `?bu=<slug>` → resolved to `bu_id` via `database.BUIDForSlug`.

- **All ids are `UUID`** — every PK and FK (`bu_id`, `doc_id`, faq ids, chat log ids) is `UUID`. The app generates ids with `uuid.NewV7()` (`github.com/google/uuid`); columns also carry `DEFAULT gen_random_uuid()` as a DB-level fallback. API id fields (chat `log_id`, feedback `message_id`, `/api/documents` id, faq ids, chat-history list id) are UUID strings.
- Slug regex: `^[a-zA-Z_][a-zA-Z0-9_]*$` — **no dashes** (slug is the `contents/<slug>` folder name + routing key).
- `contents/training_center/<module>/...` collapses to a single BU `training_center`.
- Push to `main` under `contents/**` triggers `.github/workflows/auto-provision-sync-reindex.yml` → provision/deprovision + sync + reindex via the backend admin API.
- FAQ is the exception: lives in `public.faq_*`, seeded separately via `scripts/build_faq_seed_sql.py`.

### Embedding dimension
Vector column dim must match `VECTOR_DIMENSION` env and the embed model. Migrations carry 1536/2000/4096 variants — pick one path per `backend/migrations/README.md`. New BUs are rows in `public.business_units` with a UUID `id` (auto-generated); documents/chunks are shared public tables at the dimension defined in `0001_init_schema.sql`.

## Commands

```bash
# Backend (from backend/)
make run | make dev | make build | make test
go test ./tests/... -run TestName -v                    # single test

# Backend CLI ops (server binary doubles as a CLI)
go run cmd/server/main.go reindex <bu>|all
go run cmd/server/main.go reset index <bu>|all          # delete a BU's rows in public.documents/document_chunks (all = TRUNCATE both)
go run cmd/server/main.go reset all                     # truncate public activity/chat tables

# Frontend (from frontend/)
npm run dev | npm run build | npm run lint | npm test

# Chatbot is native in the Go backend — no separate service.
# DB/LLM-gated chat tests: RUN_DB_TESTS=1 go test ./tests/parity/... ./internal/services/... (needs reachable DB + LLM key)

# Backend stack (compose lives in backend/) — connects to an EXTERNAL Postgres via backend/.env.docker
(cd backend && docker compose --env-file .env.docker up --build)
./scripts/migrate-docker.sh                             # first-time migrations against the external DB (from root)

# Content ops
./scripts/provision-bu.sh <bu>                          # API_BASE + ADMIN_KEY env required
./scripts/sync-wiki-and-reindex-bu.sh <bu>
```

Health: `:8080/health` (Go backend, serves `/api/chat/*` natively). Swagger: `:8080/swagger/index.html`.

## Non-obvious conventions

- **Run migrations with `psql`, not `./server migrate`.** The Go migrate splits on `;` and corrupts files with `DO $$ … $$` / PL/pgSQL (notably `0002_setup_multi_bu.sql`). Use `scripts/migrate-docker.sh`. Order is in `backend/migrations/README.md`.
- **Docker compose + env-file gotchas.** Compose lives at `backend/docker-compose.yml` and runs the **backend only** — it connects to an **external** Postgres via `DB_*` in `backend/.env.docker` (gitignored; create from `backend/docker-compose.env.example`; `DB_HOST` defaults to `host.docker.internal`). Run compose from `backend/`; apply migrations with `./scripts/migrate-docker.sh` (from root, against that external DB). `backend/.env` points at the remote dev DB and is loaded with `godotenv.Overload`, so plain env vars don't override it — to point Go tests at another DB, put `DB_*`/`VECTOR_DIMENSION=2000` in a temp file and run `BACKEND_DOTENV=<file> RUN_DB_TESTS=1 go test …` (BACKEND_DOTENV is loaded last and wins).
- **Admin/internal endpoints need header auth.** `X-Admin-Key` (`ADMIN_API_KEY`) for ops; `X-Internal-API-Key` (`INTERNAL_API_KEY`) for internal record-history.
- **Markdown frontmatter is parsed** — every file in `contents/` needs the YAML block (`title/description/published/date/tags/editor: markdown/dateCreated`). Optional second YAML block with `weight` orders the sidebar. See `manual/HANDOVER-ADD-NEW-BU.md` §5.
- **Chatbot behavior is tuned via YAML**, not code: `backend/config/{tuning,intents,path_rules,prompts}.yaml`. Native chat endpoints are flag-free (always native); the RAG flow lives in `backend/internal/api/chat_stream_flow.go` + `internal/services/{retrieval,intent_router_service,query_rewrite,prompt}_service.go`.
- **Frontend API base** is resolved in `frontend/lib/config.ts` (`NEXT_PUBLIC_API_BASE` / `NEXT_PUBLIC_USE_REMOTE_API`). Selected BU lives in cookie `selected_bu`.
- **PDF export (`POST /api/export/pdf`)** is native Go in `backend/internal/export/` + `internal/api/export_handler.go`: it SSRF-guards + inlines `<img>` as base64 (IP-pinned dialer in `ssrf.go`), wraps the body in a styled template, then renders via a **Gotenberg** (Chromium) sidecar. Public but **rate-limited** (10/min/IP) + 2 MB body cap; **PDF-only** (DOCX dropped — Gotenberg has no HTML→DOCX route). Set `GOTENBERG_URL` (empty → handler returns `503`). Gotenberg runs as a **separate service**: `gotenberg` in `backend/docker-compose.yml` for local dev; a private `pserv` in `render.yaml` with `GOTENBERG_URL` auto-wired via `fromService` (config.go prepends `http://` to the scheme-less internal `host:port`).

## Where to look next

- `sitemap.md` — repo structure map (narrative + auto-generated tree; refresh with `python3 scripts/gen_sitemap.py`)
- `manual/HANDOVER-ADD-NEW-BU.md` — full BU runbook + markdown format
- `backend/migrations/README.md` — migration order + dimension variants
- `docs/superpowers/plans/2026-06-22-chatbot-go-*` — the Python→Go chatbot migration specs/plans (RAG internals, parity notes)
- Per-service `README.md` in `backend/`, `frontend/`
