# Repository Sitemap

> Map of this monorepo for newcomers and for AI assistants navigating the repo.
> Pairs with `CLAUDE.md` (how to work here) and `README.md` (how to run).
> The tree at the bottom is auto-generated — run `python3 scripts/gen_sitemap.py`
> to refresh it. Edit the narrative freely, but never edit inside the AUTO-TREE markers.

## Top-level map

| Path | What it is | Look deeper |
| --- | --- | --- |
| `backend/` | Go Fiber API + native RAG chatbot | `backend/README.md`, `CLAUDE.md` |
| `frontend/` | Next.js App Router UI | `frontend/README.md` |
| `contents/` | Markdown source-of-truth per Business Unit | `manual/HANDOVER-ADD-NEW-BU.md` |
| `scripts/` | Provision / sync / import ops scripts | — |
| `docs/` | Design specs & implementation plans | `docs/superpowers/` |
| `manual/` | Runbooks & user/handover manuals | — |
| root config | deploy + dev runners | `render.yaml`, `run_dev.sh` |

## `backend/` — Go Fiber API

Owns wiki / FAQ / activity / indexing, the native RAG chatbot at `/api/chat/*`
(intent → hybrid retrieval pgvector + FTS + RRF → LLM, streams NDJSON), and
PDF export at `/api/export/pdf` (chat-answer HTML → PDF via a Gotenberg sidecar).

Key entry points:
- `cmd/server/main.go` — HTTP server + CLI ops (`reindex`, `reset`).
- `internal/api/chat_stream_flow.go` — RAG request flow.
- `internal/services/{retrieval,intent_router_service,query_rewrite,prompt}_service.go` — RAG stages.
- `internal/api/export_handler.go` + `internal/export/` — PDF export `/api/export/pdf` (HTML → Gotenberg sidecar; SSRF-guard + base64 `<img>`, rate-limited 10/min/IP, PDF-only; needs `GOTENBERG_URL`).
- `config/{tuning,intents,path_rules,prompts}.yaml` — chatbot tuning (no rebuild/restart).
- `migrations/` — SQL schema; apply with `psql` (see `backend/migrations/README.md`).

## `frontend/` — Next.js App Router

Talks only to the Go backend. API base resolved in `lib/config.ts`; selected BU in cookie `selected_bu`.

Routes:
- `app/categories/` — wiki articles.
- `app/faq/` — FAQ browser.
- `app/chat/` — RAG chatbot UI.
- `app/activity/`, `app/admin/` — activity log + admin.

## `contents/` — markdown source-of-truth

The Go indexer reads these into `public.documents` / `public.document_chunks`, filtered by `bu_id`.
Each top-level folder is a Business Unit (`contents/<slug>/...`); every file needs YAML frontmatter.

Business Units:
- `carmen/` — Carmen cloud accounting docs.
- `blueledgers/` — BlueLedgers procurement / inventory docs.
- `training_center/` — training material (collapses to a single BU).

## `scripts/`, `docs/`, `manual/`, root config

- `scripts/` — `provision-bu.sh`, `sync-wiki-and-reindex-bu.sh`, FAQ seed builders, import tools, `gen_sitemap.py`.
- `docs/superpowers/{specs,plans}/` — design specs and step-by-step implementation plans.
- `manual/` — `HANDOVER-ADD-NEW-BU.md`, `PROJECT_OVERVIEW.md`, `USER_MANUAL_TH.md`.
- root — `render.yaml`, `run_dev.sh` / `run_dev.ps1`; `backend/docker-compose.yml` (backend-only stack, external DB).

## Directory tree (auto-generated)

<!-- BEGIN AUTO-TREE -->
```
.
.github/
  workflows/
backend/
  cmd/
    server/
  config/
  docs/
  internal/
    api/
    apidoc/
    chatconfig/
    config/
    constants/
    database/
    export/
    middleware/
    models/
    nlp/
    router/
    security/
    services/
    utils/
  migrations/
  pkg/
    github/
    openrouter/
  tests/
    nlp/
    parity/
    router/
    security/
contents/
  blueledgers/  (64 md)
    faq/  — FAQ
    Material/
    Options/
    Portions/
    Procurement/
  carmen/  (103 md)
    ap/  — Account Payable
    ar/  — Account Receivable
    asset/  — Asset
    changelog/
    comment/
    configuration/  — Configuration
    faq/  — FAQ
    gl/  — Carmen Cloud
    workbook/  — Carmen Work Book
  training_center/  (89 md)
    cadena/  — Cadena
    carmen_cloud/  — Carmen Cloud
    carmen_onpermise/  — Carmen On-Premise
docs/
  superpowers/
    plans/
    specs/
frontend/
  __tests__/
  app/
    activity/
    admin/
    api/
    categories/
    chat/
    faq/
  components/
    activity/
    chat/
    kb/
    search/
    ui/
  configs/
  hooks/
  i18n/
  lib/
  messages/
  public/
  styles/
  types/
frontend-react/
  public/
  src/
    components/
    configs/
    hooks/
    i18n/
    lib/
    messages/
    routes/
    styles/
    test/
manual/
scripts/
  tests/
```
<!-- END AUTO-TREE -->
