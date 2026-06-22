# Consolidate per-BU schemas into `public` with `bu_id`

**Date:** 2026-06-22
**Status:** Approved design — ready for implementation plan
**Scope:** Backend (Go) + Postgres migrations. Frontend unaffected.

## Problem

Each Business Unit (BU) is currently a dedicated Postgres **schema** (`<slug>.documents`,
`<slug>.document_chunks`), created at provision time via `CREATE SCHEMA` +
`create_bu_tables(<slug>)`. Queries inject the schema name into raw SQL strings
(`fmt.Sprintf("... %s.documents ...", bu)`).

This creates four pain points the change targets:

1. **Migration/provisioning complexity** — every BU needs `CREATE SCHEMA` +
   `create_bu_tables()`; schema DDL drift must stay in sync across schemas.
2. **Cross-BU queries are hard** — analytics/reporting must `UNION` across schemas.
3. **Code smell / security** — schema name is interpolated into SQL strings
   (a SQL-injection surface a prior code review flagged); not parameterizable.
4. **Inconsistency** — `chat_history`, `activity_logs`, `faq_*` already live in
   `public` and key on `bu_id`; only documents/chunks differ.

## Goal

Move `<slug>.documents` / `<slug>.document_chunks` into single shared tables
`public.documents` / `public.document_chunks`, separating tenants by a `bu_id`
column (INT, FK → `public.business_units(id)`). Every table in the system then
follows the same `bu_id` pattern.

## Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Motivation | All four: simpler provisioning, easy cross-BU queries, cleaner code, system-wide consistency |
| Existing data | **Copy** old rows (incl. embeddings) via `INSERT...SELECT` — no re-index |
| Index strategy | **Single shared table + filter `bu_id`**, one shared ivfflat index (simplest; fine for KB-scale data) |
| Column names | `bu_id` (matches existing tables), `doc_id` (was `document_id`) |
| `bu_id` placement | On **both** `documents` and `document_chunks` (denormalized on chunks) |
| `path` uniqueness | `UNIQUE(bu_id, path)` (was `UNIQUE(path)` per schema) |
| slug regex (no-dash) | **Keep** — still a `contents/<slug>` folder name + routing key (relaxing is out of scope) |
| Rollout | Migration runs immediately before deploy (short downtime accepted) |

## Architecture

### New schema (fresh DB — replaces `0001_init_schema.sql` document/chunk section)

```sql
CREATE TABLE public.documents (
  id         BIGSERIAL PRIMARY KEY,
  bu_id      INT NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  path       TEXT NOT NULL,
  title      TEXT,
  source     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (bu_id, path)
);
CREATE INDEX idx_documents_bu ON public.documents(bu_id);

CREATE TABLE public.document_chunks (
  id          BIGSERIAL PRIMARY KEY,
  bu_id       INT NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  doc_id      BIGINT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content     TEXT,
  embedding   VECTOR(2000),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_chunks_bu ON public.document_chunks(bu_id);
CREATE INDEX idx_document_chunks_embedding
  ON public.document_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
CREATE INDEX document_chunks_content_fts_idx
  ON public.document_chunks USING gin (to_tsvector('simple', content));
```

Removed from `0001_init_schema.sql`: `CREATE SCHEMA carmen/blueledgers`, the
`create_bu_tables()` function, and its `SELECT create_bu_tables(...)` calls.

**Why `bu_id` on `document_chunks` too:** the vector filter
`WHERE dc.bu_id = $1` must sit on the same table as `embedding` so the planner can
combine it with the ivfflat ANN scan, rather than filtering through a join to
`documents`.

### Data migration (one-time) — `0002_migrate_per_bu_to_public.sql`

Old `<slug>.documents.id` is a per-schema `BIGSERIAL`, so ids **collide across
BUs**. The migration must remap each chunk's `doc_id` to the new global id. It uses
a temporary `legacy_id` column on `public.documents` to carry the old id through.

Runs **after** `0001` has created the new `public.documents`/`document_chunks`.

```sql
-- temp column to recover old per-schema doc ids
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS legacy_id BIGINT;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, slug FROM public.business_units LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = r.slug AND table_name = 'documents') THEN

      -- 1) copy documents, remembering the old id in legacy_id
      EXECUTE format(
        'INSERT INTO public.documents (bu_id, path, title, source, created_at, updated_at, legacy_id)
         SELECT %L, path, title, source, created_at, updated_at, id
         FROM %I.documents
         ON CONFLICT (bu_id, path) DO NOTHING', r.id, r.slug);

      -- 2) copy chunks, mapping old document_id -> new id via legacy_id of same BU
      EXECUTE format(
        'INSERT INTO public.document_chunks (bu_id, doc_id, chunk_index, content, embedding, created_at)
         SELECT %L, nd.id, oc.chunk_index, oc.content, oc.embedding, oc.created_at
         FROM %I.document_chunks oc
         JOIN public.documents nd ON nd.bu_id = %L AND nd.legacy_id = oc.document_id',
        r.id, r.slug, r.id);
    END IF;
  END LOOP;
END $$;

-- cleanup: drop temp column, drop old schemas, drop old function
ALTER TABLE public.documents DROP COLUMN IF EXISTS legacy_id;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT slug FROM public.business_units LOOP
    IF r.slug <> 'public'
       AND EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = r.slug) THEN
      EXECUTE format('DROP SCHEMA %I CASCADE', r.slug);
    END IF;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS create_bu_tables(TEXT);
```

Properties:
- **Idempotent / re-runnable** — every step guarded with `IF EXISTS` / `ON CONFLICT DO NOTHING`.
- **Safe on a fresh DB** — no old schemas → loop bodies skipped, no side effects.
- **Never drops `public`** — explicit `r.slug <> 'public'` guard.

### Go code changes

**Resolve slug → bu_id (centralized).** `bu_context.go` middleware resolves the slug
to `bu_id` once per request (indexed lookup on `business_units.slug`) and stores both:

```go
c.Locals("bu", bu)      // slug — still used for contents/<slug> paths + logging
c.Locals("bu_id", buID) // int  — used by all document/chunk queries
```

Add `GetBUID(c) int` alongside the existing `GetBU(c) string`. A small in-memory
`slug→id` cache (invalidated on provision/deprovision) keeps the lookup cheap;
a plain per-request query is an acceptable fallback.

**`retrieval_service.go`** — `Retrieve`/`fetchVector`/`fetchKeyword` take `buID int`,
fully parameterized (no `fmt.Sprintf` of schema names):

```sql
SELECT d.path, dc.content, (dc.embedding <-> $1) AS dist
FROM public.document_chunks dc
JOIN public.documents d ON dc.doc_id = d.id
WHERE dc.bu_id = $2
ORDER BY dc.embedding <-> $1
LIMIT $3
```

**`indexing_service.go`** — takes both `bu string` (to read `contents/<slug>`) and
`buID int` (to write DB):
- `INSERT INTO public.documents (bu_id, path, ...) VALUES ($1, ...) ON CONFLICT (bu_id, path) DO UPDATE ...`
- `DELETE FROM public.document_chunks WHERE doc_id = $1`
- `INSERT INTO public.document_chunks (bu_id, doc_id, chunk_index, content, embedding, ...) VALUES (...)`

**`bu_handler.go`**
- *Provision*: drop `CREATE SCHEMA` + `SELECT create_bu_tables(...)`; just upsert
  `public.business_units` (+ invalidate slug→id cache).
- *Deprovision*: drop `DROP SCHEMA ... CASCADE`; `DELETE FROM public.business_units
  WHERE slug = $1` cascades to documents/chunks via FK `ON DELETE CASCADE`. Keep the
  guard against deprovisioning the default BU.

**`database.go` (reset/truncate)**
- `reset index <bu>`: `DELETE FROM public.documents WHERE bu_id = $1` (chunks cascade).
- `reset index all`: `TRUNCATE public.documents, public.document_chunks RESTART IDENTITY CASCADE`.
- `TruncateAllBUIndexTables`: iterate slugs→ids and delete per BU (or truncate once).

**Not touched**
- `security.ValidateSchema(slug)` — still validates slug format (folder name + routing key).
- `chat_history` / `faq` / `activity` services — already key on `bu_id`.
- Frontend — still sends `?bu=<slug>`; resolution is backend-internal.

## Rollout

1. Apply `0001` (additive) + `0002` to the DB **before** deploying the new code.
   After this, `public.documents/document_chunks` hold all data and old schemas are dropped.
2. Deploy the new backend (queries `public`).
3. Because `0002` drops the old schemas, the **old code cannot serve queries between
   migration and deploy** — run migration immediately before deploy (short downtime
   acceptable for this scale). Zero-downtime (copy → deploy → drop later) is possible
   but adds dual-read complexity and is out of scope.

## Verification

- Row counts: `SELECT bu_id, count(*) FROM public.documents GROUP BY bu_id` vs. old
  per-schema counts.
- No orphan chunks: `SELECT count(*) FROM document_chunks dc
  LEFT JOIN documents d ON dc.doc_id = d.id WHERE d.id IS NULL` → must be 0.
- One chat question per BU returns chunks from the correct BU.

## Testing (TDD)

- **Isolation (highest priority):** retrieval filtered by `bu_id` never leaks BU A's
  data into BU B's results.
- Provision → index works; deprovision → data gone (cascade).
- Reset index per-BU deletes only that BU.
- Run DB-gated suite: `RUN_DB_TESTS=1 go test ./tests/... ./internal/services/...`.

## Docs to update

- `backend/migrations/README.md` — file order; drop `create_bu_tables`/schema-per-BU language.
- `CLAUDE.md` — Multi-BU model: "schema per BU" → "row per BU in `public` keyed by `bu_id`".
- `HANDOVER-ADD-NEW-BU.md` — provisioning no longer creates a schema.

## Out of scope

- Relaxing the slug regex to allow dashes.
- Table partitioning / partial indexes (revisit only if vector recall degrades at scale).
- Zero-downtime dual-read rollout.
```
