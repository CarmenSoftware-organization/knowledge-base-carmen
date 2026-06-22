# Convert all `public.*` ids to UUID (v7, app-generated)

**Date:** 2026-06-23
**Status:** Approved design — ready for implementation plan
**Scope:** Backend (Go) + Postgres migrations. Frontend: id fields become strings (flagged, not in this scope).
**Builds on:** the per-BU→`public`+`bu_id` consolidation (PR #10, merged). This supersedes the INT-id choice there.

## Problem / Goal

Every primary key and foreign key in the `public` schema is currently an integer
(`SERIAL`/`BIGSERIAL` PK, `INT`/`BIGINT` FK — `bu_id`, `doc_id`, faq parent ids).
Convert them all to **`UUID`**, generated as **UUIDv7 in Go** (`uuid.NewV7()`),
keeping every existing row and relationship (convert **in place**, remap FKs).

## Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Scope | **All** `public.*` ids, including `business_units.id` → `bu_id` becomes UUID everywhere |
| Drivers | Anti-enumeration (non-guessable), cross-DB merge / distributed, app/client-generated ids, standardization |
| UUID variant | **UUIDv7** (time-ordered) — good B-tree/insert locality for `document_chunks`; record-id still non-guessable |
| Generation | **Go app** sets `uuid.NewV7()` on insert; columns also carry `DEFAULT gen_random_uuid()` (v4) as a fallback for SQL/seed inserts |
| Existing data | **Convert in place** — preserve all rows/embeddings/history; remap every FK |
| Go representation | `github.com/google/uuid` `uuid.UUID` (already a dependency; `driver.Valuer`/`sql.Scanner`/JSON-string) |

## Affected tables (10) — every PK + FK

| Table | PK | FK(s) |
|---|---|---|
| business_units | id | — (referenced by every `bu_id`) |
| documents | id | bu_id → business_units |
| document_chunks | id | bu_id → business_units, doc_id → documents |
| chat_history | id | bu_id → business_units |
| activity_logs | id | bu_id → business_units (**ON DELETE SET NULL**, nullable) |
| faq_modules | id | bu_id → business_units |
| faq_submodules | id | module_id → faq_modules |
| faq_categories | id | submodule_id → faq_submodules |
| faq_entries | id | category_id → faq_categories |
| faq_related | (faq_id, related_faq_id) composite | both → faq_entries |

No separate feedback table — feedback lives in `chat_history.metrics`.

## Architecture

### Canonical schema (fresh DBs) — `0001_init_schema.sql`

Mechanical swap: each `SERIAL`/`BIGSERIAL` PK → `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
(`pgcrypto` already enabled); each `INT`/`BIGINT` FK column → `UUID`. Indexes, UNIQUE
constraints, `VECTOR(2000)`, ivfflat/GIN, and the `chat_history` trigger/functions are
unchanged (none key on an id's *type*). Representative:

```sql
CREATE TABLE public.business_units (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    slug        TEXT NOT NULL UNIQUE,   -- still the routing key (?bu=<slug>)
    description TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.documents (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bu_id      UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
    path TEXT NOT NULL, title TEXT, source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (bu_id, path)
);

CREATE TABLE public.document_chunks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bu_id       UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
    doc_id      UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL, content TEXT, embedding VECTOR(2000),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
-- idx_chunks_bu, ivfflat(embedding vector_l2_ops, lists=100), GIN(to_tsvector('simple',content)) unchanged
```

Same swap for `chat_history(id,bu_id)`, `activity_logs(id,bu_id)` (FK stays
`ON DELETE SET NULL`), and the faq chain `faq_modules(id,bu_id)` →
`faq_submodules(id,module_id)` → `faq_categories(id,submodule_id)` →
`faq_entries(id,category_id)` → `faq_related(faq_id,related_faq_id)`. The 3 seed
`business_units` rows get UUIDs from the column default (v4 — fine, low volume).

### In-place conversion — `0003_convert_ids_to_uuid.sql`

For DBs already on the INT version (dev/prod). **Guarded to no-op** when
`business_units.id` is already `uuid` (so fresh UUID DBs skip it). Runs in **one
transaction**, parents before children, in three phases.

**Phase A — give every row a new UUID (the id map):**
```sql
ALTER TABLE public.business_units  ADD COLUMN id_uuid UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.documents       ADD COLUMN id_uuid UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.document_chunks ADD COLUMN id_uuid UUID NOT NULL DEFAULT gen_random_uuid();
-- chat_history, activity_logs, faq_modules, faq_submodules, faq_categories, faq_entries — same
```

**Phase B — translate every FK through its parent's `id`↔`id_uuid` map:**
```sql
ALTER TABLE public.documents       ADD COLUMN bu_id_uuid UUID;
UPDATE public.documents d  SET bu_id_uuid = b.id_uuid
  FROM public.business_units b WHERE b.id = d.bu_id;

ALTER TABLE public.document_chunks ADD COLUMN bu_id_uuid UUID, ADD COLUMN doc_id_uuid UUID;
UPDATE public.document_chunks c SET bu_id_uuid = b.id_uuid
  FROM public.business_units b WHERE b.id = c.bu_id;
UPDATE public.document_chunks c SET doc_id_uuid = d.id_uuid
  FROM public.documents d WHERE d.id = c.doc_id;
-- chat_history.bu_id; activity_logs.bu_id (NULL-safe — only rows with a bu_id);
-- faq_submodules.module_id, faq_categories.submodule_id, faq_entries.category_id;
-- faq_related.faq_id + related_faq_id (both via faq_entries map)
```

**Phase C — drop old int PK/FK/columns, rename `*_uuid` → real names, re-add PK+FK+indexes+UNIQUE.**
Drop child FK constraints first. Example for `document_chunks`:
```sql
ALTER TABLE public.document_chunks
  DROP CONSTRAINT document_chunks_bu_id_fkey,
  DROP CONSTRAINT document_chunks_doc_id_fkey,
  DROP COLUMN bu_id, DROP COLUMN doc_id, DROP COLUMN id CASCADE;
ALTER TABLE public.document_chunks RENAME COLUMN id_uuid TO id;
ALTER TABLE public.document_chunks RENAME COLUMN bu_id_uuid TO bu_id;
ALTER TABLE public.document_chunks RENAME COLUMN doc_id_uuid TO doc_id;
ALTER TABLE public.document_chunks
  ADD PRIMARY KEY (id),
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN bu_id SET NOT NULL,
  ALTER COLUMN doc_id SET NOT NULL,
  ADD CONSTRAINT document_chunks_bu_id_fkey  FOREIGN KEY (bu_id) REFERENCES public.business_units(id) ON DELETE CASCADE,
  ADD CONSTRAINT document_chunks_doc_id_fkey FOREIGN KEY (doc_id) REFERENCES public.documents(id) ON DELETE CASCADE;
CREATE INDEX idx_chunks_bu ON public.document_chunks(bu_id);
-- ivfflat(embedding) + GIN(content) survive (not on id/bu_id)
```
Same Phase-C for all 10 tables: `activity_logs` FK re-added `ON DELETE SET NULL`
(column stays nullable); `documents`/`faq_modules` re-add their `UNIQUE(bu_id,path)`/
`UNIQUE(bu_id,slug)`; faq chain re-adds its UNIQUE+FK; `faq_related` re-adds the
composite PK `(faq_id, related_faq_id)` + both FKs. Existing rows keep the v4 UUIDs
from Phase A (one-time scatter; PK index built once); future app rows are v7.

Properties: **atomic** (full rollback on any error), **guarded/idempotent** (skips
when already uuid), FK-dependency-ordered. `0002` (schema-per-BU→public copy) is
unaffected and unrelated to this conversion.

### Go code changes

Use `uuid.UUID` in models + signatures; generate `uuid.NewV7()` on insert.

- **`database/bu_resolve.go`** — `BUIDForSlug(slug) (uuid.UUID, error)`; `uuid.Nil` for unknown (callers check `== uuid.Nil`).
- **`chat_history_service.go`** — `GetBUIDFromSlug → (uuid.UUID, error)`; `FindSimilar`/`Save`/`SaveWithID`/`List` take `buID uuid.UUID`; `SaveWithID` generates `uuid.NewV7()`, inserts it, returns `uuid.UUID`; `UpdateFeedback(buID, messageID uuid.UUID, …)`; `ListEntry.ID → uuid.UUID`.
- **Models** — `chat_history.go` (`ID`, `BUID` → `uuid.UUID`), `activity_log.go` (`BusinessUnit.ID → uuid.UUID`, `ActivityLog.ID → uuid.UUID`, `ActivityLog.BUID → *uuid.UUID`).
- **`indexing_service.go`** — `buID uuid.UUID`; generate `docID := uuid.Must(uuid.NewV7())`, include `id` in the documents INSERT, keep `ON CONFLICT (bu_id,path) DO UPDATE … RETURNING id` (returns the existing id on conflict, the new id on insert); each chunk INSERT includes a fresh `uuid.NewV7()` id; `DELETE … WHERE doc_id = $1`.
- **`retrieval_service.go`** — `fetchVector`/`fetchKeyword(buID uuid.UUID, …)`; `Retrieve` resolves to `uuid.UUID`, guards `uuid.Nil`. SQL text unchanged (parameterized).
- **`wiki_service.go`** (both searches), **`wiki_sync_service.go`** (`listIndexedDocumentPaths`), **`documents_handler.go`** (`documentRow.ID → uuid.UUID`), **`faq_service.go`** (faq ids → uuid in queries + DTOs).
- **`go.mod`** — promote `github.com/google/uuid` indirect → direct (`go mod tidy`).

### API/JSON contract change (frontend-facing — out of this scope, flagged)

These response/request id fields become **UUID strings**: chat response `log_id`/message
id, feedback request `messageId`, `/api/documents` item `id`, chat-history list `id`,
faq ids. Frontend must treat them as opaque strings (no numeric parsing).

## Rollout

**Breaking change** (column *types* change) — no clean dual-read, so a **coordinated
cutover with brief downtime** (matches the project's accepted tolerance):

1. Backup (`pg_dump` over the dev pgBouncer port works).
2. Run `0003` (int→uuid) on the DB.
3. Deploy the new uuid backend.
4. Verify; no `DB_SCHEMA` change needed (already `public`).

**Dev DB** is on public-INT now → back up, run `0003`, verify, run the new DB-gated suite.

## Verification

- Every `public.*` `id` and FK column is type `uuid`.
- Per-FK orphan checks = 0 (e.g. `document_chunks` with no matching `documents`/`business_units`; faq chain; `chat_history`/`activity_logs` bu).
- Row counts unchanged vs. pre-conversion for every table.
- One chat + `/api/wiki/search` + `/api/documents` per BU returns correct results.

## Testing (TDD)

- `BUIDForSlug` → real UUID for a known slug, `uuid.Nil` for unknown.
- **Isolation** test updated to seed UUID BUs; retrieval filtered by uuid `bu_id` never leaks across BUs.
- Indexing upsert: re-upsert by `(bu_id, path)` returns the **same** uuid; chunks carry uuid `bu_id`/`doc_id`.
- **Conversion-migration test**: seed an INT-id `public` schema with FK rows, run `0003`, assert all FKs remapped (0 orphans), ids are `uuid`, re-run is a no-op.
- provision/deprovision (uuid bu, cascade); feedback (uuid `messageID` round-trip).
- `go build` / `go vet` / `go test ./...`; local docker (`pgvector/pgvector:pg16`, host `:5433`) for the DB-gated suite + a `0003` scratch-DB test.

## Docs to update

- `CLAUDE.md` — ids are UUIDv7 (app-generated via `uuid.NewV7()`); `bu_id`/`doc_id` are UUID.
- `backend/migrations/README.md` — add `0003`; note `0001` is now UUID-native.
- `HANDOVER-ADD-NEW-BU.md` — id type note where relevant.

## Out of scope

- Frontend changes for id-as-string (separate; flagged above).
- A DB-side `uuidv7()` function (PG16 lacks native; seed/SQL inserts use `gen_random_uuid()` v4 fallback — acceptable for low-volume non-app rows).
- Dropping the legacy `carmen`/`blueledgers`/`training_center` schemas on dev (tracked separately from the consolidation rollout).
