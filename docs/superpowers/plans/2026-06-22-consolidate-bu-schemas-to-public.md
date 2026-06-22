# Consolidate per-BU schemas into `public` with `bu_id` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `<slug>.documents` / `<slug>.document_chunks` into shared `public.documents` / `public.document_chunks` keyed by `bu_id`, so every table follows one tenant pattern and all SQL is parameterized.

**Architecture:** New canonical schema defines `public.documents` + `public.document_chunks` (`bu_id INT FK → business_units`, `doc_id` FK, `UNIQUE(bu_id, path)`, one shared ivfflat + GIN index). A one-time data migration (`0002`) copies existing rows (incl. embeddings), remapping `doc_id` via a temp `legacy_id` column, then drops the old schemas. Go services keep their existing `bu string` (slug) signatures but resolve `slug → bu_id` internally via one shared helper `database.BUIDForSlug`, and run fully parameterized queries against `public.*`. Provision/deprovision/reset drop all `CREATE SCHEMA`/`DROP SCHEMA`/schema-name interpolation.

**Tech Stack:** Go (Fiber, GORM raw SQL), PostgreSQL 16 + pgvector, psql migrations.

## Global Constraints

- Embedding dimension is **2000** (`VECTOR(2000)`), matching `VECTOR_DIMENSION` env. Do not change it.
- Migrations run with **psql**, never `./server migrate` (PL/pgSQL `DO $$` blocks). Order is documented in `backend/migrations/README.md`.
- All tenant tables key on `bu_id INT NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE` (matches existing `chat_history`/`activity_logs`/`faq_*`).
- Column names: `bu_id` (not `business_unit_id`), `doc_id` (not `document_id`).
- Slug validation regex stays `^[a-zA-Z_][a-zA-Z0-9_]*$` via `security.ValidateSchema` (slug is still a `contents/<slug>` folder name + routing key).
- No schema name may be interpolated into a SQL string. Every query is parameterized with `?` placeholders.
- DB-backed Go tests are gated by `RUN_DB_TESTS=1` and skip when the DB/LLM is unreachable (existing convention).
- Migration runs immediately before deploy (short downtime accepted; no dual-read).
- Reference files: `backend/migrations/0001_init_schema.sql`, `backend/internal/services/{retrieval_service,indexing_service}.go`, `backend/internal/api/bu_handler.go`, `backend/internal/database/database.go`, `backend/internal/middleware/bu_context.go`.

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `backend/migrations/0001_init_schema.sql` | Modify | Define `public.documents`/`document_chunks` (bu_id/doc_id); remove per-BU schemas + `create_bu_tables()` |
| `backend/migrations/0002_migrate_per_bu_to_public.sql` | Create | One-time copy of legacy schema rows → public, remap `doc_id`, drop old schemas |
| `backend/internal/database/bu_resolve.go` | Create | `BUIDForSlug(slug) (int, error)` shared resolver |
| `backend/internal/database/bu_resolve_test.go` | Create | DB-gated resolver test |
| `backend/internal/services/retrieval_service.go` | Modify | Parameterized vector+keyword queries against `public.*` filtered by `bu_id` |
| `backend/internal/services/retrieval_isolation_test.go` | Create | DB-gated cross-BU isolation test (key correctness guarantee) |
| `backend/internal/services/indexing_service.go` | Modify | Parameterized upsert/insert with `bu_id`/`doc_id`; `ON CONFLICT (bu_id, path)`; dim lookup → `public` |
| `backend/internal/api/bu_handler.go` | Modify | Provision/deprovision drop all schema DDL |
| `backend/internal/api/bu_handler_test.go` | Create | DB-gated provision/deprovision behavior test |
| `backend/internal/database/database.go` | Modify | `TruncateBUTables`/`TruncateAllBUIndexTables` → `DELETE … WHERE bu_id` / `TRUNCATE public.*` |
| `backend/migrations/README.md` | Modify | File order; drop `create_bu_tables`/schema-per-BU language |
| `CLAUDE.md` | Modify | Multi-BU model: schema-per-BU → row-per-BU in `public` keyed by `bu_id` |
| `HANDOVER-ADD-NEW-BU.md` | Modify | Provisioning no longer creates a schema |

**Sequencing:** Task 1 (schema) must land before any Go task's DB tests can pass. Tasks 3–7 each depend on the public tables existing. Task 2 (migration) is independent of the Go tasks but documented early because it shares the schema shape.

---

### Task 1: New canonical schema (`0001_init_schema.sql`)

**Files:**
- Modify: `backend/migrations/0001_init_schema.sql`

**Interfaces:**
- Produces: tables `public.documents(id, bu_id, path, title, source, created_at, updated_at)` with `UNIQUE(bu_id, path)`; `public.document_chunks(id, bu_id, doc_id, chunk_index, content, embedding VECTOR(2000), created_at)`; indexes `idx_documents_bu`, `idx_chunks_bu`, `idx_document_chunks_embedding` (ivfflat), `document_chunks_content_fts_idx` (GIN). No more `carmen`/`blueledgers` schemas, no `create_bu_tables()`.

- [ ] **Step 1: Replace the per-BU schema + `create_bu_tables` section**

In `backend/migrations/0001_init_schema.sql`, find the block that begins at the `-- ── Per-BU schemas` comment and ends at the line `SELECT create_bu_tables('blueledgers');`. It currently reads:

```sql
-- ── Per-BU schemas ───────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS carmen;
CREATE SCHEMA IF NOT EXISTS blueledgers;

-- ── create_bu_tables(schema): per-BU documents + chunks + indexes (2000-dim) ──
-- Embedding is VECTOR(2000). The ivfflat similarity index and the GIN FTS index
-- are created inside the function so BUs provisioned later get them automatically.
CREATE OR REPLACE FUNCTION create_bu_tables(schema_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.documents (
            id         BIGSERIAL PRIMARY KEY,
            path       TEXT NOT NULL UNIQUE,
            title      TEXT,
            source     TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS %I.document_chunks (
            id          BIGSERIAL PRIMARY KEY,
            document_id BIGINT NOT NULL REFERENCES %I.documents(id) ON DELETE CASCADE,
            chunk_index INT NOT NULL,
            content     TEXT,
            embedding   VECTOR(2000),
            created_at  TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
            ON %I.document_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

        CREATE INDEX IF NOT EXISTS document_chunks_content_fts_idx
            ON %I.document_chunks USING gin (to_tsvector(''simple'', content));
    ', schema_name, schema_name, schema_name, schema_name, schema_name);
END;
$$ LANGUAGE plpgsql;

SELECT create_bu_tables('carmen');
SELECT create_bu_tables('blueledgers');
```

Replace that **entire block** with:

```sql
-- ── Documents + chunks (shared public tables, keyed by bu_id) ────────────────
-- One row per document/chunk; tenants separated by bu_id (FK → business_units).
-- bu_id is denormalized onto document_chunks so the vector filter sits on the
-- same table as the embedding (works well with the ivfflat index).
CREATE TABLE IF NOT EXISTS public.documents (
    id         BIGSERIAL PRIMARY KEY,
    bu_id      INT NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
    path       TEXT NOT NULL,
    title      TEXT,
    source     TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (bu_id, path)
);
CREATE INDEX IF NOT EXISTS idx_documents_bu ON public.documents(bu_id);

CREATE TABLE IF NOT EXISTS public.document_chunks (
    id          BIGSERIAL PRIMARY KEY,
    bu_id       INT NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
    doc_id      BIGINT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content     TEXT,
    embedding   VECTOR(2000),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chunks_bu ON public.document_chunks(bu_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
    ON public.document_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS document_chunks_content_fts_idx
    ON public.document_chunks USING gin (to_tsvector('simple', content));
```

Leave the rest of the file (extensions, `business_units` + seed, `chat_history`, `activity_logs`, `faq_*`) unchanged. The header comment near the top that mentions `create_bu_tables(<slug>)` should be updated to: `-- New BUs are provisioned at runtime by inserting into public.business_units; documents/chunks are shared tables keyed by bu_id.`

- [ ] **Step 2: Apply to a scratch DB and verify the shape**

Run (creates a throwaway DB so dev data is untouched):

```bash
docker compose --env-file .env.docker exec -T db psql -U postgres -c 'DROP DATABASE IF EXISTS carmen_mig_test' -c 'CREATE DATABASE carmen_mig_test'
docker compose --env-file .env.docker exec -T db psql -U postgres -d carmen_mig_test -v ON_ERROR_STOP=1 < backend/migrations/0001_init_schema.sql
docker compose --env-file .env.docker exec -T db psql -U postgres -d carmen_mig_test -c '\d public.documents' -c '\d public.document_chunks'
```

Expected: command exits 0; `\d public.documents` shows columns `id, bu_id, path, title, source, created_at, updated_at` and a `UNIQUE (bu_id, path)` constraint; `\d public.document_chunks` shows `bu_id`, `doc_id`, `embedding | vector(2000)`, plus the ivfflat and gin indexes. No `carmen`/`blueledgers` schema is listed by `\dn`.

- [ ] **Step 3: Confirm idempotency (re-run is clean)**

Run the apply command from Step 2 a second time.
Expected: exits 0 with no errors (`CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` are no-ops).

- [ ] **Step 4: Drop the scratch DB**

```bash
docker compose --env-file .env.docker exec -T db psql -U postgres -c 'DROP DATABASE carmen_mig_test'
```

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/0001_init_schema.sql
git commit -m "feat(migrations): canonical schema uses public.documents/document_chunks keyed by bu_id"
```

---

### Task 2: One-time data migration (`0002_migrate_per_bu_to_public.sql`)

**Files:**
- Create: `backend/migrations/0002_migrate_per_bu_to_public.sql`

**Interfaces:**
- Consumes: `public.documents`/`public.document_chunks` from Task 1; legacy `<slug>.documents`/`<slug>.document_chunks` if present.
- Produces: populated `public.documents`/`document_chunks` with correct `bu_id` and remapped `doc_id`; legacy schemas + `create_bu_tables()` dropped.

- [ ] **Step 1: Create the migration file**

Create `backend/migrations/0002_migrate_per_bu_to_public.sql` with exactly:

```sql
-- 0002_migrate_per_bu_to_public.sql
-- One-time migration: copy legacy per-BU schema rows into the shared public
-- tables (keyed by bu_id), remapping each chunk's document_id to the new global
-- documents.id via a temporary legacy_id column, then drop the old schemas.
-- Idempotent and safe on a fresh DB (loop bodies are skipped when no legacy
-- schema exists). Apply with psql AFTER 0001_init_schema.sql.

-- Temp column to carry the old per-schema documents.id through the copy.
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS legacy_id BIGINT;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, slug FROM public.business_units LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = r.slug AND table_name = 'documents'
    ) THEN
      -- 1) copy documents, remembering the old id in legacy_id
      EXECUTE format(
        'INSERT INTO public.documents (bu_id, path, title, source, created_at, updated_at, legacy_id)
         SELECT %L, path, title, source, created_at, updated_at, id
         FROM %I.documents
         ON CONFLICT (bu_id, path) DO NOTHING', r.id, r.slug);

      -- 2) copy chunks, mapping old document_id -> new documents.id (same BU)
      EXECUTE format(
        'INSERT INTO public.document_chunks (bu_id, doc_id, chunk_index, content, embedding, created_at)
         SELECT %L, nd.id, oc.chunk_index, oc.content, oc.embedding, oc.created_at
         FROM %I.document_chunks oc
         JOIN public.documents nd ON nd.bu_id = %L AND nd.legacy_id = oc.document_id',
        r.id, r.slug, r.id);
    END IF;
  END LOOP;
END $$;

-- Cleanup: remove temp column.
ALTER TABLE public.documents DROP COLUMN IF EXISTS legacy_id;

-- Drop legacy per-BU schemas (never public).
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

-- Drop the now-unused provisioning function.
DROP FUNCTION IF EXISTS create_bu_tables(TEXT);
```

- [ ] **Step 2: Build a seeded scratch DB that mimics the OLD layout**

Run (creates legacy `carmen`/`blueledgers` schemas with sample rows so the copy logic has something to move):

```bash
docker compose --env-file .env.docker exec -T db psql -U postgres -c 'DROP DATABASE IF EXISTS carmen_mig_test' -c 'CREATE DATABASE carmen_mig_test'
docker compose --env-file .env.docker exec -T db psql -U postgres -d carmen_mig_test -v ON_ERROR_STOP=1 <<'SQL'
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE public.business_units (id SERIAL PRIMARY KEY, name TEXT UNIQUE, slug TEXT UNIQUE, description TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
INSERT INTO public.business_units (name, slug) VALUES ('Carmen','carmen'), ('Blue','blueledgers');
-- legacy schemas + tables (document_id, no bu_id), with COLLIDING ids across schemas
CREATE SCHEMA carmen; CREATE SCHEMA blueledgers;
CREATE TABLE carmen.documents (id BIGSERIAL PRIMARY KEY, path TEXT UNIQUE, title TEXT, source TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE carmen.document_chunks (id BIGSERIAL PRIMARY KEY, document_id BIGINT REFERENCES carmen.documents(id), chunk_index INT, content TEXT, embedding VECTOR(2000), created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE blueledgers.documents (LIKE carmen.documents INCLUDING ALL);
CREATE TABLE blueledgers.document_chunks (id BIGSERIAL PRIMARY KEY, document_id BIGINT REFERENCES blueledgers.documents(id), chunk_index INT, content TEXT, embedding VECTOR(2000), created_at TIMESTAMPTZ DEFAULT NOW());
INSERT INTO carmen.documents (id, path, title) VALUES (1,'a.md','A'),(2,'b.md','B');
INSERT INTO carmen.document_chunks (document_id, chunk_index, content) VALUES (1,0,'carmen-a-0'),(2,0,'carmen-b-0');
INSERT INTO blueledgers.documents (id, path, title) VALUES (1,'x.md','X');           -- id 1 collides with carmen
INSERT INTO blueledgers.document_chunks (document_id, chunk_index, content) VALUES (1,0,'blue-x-0');
SQL
```

Now create the NEW public tables on this scratch DB by applying just the documents/chunks DDL from Task 1 (the rest of 0001 already exists here):

```bash
docker compose --env-file .env.docker exec -T db psql -U postgres -d carmen_mig_test -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE public.documents (id BIGSERIAL PRIMARY KEY, bu_id INT NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE, path TEXT, title TEXT, source TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(bu_id,path));
CREATE TABLE public.document_chunks (id BIGSERIAL PRIMARY KEY, bu_id INT NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE, doc_id BIGINT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE, chunk_index INT, content TEXT, embedding VECTOR(2000), created_at TIMESTAMPTZ DEFAULT NOW());
SQL
```

- [ ] **Step 2b: Run the migration and verify the copy + remap**

```bash
docker compose --env-file .env.docker exec -T db psql -U postgres -d carmen_mig_test -v ON_ERROR_STOP=1 < backend/migrations/0002_migrate_per_bu_to_public.sql
docker compose --env-file .env.docker exec -T db psql -U postgres -d carmen_mig_test -c \
  "SELECT bu.slug, d.path, dc.content FROM public.document_chunks dc JOIN public.documents d ON dc.doc_id=d.id JOIN public.business_units bu ON bu.id=dc.bu_id ORDER BY bu.slug, d.path;"
```

Expected output rows (the remap must pair each chunk with the **correct** document despite the colliding legacy ids):

```
   slug      | path  |  content
-------------+-------+------------
 blueledgers | x.md  | blue-x-0
 carmen      | a.md  | carmen-a-0
 carmen      | b.md  | carmen-b-0
```

Also verify no orphans and that legacy schemas are gone:

```bash
docker compose --env-file .env.docker exec -T db psql -U postgres -d carmen_mig_test -c \
  "SELECT count(*) AS orphans FROM public.document_chunks dc LEFT JOIN public.documents d ON dc.doc_id=d.id WHERE d.id IS NULL;" -c '\dn'
```

Expected: `orphans = 0`; `\dn` lists `public` but not `carmen`/`blueledgers`.

- [ ] **Step 3: Verify idempotency (re-run is a no-op)**

```bash
docker compose --env-file .env.docker exec -T db psql -U postgres -d carmen_mig_test -v ON_ERROR_STOP=1 < backend/migrations/0002_migrate_per_bu_to_public.sql
docker compose --env-file .env.docker exec -T db psql -U postgres -d carmen_mig_test -c 'SELECT count(*) FROM public.document_chunks;'
```

Expected: exits 0; count stays `3` (no duplicate rows; legacy schemas already dropped so the copy loop is skipped).

- [ ] **Step 4: Drop the scratch DB**

```bash
docker compose --env-file .env.docker exec -T db psql -U postgres -c 'DROP DATABASE carmen_mig_test'
```

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/0002_migrate_per_bu_to_public.sql
git commit -m "feat(migrations): one-time copy of per-BU schema data into public keyed by bu_id"
```

---

### Task 3: Shared `slug → bu_id` resolver

**Files:**
- Create: `backend/internal/database/bu_resolve.go`
- Test: `backend/internal/database/bu_resolve_test.go`

**Interfaces:**
- Produces: `func BUIDForSlug(slug string) (int, error)` in package `database`. Returns the `business_units.id` for a slug; returns `(0, nil)` if the slug is unknown; returns an error only on a DB failure or invalid slug format.

- [ ] **Step 1: Write the failing test**

Create `backend/internal/database/bu_resolve_test.go`:

```go
package database

import (
	"os"
	"testing"

	"github.com/new-carmen/backend/internal/config"
)

func mustConnect(t *testing.T) {
	t.Helper()
	if os.Getenv("RUN_DB_TESTS") != "1" {
		t.Skip("set RUN_DB_TESTS=1 to run DB-backed tests")
	}
	if err := config.Load(); err != nil {
		t.Skipf("config load failed: %v", err)
	}
	if err := Connect(); err != nil {
		t.Skipf("DB unreachable: %v", err)
	}
}

func TestBUIDForSlug_KnownAndUnknown(t *testing.T) {
	mustConnect(t)

	id, err := BUIDForSlug("carmen")
	if err != nil {
		t.Fatalf("BUIDForSlug(carmen) error: %v", err)
	}
	if id <= 0 {
		t.Fatalf("expected positive id for carmen, got %d", id)
	}

	missing, err := BUIDForSlug("no_such_bu_xyz")
	if err != nil {
		t.Fatalf("unknown slug should not error, got: %v", err)
	}
	if missing != 0 {
		t.Fatalf("expected 0 for unknown slug, got %d", missing)
	}

	if _, err := BUIDForSlug("bad-slug!!"); err == nil {
		t.Fatalf("expected error for invalid slug format")
	}
}
```

Note: `database.Connect()` takes no arguments (verified at `internal/database/database.go:17`); it reads connection settings from the loaded config. This mirrors `dbAvailable` in `internal/services/retrieval_service_test.go`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && go test ./internal/database/ -run TestBUIDForSlug_KnownAndUnknown -v`
Expected: compile error / FAIL — `BUIDForSlug` undefined.

- [ ] **Step 3: Implement the resolver**

Create `backend/internal/database/bu_resolve.go`:

```go
package database

import (
	"fmt"

	"github.com/new-carmen/backend/internal/security"
)

// BUIDForSlug returns public.business_units.id for the given slug.
// Returns (0, nil) when the slug does not exist. Returns an error only on an
// invalid slug format or a database failure. Centralizes slug→id resolution so
// document/chunk queries can filter by a parameterized bu_id (no schema-name
// interpolation).
func BUIDForSlug(slug string) (int, error) {
	if !security.ValidateSchema(slug) {
		return 0, fmt.Errorf("invalid bu slug: %q", slug)
	}
	var id int
	if err := DB.Raw("SELECT id FROM public.business_units WHERE slug = ? LIMIT 1", slug).Scan(&id).Error; err != nil {
		return 0, err
	}
	return id, nil
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && RUN_DB_TESTS=1 go test ./internal/database/ -run TestBUIDForSlug_KnownAndUnknown -v`
Expected: PASS (or SKIP if no DB — in that case run against the docker DB: ensure `backend/.env` points at it).

- [ ] **Step 5: Commit**

```bash
git add backend/internal/database/bu_resolve.go backend/internal/database/bu_resolve_test.go
git commit -m "feat(db): add BUIDForSlug resolver for parameterized bu_id filtering"
```

---

### Task 4: Retrieval queries → `public.*` filtered by `bu_id` (with isolation test)

**Files:**
- Modify: `backend/internal/services/retrieval_service.go:60-120`
- Create: `backend/internal/services/retrieval_isolation_test.go`

**Interfaces:**
- Consumes: `database.BUIDForSlug` (Task 3).
- Produces: unchanged public signature `Retrieve(bu, question string, emb []float32) ([]RetrievedChunk, error)`. Private helpers change to `fetchVector(buID int, embStr string)` and `fetchKeyword(buID int, question string)`.

- [ ] **Step 1: Write the failing isolation test**

Create `backend/internal/services/retrieval_isolation_test.go`:

```go
package services

import (
	"os"
	"strings"
	"testing"

	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/utils"
)

// TestRetrieve_BUIsolation proves a query for BU A never returns BU B's rows,
// even when both chunks have an identical (distance-0) embedding. It seeds two
// throwaway BUs, asserts isolation, then deletes them (cascade clears rows).
func TestRetrieve_BUIsolation(t *testing.T) {
	if os.Getenv("RUN_DB_TESTS") != "1" {
		t.Skip("set RUN_DB_TESTS=1 to run DB-backed retrieval tests")
	}
	if err := config.Load(); err != nil {
		t.Skipf("config load failed: %v", err)
	}
	if err := database.Connect(); err != nil {
		t.Skipf("DB unreachable: %v", err)
	}

	const slugA, slugB = "iso_test_a", "iso_test_b"
	seedBU := func(slug string) int {
		database.DB.Exec(`INSERT INTO public.business_units (name, slug) VALUES (?, ?) ON CONFLICT (slug) DO NOTHING`, strings.ToUpper(slug), slug)
		id, err := database.BUIDForSlug(slug)
		if err != nil || id == 0 {
			t.Fatalf("seed bu %s: id=%d err=%v", slug, id, err)
		}
		return id
	}
	idA := seedBU(slugA)
	idB := seedBU(slugB)
	t.Cleanup(func() {
		database.DB.Exec(`DELETE FROM public.business_units WHERE slug IN (?, ?)`, slugA, slugB)
	})

	// Identical, normalized embedding for both BUs → distance 0 for both.
	dim := utils.CurrentEmbeddingDim()
	emb := make([]float32, dim)
	emb[0] = 1.0
	emb = utils.NormalizeEmbedding(emb)
	embStr := utils.Float32SliceToPgVector(emb)

	insert := func(buID int, path, content string) {
		var docID int64
		if err := database.DB.Raw(
			`INSERT INTO public.documents (bu_id, path, title, source, created_at, updated_at)
			 VALUES (?, ?, ?, 'test', now(), now()) RETURNING id`, buID, path, path).Scan(&docID).Error; err != nil {
			t.Fatalf("insert doc: %v", err)
		}
		if err := database.DB.Exec(
			`INSERT INTO public.document_chunks (bu_id, doc_id, chunk_index, content, embedding, created_at)
			 VALUES (?, ?, 0, ?, ?::vector, now())`, buID, docID, content, embStr).Error; err != nil {
			t.Fatalf("insert chunk: %v", err)
		}
	}
	insert(idA, "iso_a_doc.md", "isolationkeyword apple")
	insert(idB, "iso_b_doc.md", "isolationkeyword banana")

	rs := NewRetrievalService()
	chunks, err := rs.Retrieve(slugA, "isolationkeyword", emb)
	if err != nil {
		t.Fatalf("Retrieve: %v", err)
	}

	sawA := false
	for _, c := range chunks {
		if strings.Contains(c.Path, "iso_b_doc.md") {
			t.Fatalf("BU isolation breach: BU A query returned BU B path %q", c.Path)
		}
		if strings.Contains(c.Path, "iso_a_doc.md") {
			sawA = true
		}
	}
	if !sawA {
		t.Fatalf("expected BU A's own doc in results, got %d chunks", len(chunks))
	}
}
```

(`RetrievedChunk.Path` is defined in `internal/services/retrieval_rank.go:20`.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && RUN_DB_TESTS=1 go test ./internal/services/ -run TestRetrieve_BUIsolation -v`
Expected: FAIL — current `Retrieve` queries `<slug>.document_chunks`; `slugA` is not a schema, so the query errors (`schema "iso_test_a" does not exist`).

- [ ] **Step 3: Rewrite `Retrieve`, `fetchVector`, `fetchKeyword`**

In `backend/internal/services/retrieval_service.go`, replace the body of `Retrieve` and both helpers (lines ~60–120) with:

```go
func (s *RetrievalService) Retrieve(bu, question string, emb []float32) ([]RetrievedChunk, error) {
	buID, err := database.BUIDForSlug(bu)
	if err != nil {
		return nil, err
	}
	if buID == 0 {
		return nil, fmt.Errorf("unknown bu: %q", bu)
	}
	embStr := utils.Float32SliceToPgVector(utils.TruncateEmbedding(emb))
	vec, err := s.fetchVector(buID, embStr)
	if err != nil {
		return nil, err
	}
	var kw []ScoredRow
	if !utils.IsThai(question) {
		// Parity with Python: keyword search is best-effort. On failure, log and
		// fall back to vector-only rather than failing the whole retrieval.
		if rows, kErr := s.fetchKeyword(buID, question); kErr != nil {
			log.Printf("[retrieval] keyword search failed, using vector-only: %v", kErr)
		} else {
			kw = rows
		}
	}
	return FuseAndRank(vec, kw, s.tuning, question, s.rules), nil
}

// fetchVector performs a pgvector cosine-distance search over the BU's chunks.
//   - strict < on cosine distance (not <=)
//   - excludes index.md files
//   - LIMITs to fetch_k
func (s *RetrievalService) fetchVector(buID int, embStr string) ([]ScoredRow, error) {
	const query = `
SELECT d.path, d.title, dc.content, (dc.embedding <=> CAST(? AS vector)) AS dist
FROM public.document_chunks dc
JOIN public.documents d ON dc.doc_id = d.id
WHERE dc.bu_id = ?
  AND (dc.embedding <=> CAST(? AS vector)) < ?
  AND d.path NOT LIKE '%index.md'
ORDER BY dist
LIMIT ?
`
	var rows []ScoredRow
	if err := database.DB.Raw(query, embStr, buID, embStr, s.tuning.MaxDistance, s.tuning.FetchK).Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

// fetchKeyword performs a full-text search using PostgreSQL's simple dictionary.
//   - NO index.md exclusion (intentionally different from vector query)
//   - ts_rank_cd for ranking
//   - LIMITs to fetch_k
func (s *RetrievalService) fetchKeyword(buID int, question string) ([]ScoredRow, error) {
	const query = `
SELECT d.path, d.title, dc.content
FROM public.document_chunks dc
JOIN public.documents d ON dc.doc_id = d.id
WHERE dc.bu_id = ?
  AND to_tsvector('simple', dc.content) @@ plainto_tsquery('simple', ?)
ORDER BY ts_rank_cd(to_tsvector('simple', dc.content), plainto_tsquery('simple', ?)) DESC
LIMIT ?
`
	var rows []ScoredRow
	if err := database.DB.Raw(query, buID, question, question, s.tuning.FetchK).Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}
```

Then remove the now-unused `"fmt"` import only if no other use remains (it is still used by the new `fmt.Errorf`, so keep it). Confirm the file still imports `database`, `utils`, `log` (it already does).

- [ ] **Step 4: Run the isolation test to verify it passes**

Run: `cd backend && RUN_DB_TESTS=1 go test ./internal/services/ -run TestRetrieve_BUIsolation -v`
Expected: PASS.

- [ ] **Step 5: Build + vet**

Run: `cd backend && go build ./... && go vet ./internal/services/`
Expected: no errors (catches any leftover `bu`/`fmt.Sprintf` references).

- [ ] **Step 6: Commit**

```bash
git add backend/internal/services/retrieval_service.go backend/internal/services/retrieval_isolation_test.go
git commit -m "feat(retrieval): query public.document_chunks filtered by bu_id; add isolation test"
```

---

### Task 5: Indexing writes → `public.*` with `bu_id`/`doc_id`

**Files:**
- Modify: `backend/internal/services/indexing_service.go:85-193`

**Interfaces:**
- Consumes: `database.BUIDForSlug` (Task 3).
- Produces: unchanged public signatures `IndexAll(ctx, bu)`, `IndexPath(ctx, bu, path)`. `indexSingle` resolves `bu_id` internally and writes `public.documents`/`public.document_chunks`.

- [ ] **Step 1: Write the failing test**

Create `backend/internal/services/indexing_write_test.go`:

```go
package services

import (
	"os"
	"testing"

	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
)

// TestIndexing_WritesPublicTables verifies a manual upsert path writes bu_id and
// doc_id into the shared public tables and that ON CONFLICT (bu_id, path) updates
// rather than duplicates. It exercises the same SQL shape indexSingle uses.
func TestIndexing_WritesPublicTables(t *testing.T) {
	if os.Getenv("RUN_DB_TESTS") != "1" {
		t.Skip("set RUN_DB_TESTS=1 to run DB-backed tests")
	}
	if err := config.Load(); err != nil {
		t.Skipf("config load failed: %v", err)
	}
	if err := database.Connect(); err != nil {
		t.Skipf("DB unreachable: %v", err)
	}

	const slug = "idx_test_bu"
	database.DB.Exec(`INSERT INTO public.business_units (name, slug) VALUES ('IDX','idx_test_bu') ON CONFLICT (slug) DO NOTHING`)
	buID, err := database.BUIDForSlug(slug)
	if err != nil || buID == 0 {
		t.Fatalf("seed bu: id=%d err=%v", buID, err)
	}
	t.Cleanup(func() { database.DB.Exec(`DELETE FROM public.business_units WHERE slug = ?`, slug) })

	upsert := func(title string) int64 {
		var id int64
		err := database.DB.Raw(
			`INSERT INTO public.documents (bu_id, path, title, source, created_at, updated_at)
			 VALUES (?, ?, ?, 'wiki', now(), now())
			 ON CONFLICT (bu_id, path) DO UPDATE SET title = EXCLUDED.title, updated_at = now()
			 RETURNING id`, buID, "doc.md", title).Scan(&id).Error
		if err != nil {
			t.Fatalf("upsert: %v", err)
		}
		return id
	}
	id1 := upsert("first")
	id2 := upsert("second") // same (bu_id, path) → must update, not duplicate
	if id1 != id2 {
		t.Fatalf("ON CONFLICT (bu_id, path) did not update in place: %d vs %d", id1, id2)
	}

	var count int
	database.DB.Raw(`SELECT count(*) FROM public.documents WHERE bu_id = ? AND path = 'doc.md'`, buID).Scan(&count)
	if count != 1 {
		t.Fatalf("expected exactly 1 row, got %d", count)
	}
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && RUN_DB_TESTS=1 go test ./internal/services/ -run TestIndexing_WritesPublicTables -v`
Expected: FAIL — `public.documents` has no `ON CONFLICT (bu_id, path)` target *unless* Task 1's schema is applied to this DB. Before applying Task 1 it fails with "there is no unique or exclusion constraint matching the ON CONFLICT". (Apply Task 1's `0001` to the test DB first; then it fails only because indexing code is still schema-based — but this test exercises SQL directly, so once the schema is applied it should pass. Treat a failure here as "schema not yet applied to this DB" and apply `0001` + `0002`.)

- [ ] **Step 3: Rewrite `indexSingle` and the dimension lookup**

In `backend/internal/services/indexing_service.go`, replace `indexSingle` (lines ~85–136) with:

```go
func (s *IndexingService) indexSingle(bu, path string) error {
	buID, err := database.BUIDForSlug(bu)
	if err != nil {
		return fmt.Errorf("resolve bu id: %w", err)
	}
	if buID == 0 {
		return fmt.Errorf("unknown bu: %q", bu)
	}

	content, err := s.wiki.GetContent(bu, path)
	if err != nil {
		return fmt.Errorf("get content: %w", err)
	}

	targetDim, err := s.getVectorDim()
	if err != nil {
		return fmt.Errorf("detect vector dimension: %w", err)
	}

	var docID int64
	const sqlDoc = `INSERT INTO public.documents (bu_id, path, title, source, created_at, updated_at)
VALUES (?, ?, ?, 'wiki', now(), now())
ON CONFLICT (bu_id, path) DO UPDATE SET title = EXCLUDED.title, updated_at = now()
RETURNING id`
	if err := database.DB.Raw(sqlDoc, buID, content.Path, content.Title).Scan(&docID).Error; err != nil {
		return fmt.Errorf("upsert document: %w", err)
	}

	if err := database.DB.Exec(`DELETE FROM public.document_chunks WHERE doc_id = ?`, docID).Error; err != nil {
		return fmt.Errorf("delete old chunks: %w", err)
	}

	cfg := config.AppConfig.Git
	for i, chunkText := range chunkContent(content.Content, cfg.ChunkSize, cfg.ChunkOverlap) {
		if strings.TrimSpace(chunkText) == "" {
			continue
		}
		emb, err := embeddingWithTimeout(func() ([]float32, error) {
			return s.llm.Embedding(chunkText)
		}, embeddingTimeout())
		if err != nil {
			return fmt.Errorf("embedding chunk %d: %w", i, err)
		}
		if len(emb) == 0 {
			log.Printf("[indexing] skip %s chunk %d: empty embedding", path, i)
			continue
		}

		// 1. Truncate/pad to the target dimension. 2. Normalize for cosine distance.
		emb = utils.TruncateEmbeddingToDim(emb, targetDim)
		emb = utils.NormalizeEmbedding(emb)

		const sqlChunk = `INSERT INTO public.document_chunks (bu_id, doc_id, chunk_index, content, embedding, created_at)
VALUES (?, ?, ?, ?, ?::vector, now())`
		if err := database.DB.Exec(sqlChunk, buID, docID, i, chunkText, utils.Float32SliceToPgVector(emb)).Error; err != nil {
			return fmt.Errorf("insert chunk %d: %w", i, err)
		}
	}
	return nil
}
```

Then replace `getVectorDimForBU(bu string)` (lines ~168–193) with a BU-independent lookup against `public` (all BUs share one table now):

```go
func (s *IndexingService) getVectorDim() (int, error) {
	var typeStr string
	const sql = `
SELECT format_type(a.atttypid, a.atttypmod)
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'document_chunks'
  AND a.attname = 'embedding'
  AND a.attnum > 0
  AND NOT a.attisdropped
LIMIT 1
`
	if err := database.DB.Raw(sql).Scan(&typeStr).Error; err != nil {
		return 0, err
	}
	typeStr = strings.TrimSpace(strings.ToLower(typeStr))
	if strings.HasPrefix(typeStr, "vector(") && strings.HasSuffix(typeStr, ")") {
		raw := strings.TrimSuffix(strings.TrimPrefix(typeStr, "vector("), ")")
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			return n, nil
		}
	}
	return utils.CurrentEmbeddingDim(), nil
}
```

`IndexAll`/`IndexPath` keep validating the slug with `security.ValidateSchema(bu)` and keep their signatures — no caller changes.

- [ ] **Step 4: Run the test + build**

Run: `cd backend && RUN_DB_TESTS=1 go test ./internal/services/ -run TestIndexing_WritesPublicTables -v && go build ./...`
Expected: test PASS; build clean (catches the removed `getVectorDimForBU` reference).

- [ ] **Step 5: Commit**

```bash
git add backend/internal/services/indexing_service.go backend/internal/services/indexing_write_test.go
git commit -m "feat(indexing): write public.documents/document_chunks with bu_id/doc_id"
```

---

### Task 6: Provision/deprovision drop all schema DDL

**Files:**
- Modify: `backend/internal/api/bu_handler.go:42-141`
- Test: `backend/internal/api/bu_handler_test.go`

**Interfaces:**
- Consumes: nothing new (relies on FK `ON DELETE CASCADE` from Task 1).
- Produces: `Provision` inserts/updates `public.business_units` only; `Deprovision` deletes the BU row (documents/chunks cascade). No schema is created or dropped.

- [ ] **Step 1: Write the failing test**

Create `backend/internal/api/bu_handler_test.go`:

```go
package api

import (
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
)

func TestProvisionDeprovision_NoSchema(t *testing.T) {
	if os.Getenv("RUN_DB_TESTS") != "1" {
		t.Skip("set RUN_DB_TESTS=1 to run DB-backed tests")
	}
	if err := config.Load(); err != nil {
		t.Skipf("config load failed: %v", err)
	}
	if err := database.Connect(); err != nil {
		t.Skipf("DB unreachable: %v", err)
	}

	const slug = "prov_test_bu"
	t.Cleanup(func() { database.DB.Exec(`DELETE FROM public.business_units WHERE slug = ?`, slug) })

	app := fiber.New()
	h := NewBusinessUnitHandler()
	app.Post("/prov", h.Provision)
	app.Post("/deprov", h.Deprovision)

	// Provision
	resp, err := app.Test(httptest.NewRequest("POST", "/prov",
		strings.NewReader(`{"slug":"prov_test_bu","name":"Prov"}`)), -1)
	if err != nil {
		t.Fatalf("provision request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("provision status = %d, want 200", resp.StatusCode)
	}

	// BU row exists, and NO schema named after the slug was created.
	var buCount, schemaCount int
	database.DB.Raw(`SELECT count(*) FROM public.business_units WHERE slug = ?`, slug).Scan(&buCount)
	if buCount != 1 {
		t.Fatalf("expected 1 business_units row, got %d", buCount)
	}
	database.DB.Raw(`SELECT count(*) FROM information_schema.schemata WHERE schema_name = ?`, slug).Scan(&schemaCount)
	if schemaCount != 0 {
		t.Fatalf("provision must NOT create a schema, found %d", schemaCount)
	}

	// Seed one document, then deprovision and confirm cascade delete.
	var buID int
	database.DB.Raw(`SELECT id FROM public.business_units WHERE slug = ?`, slug).Scan(&buID)
	database.DB.Exec(`INSERT INTO public.documents (bu_id, path, title) VALUES (?, 'd.md', 'D')`, buID)

	resp2, err := app.Test(httptest.NewRequest("POST", "/deprov",
		strings.NewReader(`{"slug":"prov_test_bu"}`)), -1)
	if err != nil {
		t.Fatalf("deprovision request: %v", err)
	}
	defer resp2.Body.Close()
	if resp2.StatusCode != 200 {
		t.Fatalf("deprovision status = %d, want 200", resp2.StatusCode)
	}

	var afterBU, afterDocs int
	database.DB.Raw(`SELECT count(*) FROM public.business_units WHERE slug = ?`, slug).Scan(&afterBU)
	database.DB.Raw(`SELECT count(*) FROM public.documents WHERE bu_id = ?`, buID).Scan(&afterDocs)
	if afterBU != 0 {
		t.Fatalf("BU row should be deleted, got %d", afterBU)
	}
	if afterDocs != 0 {
		t.Fatalf("documents should cascade-delete, got %d", afterDocs)
	}
}
```

The `app.Test` request needs a JSON content-type. If the handler rejects the body, add `req.Header.Set("Content-Type", "application/json")` before `app.Test` (build the request into a variable first). Include that header to be safe.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && RUN_DB_TESTS=1 go test ./internal/api/ -run TestProvisionDeprovision_NoSchema -v`
Expected: FAIL — current `Provision` runs `CREATE SCHEMA`, so `schemaCount` is 1 (or the test errors because `create_bu_tables` no longer exists after Task 1/2).

- [ ] **Step 3: Simplify `Provision`**

In `backend/internal/api/bu_handler.go`, in `Provision`, delete the two `tx.Exec` blocks that run `createSchemaSQL` and `SELECT create_bu_tables(?)` (lines ~77–86). The transaction now contains only the `INSERT INTO public.business_units ... ON CONFLICT ...` upsert followed by `tx.Commit()`. Update the doc comment to `// Provision creates/updates a BU row. Documents/chunks are shared public tables keyed by bu_id — no schema is created.`

- [ ] **Step 4: Simplify `Deprovision`**

In `Deprovision`, delete the `dropSchemaSQL` block (lines ~126–130). The transaction now contains only `DELETE FROM public.business_units WHERE slug = ?` (documents/chunks cascade via FK) followed by `tx.Commit()`. Update the doc comment to `// Deprovision deletes a BU row; documents/chunks cascade-delete via FK.`

- [ ] **Step 5: Remove the now-unused `fmt` import**

`fmt` was only used by `createSchemaSQL`/`dropSchemaSQL` `fmt.Sprintf` calls. Remove `"fmt"` from the import block. Run `cd backend && go build ./internal/api/` to confirm there are no other `fmt` uses in the file (if the build complains `fmt` is still needed, keep it).

- [ ] **Step 6: Run the test + build**

Run: `cd backend && RUN_DB_TESTS=1 go test ./internal/api/ -run TestProvisionDeprovision_NoSchema -v && go build ./...`
Expected: test PASS; build clean.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/api/bu_handler.go backend/internal/api/bu_handler_test.go
git commit -m "feat(bu): provision/deprovision no longer create or drop schemas"
```

---

### Task 7: Reset/truncate use `bu_id` instead of schema names

**Files:**
- Modify: `backend/internal/database/database.go:139-163`
- Test: `backend/internal/database/truncate_test.go`

**Interfaces:**
- Consumes: public tables from Task 1.
- Produces: `TruncateBUTables(bu string) error` deletes only that BU's documents (chunks cascade); `TruncateAllBUIndexTables() error` truncates both shared tables.

- [ ] **Step 1: Write the failing test**

Create `backend/internal/database/truncate_test.go`:

```go
package database

import (
	"testing"
)

func TestTruncateBUTables_OnlyTargetBU(t *testing.T) {
	mustConnect(t) // defined in bu_resolve_test.go

	seed := func(slug string) int {
		DB.Exec(`INSERT INTO public.business_units (name, slug) VALUES (?, ?) ON CONFLICT (slug) DO NOTHING`, slug, slug)
		id, _ := BUIDForSlug(slug)
		DB.Exec(`INSERT INTO public.documents (bu_id, path, title) VALUES (?, 'p.md', 'P')`, id)
		return id
	}
	a := seed("trunc_a")
	b := seed("trunc_b")
	t.Cleanup(func() { DB.Exec(`DELETE FROM public.business_units WHERE slug IN ('trunc_a','trunc_b')`) })

	if err := TruncateBUTables("trunc_a"); err != nil {
		t.Fatalf("TruncateBUTables: %v", err)
	}

	var ca, cb int
	DB.Raw(`SELECT count(*) FROM public.documents WHERE bu_id = ?`, a).Scan(&ca)
	DB.Raw(`SELECT count(*) FROM public.documents WHERE bu_id = ?`, b).Scan(&cb)
	if ca != 0 {
		t.Fatalf("trunc_a documents should be 0, got %d", ca)
	}
	if cb != 1 {
		t.Fatalf("trunc_b documents must be untouched, got %d", cb)
	}
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && RUN_DB_TESTS=1 go test ./internal/database/ -run TestTruncateBUTables_OnlyTargetBU -v`
Expected: FAIL — current `TruncateBUTables` runs `TRUNCATE trunc_a.documents`, which errors because no `trunc_a` schema exists.

- [ ] **Step 3: Rewrite both functions**

In `backend/internal/database/database.go`, replace `TruncateBUTables` and `TruncateAllBUIndexTables` (lines ~139–163) with:

```go
// TruncateBUTables deletes one BU's documents (and chunks, via FK cascade).
func TruncateBUTables(bu string) error {
	if bu == "" {
		return fmt.Errorf("bu cannot be empty")
	}
	if !security.ValidateSchema(bu) {
		return fmt.Errorf("invalid bu: %q", bu)
	}
	return DB.Exec(
		`DELETE FROM public.documents WHERE bu_id = (SELECT id FROM public.business_units WHERE slug = ?)`,
		bu,
	).Error
}

// TruncateAllBUIndexTables clears the shared index tables for every BU.
func TruncateAllBUIndexTables() error {
	return DB.Exec(`TRUNCATE TABLE public.document_chunks, public.documents RESTART IDENTITY CASCADE`).Error
}
```

Confirm `strings` is still used elsewhere in `database.go` (it is, in `normalizeSearchPath`); if `go build` reports `strings` unused, remove it. `security` is still used by `normalizeSearchPath` and the new `TruncateBUTables`.

- [ ] **Step 4: Run the test + build + vet**

Run: `cd backend && RUN_DB_TESTS=1 go test ./internal/database/ -run TestTruncateBUTables_OnlyTargetBU -v && go build ./... && go vet ./...`
Expected: test PASS; build + vet clean.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/database/database.go backend/internal/database/truncate_test.go
git commit -m "feat(db): reset/truncate index tables by bu_id, drop schema-name interpolation"
```

---

### Task 8: Update documentation

**Files:**
- Modify: `backend/migrations/README.md`
- Modify: `CLAUDE.md`
- Modify: `HANDOVER-ADD-NEW-BU.md`

**Interfaces:** none (docs only).

- [ ] **Step 1: Update `backend/migrations/README.md`**

- Add `0002_migrate_per_bu_to_public.sql` to the run order, applied **after** `0001_init_schema.sql`, described as a one-time legacy→public copy that is safe (no-op) on fresh DBs.
- In the "Schema — ไฟล์เดียว" section, change the description of `0001` so it no longer says it creates `carmen`/`blueledgers` schemas or the `create_bu_tables()` function. New text: `0001 creates extensions, public.business_units (+seed), the shared public.documents/document_chunks (keyed by bu_id, VECTOR(2000) + ivfflat + GIN), public.chat_history, public.activity_logs, and faq_*.`
- Remove the bullet `BU ใหม่ provision ตอน runtime ด้วย SELECT create_bu_tables('<slug>')`; replace with `BU ใหม่ provision ตอน runtime โดย INSERT แถวใน public.business_units (เอกสาร/chunk เป็นตารางร่วมใน public แยกด้วย bu_id).`

- [ ] **Step 2: Update `CLAUDE.md`**

In the "Multi-BU model" section, replace the line `Each Business Unit is a Postgres **schema** registered in public.business_units. Routing is by ?bu=<slug>.` with: `Each Business Unit is a **row** in public.business_units (id = bu_id). All tenant tables (documents, document_chunks, chat_history, activity_logs, faq_*) live in the public schema and filter by bu_id. Routing is by ?bu=<slug> → resolved to bu_id via database.BUIDForSlug.`

Update the "Slug regex" note to drop "it's a schema name"; new reason: `(slug is the contents/<slug> folder name + routing key)`.

In the "Embedding dimension" paragraph, replace the sentence about `create_bu_tables()` with: `New BUs are rows in public.business_units; documents/chunks are shared public tables at the dimension defined in 0001_init_schema.sql.`

- [ ] **Step 3: Update `HANDOVER-ADD-NEW-BU.md`**

Find any step that says provisioning runs `CREATE SCHEMA` / `create_bu_tables` and replace it with: provisioning inserts a row into `public.business_units`; the shared `public.documents`/`public.document_chunks` are reused (no per-BU schema). Deprovisioning deletes the BU row and documents/chunks cascade-delete. (Search the file for `create_bu_tables`, `CREATE SCHEMA`, and `schema` and reconcile each mention.)

- [ ] **Step 4: Verify no stale references remain**

Run: `cd /Users/samutpra/GitHub/carmensoftware-organize/knowledge-base-carmen && grep -rn "create_bu_tables\|schema per BU\|schema-per-BU" --include="*.md" . | grep -v docs/superpowers/`
Expected: no hits outside the `docs/superpowers/` spec/plan history.

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/README.md CLAUDE.md HANDOVER-ADD-NEW-BU.md
git commit -m "docs: describe shared public tables keyed by bu_id (drop schema-per-BU)"
```

---

## Final verification (run after all tasks)

- [ ] **Full build + vet:** `cd backend && go build ./... && go vet ./...` → clean.
- [ ] **Non-DB tests:** `cd backend && go test ./...` → pass (DB-gated tests skip).
- [ ] **DB suite against a migrated dev DB** (apply `0001` then `0002` first): `cd backend && RUN_DB_TESTS=1 go test ./internal/services/... ./internal/database/... ./internal/api/...` → pass.
- [ ] **No schema-name interpolation left:** `cd backend && grep -rn "Sprintf.*%s\.\(documents\|document_chunks\)\|CREATE SCHEMA\|DROP SCHEMA\|create_bu_tables" --include="*.go" internal/ cmd/` → no hits.

---

## Notes / deviations from the spec

- **slug→bu_id resolution location:** the spec suggested resolving in middleware (`GetBUID`) with a cache. During planning we found both retrieval call sites pass through a `retrieve func(bu, …)` field plus several indexing callers, so changing signatures would ripple widely. Instead we keep all `bu string` signatures and resolve inside the services via the shared `database.BUIDForSlug` helper (one indexed lookup per operation). The spec explicitly allowed "a plain per-request query" as acceptable; this realizes the same goal (parameterized `bu_id`, zero schema-name interpolation) with a far smaller blast radius. No middleware/`GetBUID` change is needed.
- **`reset all`** (`database.ClearPublicTables`) already truncates every `public.*` table via a `DO $$` block, so it now also clears `documents`/`document_chunks` automatically — no change required there.
- **Vector operator** stays cosine `<=>` with the `MaxDistance` filter and `index.md` exclusion (parity with the prior implementation); only the table reference and `bu_id` filter changed.
