# Squash Migrations Into Single Schema File — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 14 `.sql` migration files in `backend/migrations/` with one idempotent, 2000-dim canonical schema file (`0001_init_schema.sql`) and point the migrate scripts + README at it.

**Architecture:** The single file creates the end-state multi-BU schema directly (extensions, `business_units` + seed, per-BU schemas via `create_bu_tables`, `chat_history`, `activity_logs`, FAQ) at `VECTOR(2000)`, with the ivfflat + GIN FTS indexes baked into `create_bu_tables`. Legacy `public.documents`/`document_chunks`, one-time data migrations, and destructive/legacy dimension files are dropped. No Go code changes.

**Tech Stack:** PostgreSQL 16 + pgvector (`pgvector/pgvector:pg16`), `psql`, bash + PowerShell migrate scripts.

## Global Constraints

- Embedding dimension = **2000** everywhere (`document_chunks.embedding`, `chat_history.question_embedding`, `create_bu_tables`).
- File must be **idempotent**: `CREATE … IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `INSERT … ON CONFLICT DO NOTHING`, `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`.
- Must run via **`psql`** (contains PL/pgSQL `DO`/function blocks) — never the Go `;`-splitter.
- Do **not** create legacy `public.documents` / `public.document_chunks` (app uses per-BU `%s.documents`).
- Do **not** include one-time data ops (public→carmen copy, chat anonymize/backfill) or destructive/legacy files.
- Do **not** modify Go code or touch any existing/production database.
- Single canonical file name: `backend/migrations/0001_init_schema.sql`.

---

### Task 1: Create the canonical single-file schema

**Files:**
- Create: `backend/migrations/0001_init_schema.sql`

**Interfaces:**
- Produces: a `psql`-runnable schema creating `public.business_units`, schemas `carmen`/`blueledgers`, function `create_bu_tables(schema_name TEXT) RETURNS VOID`, `public.chat_history`, `public.activity_logs`, FAQ tables; functions `public.chat_history_set_expires_at()` + trigger `trg_chat_history_expires_at`, `public.purge_expired_chat_history() RETURNS integer`.

- [ ] **Step 1: Write the full schema file**

Create `backend/migrations/0001_init_schema.sql` with exactly this content:

```sql
-- 0001_init_schema.sql
-- Canonical single-file schema for the Carmen multi-BU knowledge base (pgvector).
-- Embedding dimension: 2000 (matches production VECTOR_DIMENSION in render.yaml).
-- Idempotent — safe to re-run. Apply with psql (contains PL/pgSQL blocks):
--   psql -U <user> -d <db> -v ON_ERROR_STOP=1 -f backend/migrations/0001_init_schema.sql
-- Supersedes the former 0001–0012 migration chain. New BUs are provisioned at
-- runtime via create_bu_tables(<slug>), which inherits the 2000-dim columns + indexes.

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Business units (tenant registry) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_units (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.business_units (name, slug, description)
VALUES ('Carmen Cloud', 'carmen', 'System for Carmen Cloud documents and Wiki'),
       ('Blueledgers', 'blueledgers', 'Wiki / KB documents for Blueledgers')
ON CONFLICT (slug) DO NOTHING;

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

-- ── Chat history (similarity cache + privacy retention + metrics) ────────────
CREATE TABLE IF NOT EXISTS public.chat_history (
    id                 BIGSERIAL PRIMARY KEY,
    bu_id              INT NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
    user_id            TEXT,
    question           TEXT NOT NULL,
    answer             TEXT NOT NULL,
    sources            JSONB,
    question_embedding VECTOR(2000),
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    expires_at         TIMESTAMPTZ,
    metrics            JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_chat_history_bu_id      ON public.chat_history(bu_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id    ON public.chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON public.chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_history_expires_at ON public.chat_history(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_history_embedding
    ON public.chat_history USING ivfflat (question_embedding vector_l2_ops) WITH (lists = 100);

CREATE OR REPLACE FUNCTION public.chat_history_set_expires_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.expires_at IS NULL THEN
      NEW.expires_at := NEW.created_at + interval '90 days';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      NEW.expires_at := NEW.created_at + interval '90 days';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_history_expires_at ON public.chat_history;
CREATE TRIGGER trg_chat_history_expires_at
  BEFORE INSERT OR UPDATE ON public.chat_history
  FOR EACH ROW
  EXECUTE PROCEDURE public.chat_history_set_expires_at();

CREATE OR REPLACE FUNCTION public.purge_expired_chat_history()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.chat_history WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ── Activity logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id         BIGSERIAL PRIMARY KEY,
    bu_id      INT REFERENCES public.business_units(id) ON DELETE SET NULL,
    user_id    TEXT,
    action     TEXT NOT NULL,
    category   TEXT NOT NULL,
    details    JSONB,
    timestamp  TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_bu_id     ON public.activity_logs(bu_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category  ON public.activity_logs(category);

-- ── FAQ (BU-aware hierarchy) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.faq_modules (
    id         SERIAL PRIMARY KEY,
    bu_id      INT NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL,
    icon       TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (bu_id, slug)
);

CREATE TABLE IF NOT EXISTS public.faq_submodules (
    id          SERIAL PRIMARY KEY,
    module_id   INT NOT NULL REFERENCES public.faq_modules(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL,
    description TEXT,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (module_id, slug)
);

CREATE TABLE IF NOT EXISTS public.faq_categories (
    id           SERIAL PRIMARY KEY,
    submodule_id INT NOT NULL REFERENCES public.faq_submodules(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    slug         TEXT NOT NULL,
    sort_order   INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (submodule_id, slug)
);

CREATE TABLE IF NOT EXISTS public.faq_entries (
    id            BIGSERIAL PRIMARY KEY,
    category_id   INT NOT NULL REFERENCES public.faq_categories(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    sample_case   TEXT,
    problem_cause TEXT,
    solution      TEXT,
    tags          TEXT[] DEFAULT '{}',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_by    TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.faq_related (
    faq_id         BIGINT NOT NULL REFERENCES public.faq_entries(id) ON DELETE CASCADE,
    related_faq_id BIGINT NOT NULL REFERENCES public.faq_entries(id) ON DELETE CASCADE,
    PRIMARY KEY (faq_id, related_faq_id)
);
```

- [ ] **Step 2: Apply on a fresh Postgres+pgvector and verify (live)**

```bash
docker run -d --rm --name kbpg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=carmen_db -p 55432:5432 pgvector/pgvector:pg16
sleep 5
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55432 -U postgres -d carmen_db -v ON_ERROR_STOP=1 -f backend/migrations/0001_init_schema.sql
```
Expected: completes with `CREATE EXTENSION`/`CREATE TABLE`/`CREATE FUNCTION`/`SELECT`/`CREATE INDEX`/`CREATE TRIGGER` lines and **no ERROR**.

> If Docker is unavailable in the execution environment: run the same `psql -f` against any reachable Postgres 16 + pgvector instance, or defer this live run to CI / a docker-capable machine and record that it was deferred. Do NOT mark the task done on a deferred run without stating so in the report.

- [ ] **Step 3: Assert objects + dimensions = 2000**

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55432 -U postgres -d carmen_db -v ON_ERROR_STOP=1 -c "
SELECT count(*) AS bu_rows FROM public.business_units;
SELECT format_type(atttypmod, atttypid) FROM pg_attribute
  WHERE attrelid = 'carmen.document_chunks'::regclass AND attname = 'embedding';
SELECT format_type(atttypmod, atttypid) FROM pg_attribute
  WHERE attrelid = 'blueledgers.document_chunks'::regclass AND attname = 'embedding';
SELECT format_type(atttypmod, atttypid) FROM pg_attribute
  WHERE attrelid = 'public.chat_history'::regclass AND attname = 'question_embedding';
SELECT indexname FROM pg_indexes WHERE schemaname IN ('carmen','blueledgers')
  AND tablename = 'document_chunks' ORDER BY 1;
"
```
Expected: `bu_rows = 2`; the three `format_type` rows print `vector(2000)`; index list includes `idx_document_chunks_embedding` and `document_chunks_content_fts_idx` for both schemas.

- [ ] **Step 4: Verify idempotency + runtime BU provisioning**

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55432 -U postgres -d carmen_db -v ON_ERROR_STOP=1 -f backend/migrations/0001_init_schema.sql
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55432 -U postgres -d carmen_db -v ON_ERROR_STOP=1 -c "
SELECT create_bu_tables('test_bu');
SELECT format_type(atttypmod, atttypid) FROM pg_attribute
  WHERE attrelid = 'test_bu.document_chunks'::regclass AND attname = 'embedding';
"
docker stop kbpg
```
Expected: second apply succeeds with **no ERROR** (idempotent); `create_bu_tables('test_bu')` succeeds and `test_bu.document_chunks.embedding` is `vector(2000)`.

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/0001_init_schema.sql
git commit -m "feat(migrations): add single canonical 2000-dim schema file

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Switch over — delete old migrations, update scripts + README

**Files:**
- Delete: `backend/migrations/0001_init_documents.sql`, `0002_setup_multi_bu.sql`, `0003_create_activity_logs.sql`, `0004_chat_history.sql`, `0005_chat_history_privacy.sql`, `0005_vector_4096_qwen.sql`, `0005b_create_bu_tables_1536.sql`, `0006_vector_2000.sql`, `0007_create_faq.sql`, `0008_clear_faq_carmen.sql`, `0009_blueledgers_bu.sql`, `0010_inventory_to_blueledgers_clear_bu_indexes.sql`, `0011_fts_gin_index.sql`, `0012_chat_history_metrics.sql`
- Modify: `scripts/migrate-docker.sh`, `scripts/migrate-docker.ps1`, `backend/migrations/README.md`

**Interfaces:**
- Consumes: `backend/migrations/0001_init_schema.sql` from Task 1.

- [ ] **Step 1: Delete the 14 superseded `.sql` files**

```bash
cd backend/migrations
git rm 0001_init_documents.sql 0002_setup_multi_bu.sql 0003_create_activity_logs.sql \
       0004_chat_history.sql 0005_chat_history_privacy.sql 0005_vector_4096_qwen.sql \
       0005b_create_bu_tables_1536.sql 0006_vector_2000.sql 0007_create_faq.sql \
       0008_clear_faq_carmen.sql 0009_blueledgers_bu.sql \
       0010_inventory_to_blueledgers_clear_bu_indexes.sql 0011_fts_gin_index.sql \
       0012_chat_history_metrics.sql
cd ../..
ls backend/migrations/*.sql
```
Expected: only `backend/migrations/0001_init_schema.sql` remains.

- [ ] **Step 2: Point `scripts/migrate-docker.sh` at the single file**

In `scripts/migrate-docker.sh`, replace the block of 8 `migrate backend/migrations/00...` lines AND the trailing `echo` summary (everything from `migrate backend/migrations/0001_init_documents.sql` through the final `echo "BU-specific: ..."` line) with:

```bash
migrate backend/migrations/0001_init_schema.sql

echo ""
echo "Schema applied (single file, 2000-dim). New BUs are provisioned at runtime"
echo "via create_bu_tables(<slug>); see backend/migrations/README.md."
```

- [ ] **Step 3: Point `scripts/migrate-docker.ps1` at the single file**

In `scripts/migrate-docker.ps1`, replace the `$files = @( … )` array (lines defining the 6 file paths) with a single-element array, and replace the trailing summary `Write-Host` lines:

```powershell
$files = @(
    "backend/migrations/0001_init_schema.sql"
)
```
and replace the final summary block with:
```powershell
Write-Host ""
Write-Host "Schema applied (single file, 2000-dim). New BUs are provisioned at runtime via create_bu_tables(<slug>); see backend/migrations/README.md."
```
(Keep the `foreach` loop unchanged — it already iterates `$files`.)

- [ ] **Step 4: Rewrite the order section of `backend/migrations/README.md`**

In `backend/migrations/README.md`: change the manual single-file example (line ~24) from `0001_init_documents.sql` to `0001_init_schema.sql`. Then replace the entire section from the heading `## ลำดับมาตรฐาน …` down to (but not including) `## วิธีสำรอง: Go binary …` with:

```markdown
## Schema — ไฟล์เดียว (`0001_init_schema.sql`, embedding **2000**)

DB ใหม่รันไฟล์เดียวจบ (idempotent, รันซ้ำได้):

```bash
./scripts/migrate-docker.sh        # หรือ .\scripts\migrate-docker.ps1
# หรือรันตรง:
docker compose --env-file .env.docker exec -T db psql -U postgres -d carmen_db \
  -v ON_ERROR_STOP=1 < backend/migrations/0001_init_schema.sql
```

ไฟล์นี้สร้าง end-state ทั้งหมด: extension `vector`/`pgcrypto`, `public.business_units` (+ seed carmen/blueledgers), schema `carmen`/`blueledgers`, ฟังก์ชัน `create_bu_tables()` (สร้าง `documents`/`document_chunks` ที่ `VECTOR(2000)` + ivfflat + GIN FTS index), `public.chat_history` (+ trigger/`purge_expired_chat_history()`/`metrics`), `public.activity_logs`, และตาราง `faq_*`.

- **มิติ = 2000** ตรงกับ `VECTOR_DIMENSION` ใน `render.yaml` — ตั้ง `VECTOR_DIMENSION=2000` ให้ตรง
- BU ใหม่ provision ตอน runtime ด้วย `SELECT create_bu_tables('<slug>');` — ได้ตาราง + index ครบที่ 2000 อัตโนมัติ
- ไฟล์ migration เดิม (0001–0012) ถูกยุบรวมเป็นไฟล์นี้แล้ว; ใช้กับ **DB ใหม่** (DB เดิมที่ migrate แล้วไม่ต้องรันซ้ำ)
```

- [ ] **Step 5: Verify the switchover end-to-end + no dangling refs**

```bash
# no leftover references to the deleted files anywhere
grep -rn "0001_init_documents\|0002_setup_multi_bu\|0004_chat_history\|0005_chat_history_privacy\|0006_vector_2000\|0007_create_faq\|0011_fts_gin\|0012_chat_history_metrics" \
  scripts backend/migrations README.md docs 2>/dev/null | grep -v "docs/superpowers" || echo "no dangling refs"
# script now references only the single file
grep -c "0001_init_schema.sql" scripts/migrate-docker.sh scripts/migrate-docker.ps1
```
Expected: `no dangling refs`; each script references `0001_init_schema.sql` once.

```bash
# end-to-end: the bash script applies the single file on a fresh DB (docker)
cp docker-compose.env.example .env.docker 2>/dev/null || true
docker compose --env-file .env.docker up -d db && sleep 6
./scripts/migrate-docker.sh
```
Expected: prints `==> backend/migrations/0001_init_schema.sql` then the "Schema applied (single file, 2000-dim)" message, exit 0.
> If Docker is unavailable: skip the end-to-end docker run, keep the grep checks, and record the docker run as deferred in the report.

- [ ] **Step 6: Commit**

```bash
git add backend/migrations scripts/migrate-docker.sh scripts/migrate-docker.ps1 backend/migrations/README.md
git commit -m "chore(migrations): switch to single schema file; drop 14 old migrations

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review (เทียบกับ spec)

- **Spec coverage:** single file content (extensions/business_units/schemas/create_bu_tables+baked indexes/chat_history+trigger+purge+metrics/activity_logs/faq) → Task 1 Step 1 ✓ · dim=2000 → constraint + Task 1 Step 3 ✓ · idempotent → Task 1 Step 4 ✓ · omit legacy public.documents + data ops → not in file (verified by review) ✓ · delete 14 files → Task 2 Step 1 ✓ · update migrate-docker.sh/.ps1 → Task 2 Steps 2-3 ✓ · README rewrite → Task 2 Step 4 ✓ · verification (fresh DB, dims, idempotent, create_bu_tables, no dangling refs) → Task 1 Steps 2-4 + Task 2 Step 5 ✓
- **Placeholder scan:** full SQL + exact script/README edits provided; no TBD/TODO. Docker-unavailable fallback stated explicitly (not a placeholder — a documented branch). ✓
- **Consistency:** object/function/trigger names match spec verbatim (`create_bu_tables`, `chat_history_set_expires_at`, `trg_chat_history_expires_at`, `purge_expired_chat_history`, `idx_document_chunks_embedding`, `document_chunks_content_fts_idx`); dim `VECTOR(2000)` used consistently. ✓
