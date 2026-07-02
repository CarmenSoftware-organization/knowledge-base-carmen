# Migrate DB from dev.blueledgers.com to Supabase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Copy the Carmen KB Postgres+pgvector database from `dev.blueledgers.com` (PgBouncer-only) into Supabase and cut production over to Supabase, with zero risk to the source and an instant rollback.

**Architecture:** Build a small, committable migration toolkit under `scripts/supabase-migration/` (docker `pgvector/pgvector:pg16` one-off `psql`, same pattern as `scripts/migrate-docker.sh`). Apply the repo's canonical schema (`backend/migrations/0001_init_schema.sql`) to Supabase, then logically copy every table with `\copy` in FK-parent-first order (pooler-safe, source read-only). Verify parity, then repoint app config to Supabase.

**Tech Stack:** PostgreSQL 16 client (docker), pgvector, PgBouncer (source), Supabase Session Pooler (target runtime), Bash, `psql \copy` (CSV over STDIN/STDOUT).

**Spec:** `docs/superpowers/specs/2026-07-02-migrate-db-to-supabase-design.md`

## Global Constraints

- **Embedding dimension `VECTOR_DIMENSION=2000`** and **`LLM_EMBED_MODEL=qwen/qwen3-embedding-8b`** are UNCHANGED — embeddings are copied verbatim, never re-generated.
- **Source (`dev.blueledgers.com:6432`) is READ-ONLY for the entire migration.** No writes, no DDL, no `pg_dump` locks. This is what guarantees instant rollback.
- **Never commit secrets or data.** All credentials live in `scripts/supabase-migration/.env.migrate` (gitignored). Intermediate CSVs live in the session scratchpad (outside the repo). Only scripts, SQL, and docs get committed.
- **Apply SQL with `psql`, never the Go `./server migrate`** — `0001_init_schema.sql` contains `DO $$ … $$` PL/pgSQL blocks the Go splitter corrupts.
- **Schema is the repo's `backend/migrations/0001_init_schema.sql`** — do not dump schema from source.
- **FK-parent-first table order** for every full-table operation: `business_units → documents → document_chunks → chat_history → activity_logs → faq_modules → faq_submodules → faq_categories → faq_entries → faq_related`.
- **App runtime connects via Supabase Session Pooler (port 5432)**, not the Transaction Pooler (6543).
- **Deny-all RLS** on all `public` tables (Supabase auto REST API would otherwise expose them via the anon key).
- **Docker required** on the machine running the toolkit (image `pgvector/pgvector:pg16`).

---

## File structure

Committed (this plan builds these):

- `scripts/supabase-migration/.env.migrate.example` — connection template (no secrets)
- `scripts/supabase-migration/lib.sh` — shared: loads env, defines `psql_src`/`psql_dst`, `TABLES` array
- `scripts/supabase-migration/preflight.sh` — read-only checks (versions, connectivity, dim, row counts)
- `scripts/supabase-migration/01_enable_extensions.sql` — `vector` (public) + `pgcrypto`
- `scripts/supabase-migration/02_enable_rls.sql` — deny-all RLS on all tables
- `scripts/supabase-migration/apply-schema.sh` — extensions → `0001` → RLS → truncate seed
- `scripts/supabase-migration/copy-data.sh` — per-table dump+load in FK order
- `scripts/supabase-migration/verify.sh` — row-count + UUID + embedding parity
- `scripts/supabase-migration/README.md` — the operator runbook (cutover, repoint, rollback, password rotation)

Not committed (runtime only):

- `scripts/supabase-migration/.env.migrate` — real credentials (gitignored)
- `$MIGRATE_OUT/*.csv` — intermediate dumps (scratchpad)

Modified:

- `.gitignore` — ignore `scripts/supabase-migration/.env.migrate`

---

## Task 1: Migration toolkit scaffold + preflight (read-only)

Creates the toolkit skeleton and a read-only preflight. Nothing here writes to either database, so it is safe to run against production immediately.

**Files:**
- Create: `scripts/supabase-migration/.env.migrate.example`
- Create: `scripts/supabase-migration/lib.sh`
- Create: `scripts/supabase-migration/preflight.sh`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `lib.sh` exporting shell functions `psql_src()`, `psql_dst()` (both accept extra `psql` args via `"$@"`) and array `TABLES` (FK-parent-first). Consumed by every later script via `. "$HERE/lib.sh"`.

- [ ] **Step 1: Create the connection template**

Create `scripts/supabase-migration/.env.migrate.example`:

```bash
# Copy to .env.migrate (gitignored) and fill in. Never commit the filled copy.

# --- Source: dev.blueledgers.com via PgBouncer (READ-ONLY) ---
SRC_HOST=dev.blueledgers.com
SRC_PORT=6432
SRC_USER=developer
SRC_PASSWORD=CHANGME
SRC_DB=ai
SRC_SSLMODE=require

# --- Target: Supabase ---
# Try the DIRECT connection first (db.<ref>.supabase.co:5432, user=postgres).
# If it fails (direct is IPv6-only), use the Session Pooler from the Supabase
# dashboard: host aws-0-<region>.pooler.supabase.com, port 5432,
# user postgres.<project-ref>, db postgres.
DST_HOST=db.bqlgmrcvfdisufiiwzyv.supabase.co
DST_PORT=5432
DST_USER=postgres
DST_PASSWORD=CHANGME
DST_DB=postgres
DST_SSLMODE=require
```

- [ ] **Step 2: Ignore the real env file**

Add to `.gitignore` (below the existing `.env*.local` line):

```
# DB migration credentials — never commit
scripts/supabase-migration/.env.migrate
```

- [ ] **Step 3: Create the shared library**

Create `scripts/supabase-migration/lib.sh`:

```bash
#!/usr/bin/env bash
# Shared helpers for the Supabase migration. Source this: . "$HERE/lib.sh"
set -euo pipefail

LIB_HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${MIGRATE_ENV:-$LIB_HERE/.env.migrate}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy .env.migrate.example and fill in credentials." >&2
  exit 1
fi
set -a; . "$ENV_FILE"; set +a

IMAGE="pgvector/pgvector:pg16"

# psql against the SOURCE (through PgBouncer). Extra args pass through.
psql_src() {
  docker run --rm -i \
    -e PGPASSWORD="$SRC_PASSWORD" -e PGSSLMODE="${SRC_SSLMODE:-require}" \
    "$IMAGE" \
    psql -h "$SRC_HOST" -p "$SRC_PORT" -U "$SRC_USER" -d "$SRC_DB" \
    -v ON_ERROR_STOP=1 "$@"
}

# psql against the TARGET (Supabase). Extra args pass through.
psql_dst() {
  docker run --rm -i \
    -e PGPASSWORD="$DST_PASSWORD" -e PGSSLMODE="${DST_SSLMODE:-require}" \
    "$IMAGE" \
    psql -h "$DST_HOST" -p "$DST_PORT" -U "$DST_USER" -d "$DST_DB" \
    -v ON_ERROR_STOP=1 "$@"
}

# FK-parent-first order. Used for copy AND verify.
TABLES=(business_units documents document_chunks chat_history activity_logs \
        faq_modules faq_submodules faq_categories faq_entries faq_related)
```

- [ ] **Step 4: Create the preflight script**

Create `scripts/supabase-migration/preflight.sh`:

```bash
#!/usr/bin/env bash
# READ-ONLY preflight. Safe to run against production. Writes nothing.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib.sh"

echo "== Source version (through PgBouncer) =="
psql_src -c "select version();"

echo "== Target version (Supabase) =="
echo "   (if this fails, direct 5432 is IPv6-only — switch DST_* to the Session Pooler)"
psql_dst -c "select version();"

echo "== Source embedding dim (expect 2000) =="
psql_src -tAc "select vector_dims(embedding) from public.document_chunks where embedding is not null limit 1;"

echo "== Source row counts (baseline for verification) =="
for t in "${TABLES[@]}"; do
  n=$(psql_src -tAc "select count(*) from public.$t;")
  printf "   %-18s %s\n" "$t" "$n"
done

echo "== (optional) pg_dump-through-pooler probe =="
echo "   run manually if you want to try Approach B fast-path:"
echo "   docker run --rm -e PGPASSWORD=\$SRC_PASSWORD -e PGSSLMODE=require $IMAGE \\"
echo "     pg_dump -h $SRC_HOST -p $SRC_PORT -U $SRC_USER -d $SRC_DB --schema-only >/dev/null && echo OK"
```

- [ ] **Step 5: Syntax-check the scripts**

Run:
```bash
bash -n scripts/supabase-migration/lib.sh scripts/supabase-migration/preflight.sh && echo "SYNTAX OK"
```
Expected: `SYNTAX OK`

- [ ] **Step 6: Run preflight against the real endpoints**

Prereq: `cp scripts/supabase-migration/.env.migrate.example scripts/supabase-migration/.env.migrate` and fill in both passwords (and switch `DST_*` to the Session Pooler if the target-version check fails).

Run:
```bash
bash scripts/supabase-migration/preflight.sh
```
Expected: both `version()` lines print; source dim prints `2000`; a row-count table prints for all 10 tables. **Record the source row counts** — they are the verification baseline. If the target check fails, edit `.env.migrate` to the Session Pooler and re-run.

- [ ] **Step 7: Commit (scripts only — never `.env.migrate`)**

```bash
git add scripts/supabase-migration/.env.migrate.example \
        scripts/supabase-migration/lib.sh \
        scripts/supabase-migration/preflight.sh \
        .gitignore
git status   # confirm .env.migrate is NOT staged
git commit -m "feat(migration): add Supabase migration toolkit scaffold + preflight"
```

---

## Task 2: Schema setup on Supabase (live: creates schema on target)

Applies extensions, the canonical schema, deny-all RLS, and clears the seeded
`business_units` so the copy can carry the source UUIDs. This is the first task
that **writes to the target**. It does not touch the source.

**Files:**
- Create: `scripts/supabase-migration/01_enable_extensions.sql`
- Create: `scripts/supabase-migration/02_enable_rls.sql`
- Create: `scripts/supabase-migration/apply-schema.sh`

**Interfaces:**
- Consumes: `lib.sh` (`psql_dst`, `TABLES`); `backend/migrations/0001_init_schema.sql`.
- Produces: a fully-created empty schema on Supabase with RLS enabled and an empty `public.business_units`.

- [ ] **Step 1: Create the extensions SQL**

Create `scripts/supabase-migration/01_enable_extensions.sql`:

```sql
-- vector must live where the app's search_path (public) can resolve its
-- operators/casts; this matches the source. pgcrypto only backstops the
-- gen_random_uuid() column default (core PG13+ also provides it).
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector   WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
```

- [ ] **Step 2: Create the RLS SQL**

Create `scripts/supabase-migration/02_enable_rls.sql`:

```sql
-- Deny-all: enable RLS with NO policies. The Go backend connects as the
-- Supabase 'postgres' role, which bypasses RLS, so the app is unaffected;
-- the anon/authenticated roles (Supabase auto REST API) get nothing.
ALTER TABLE public.business_units  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_modules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_submodules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_related     ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 3: Create the apply-schema script**

Create `scripts/supabase-migration/apply-schema.sh`:

```bash
#!/usr/bin/env bash
# LIVE: creates schema on the TARGET (Supabase). Does not touch the source.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib.sh"
ROOT="$(cd "$HERE/../.." && pwd)"

echo "== 1/4 enable extensions =="
psql_dst < "$HERE/01_enable_extensions.sql"

echo "== 2/4 apply canonical schema (backend/migrations/0001_init_schema.sql) =="
psql_dst < "$ROOT/backend/migrations/0001_init_schema.sql"

echo "== 3/4 enable deny-all RLS =="
psql_dst < "$HERE/02_enable_rls.sql"

echo "== 4/4 clear seeded business_units (copy will carry source UUIDs) =="
psql_dst -c "TRUNCATE public.business_units CASCADE;"

echo "Schema ready on target."
```

- [ ] **Step 4: Syntax-check**

Run:
```bash
bash -n scripts/supabase-migration/apply-schema.sh && echo "SYNTAX OK"
```
Expected: `SYNTAX OK`

- [ ] **Step 5: Apply the schema to Supabase**

Run:
```bash
bash scripts/supabase-migration/apply-schema.sh
```
Expected: four `==` sections print with no error; ends with `Schema ready on target.`

- [ ] **Step 6: Verify the schema landed**

Run:
```bash
# tables present (expect 10)
docker run --rm -i -e PGPASSWORD="$DST_PASSWORD" -e PGSSLMODE=require pgvector/pgvector:pg16 \
  psql -h "$DST_HOST" -p "$DST_PORT" -U "$DST_USER" -d "$DST_DB" -tAc \
  "select count(*) from information_schema.tables where table_schema='public';"
```

Or more simply, source the env and use the helper via a one-liner:
```bash
( . scripts/supabase-migration/lib.sh
  echo "RLS-enabled tables (expect 10):"
  psql_dst -tAc "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relrowsecurity;"
  echo "business_units rows (expect 0):"
  psql_dst -tAc "select count(*) from public.business_units;" )
```
Expected: RLS-enabled count `10`; `business_units` count `0`.

- [ ] **Step 7: Commit**

```bash
git add scripts/supabase-migration/01_enable_extensions.sql \
        scripts/supabase-migration/02_enable_rls.sql \
        scripts/supabase-migration/apply-schema.sh
git commit -m "feat(migration): schema setup for Supabase (extensions, RLS, seed truncate)"
```

---

## Task 3: Data copy (live: loads data into target)

Dumps each source table to a scratchpad CSV and loads it into Supabase in
FK-parent-first order, carrying original ids so UUIDs are preserved. Column
lists are generated from the source catalog so both sides use the same columns
in the same order.

**Files:**
- Create: `scripts/supabase-migration/copy-data.sh`

**Interfaces:**
- Consumes: `lib.sh` (`psql_src`, `psql_dst`, `TABLES`); requires env var `MIGRATE_OUT` (scratchpad dir for CSVs).
- Produces: fully-populated target tables; `$MIGRATE_OUT/<table>.csv` dump artifacts.

- [ ] **Step 1: Create the copy script**

Create `scripts/supabase-migration/copy-data.sh`:

```bash
#!/usr/bin/env bash
# LIVE: reads source (READ-ONLY), loads target. Run apply-schema.sh first.
# Set MIGRATE_OUT to a scratch dir OUTSIDE the repo (holds intermediate CSVs).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib.sh"

OUT="${MIGRATE_OUT:?set MIGRATE_OUT to a scratch dir (e.g. the session scratchpad)}"
mkdir -p "$OUT"

for t in "${TABLES[@]}"; do
  cols=$(psql_src -tAc \
    "select string_agg(quote_ident(column_name), ',' order by ordinal_position) \
     from information_schema.columns \
     where table_schema='public' and table_name='$t';")

  echo "== dump $t =="
  echo "   cols: $cols"
  psql_src -c "\copy (SELECT $cols FROM public.$t) TO STDOUT WITH (FORMAT csv)" > "$OUT/$t.csv"
  rows=$(wc -l < "$OUT/$t.csv" | tr -d ' ')
  echo "   dumped rows: $rows"

  echo "== load $t =="
  psql_dst -c "\copy public.$t ($cols) FROM STDIN WITH (FORMAT csv)" < "$OUT/$t.csv"
  echo "   loaded."
done

echo "Copy complete. CSVs in: $OUT"
```

- [ ] **Step 2: Syntax-check**

Run:
```bash
bash -n scripts/supabase-migration/copy-data.sh && echo "SYNTAX OK"
```
Expected: `SYNTAX OK`

- [ ] **Step 3: Run the copy**

Run (point `MIGRATE_OUT` at the session scratchpad, outside the repo):
```bash
export MIGRATE_OUT=/private/tmp/claude-501/-Users-samutpra-GitHub-carmensoftware-organize-knowledge-base-carmen/4b4c5313-dbaf-4d04-9192-00634369dff0/scratchpad/supabase-migration
bash scripts/supabase-migration/copy-data.sh
```
Expected: for each of the 10 tables, a `dump`/`load` pair prints with a `dumped rows:` count; ends with `Copy complete.` The per-table dumped counts should match the preflight baseline from Task 1 Step 6.

- [ ] **Step 4: Commit (script only — the CSVs are outside the repo)**

```bash
git add scripts/supabase-migration/copy-data.sh
git commit -m "feat(migration): per-table \\copy data loader (FK order, UUID-preserving)"
```

---

## Task 4: Verification (read-only both sides)

Confirms parity: row counts, the critical `business_units` UUID match, and
embedding sanity. Read-only on both databases.

**Files:**
- Create: `scripts/supabase-migration/verify.sh`

**Interfaces:**
- Consumes: `lib.sh` (`psql_src`, `psql_dst`, `TABLES`); `MIGRATE_OUT` (for temp diff files).
- Produces: a pass/fail exit code (`0` = all parity checks pass).

- [ ] **Step 1: Create the verify script**

Create `scripts/supabase-migration/verify.sh`:

```bash
#!/usr/bin/env bash
# READ-ONLY parity check. Exit 0 = all good.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib.sh"
OUT="${MIGRATE_OUT:-/tmp}"; mkdir -p "$OUT"
fail=0

echo "== Row-count parity (src vs dst) =="
for t in "${TABLES[@]}"; do
  s=$(psql_src -tAc "select count(*) from public.$t;")
  d=$(psql_dst -tAc "select count(*) from public.$t;")
  mark="OK"; if [[ "$s" != "$d" ]]; then mark="MISMATCH"; fail=1; fi
  printf "   %-18s src=%-8s dst=%-8s %s\n" "$t" "$s" "$d" "$mark"
done

echo "== business_units id+slug parity (CRITICAL) =="
psql_src -tAc "select id||'|'||slug from public.business_units order by slug;" > "$OUT/bu_src.txt"
psql_dst -tAc "select id||'|'||slug from public.business_units order by slug;" > "$OUT/bu_dst.txt"
if diff -q "$OUT/bu_src.txt" "$OUT/bu_dst.txt" >/dev/null; then
  echo "   business_units UUIDs match"
else
  echo "   business_units MISMATCH:"; diff "$OUT/bu_src.txt" "$OUT/bu_dst.txt" || true; fail=1
fi

echo "== embedding sanity on target =="
echo "   dims histogram (expect all 2000):"
psql_dst -c "select vector_dims(embedding) as dims, count(*) from public.document_chunks where embedding is not null group by 1;"
echo "   null embeddings src vs dst:"
sn=$(psql_src -tAc "select count(*) from public.document_chunks where embedding is null;")
dn=$(psql_dst -tAc "select count(*) from public.document_chunks where embedding is null;")
printf "   null: src=%s dst=%s %s\n" "$sn" "$dn" "$([[ "$sn" == "$dn" ]] && echo OK || { echo MISMATCH; })"
[[ "$sn" == "$dn" ]] || fail=1

if [[ "$fail" -eq 0 ]]; then echo "ALL PARITY CHECKS PASSED"; else echo "PARITY FAILURES — do not cut over"; fi
exit $fail
```

- [ ] **Step 2: Syntax-check**

Run:
```bash
bash -n scripts/supabase-migration/verify.sh && echo "SYNTAX OK"
```
Expected: `SYNTAX OK`

- [ ] **Step 3: Run verification**

Run:
```bash
bash scripts/supabase-migration/verify.sh
```
Expected: every table row `OK`; `business_units UUIDs match`; dims histogram shows only `2000`; null counts match; final line `ALL PARITY CHECKS PASSED`; exit code `0`.

- [ ] **Step 4: Commit**

```bash
git add scripts/supabase-migration/verify.sh
git commit -m "feat(migration): parity verification (counts, BU UUIDs, embedding dims)"
```

---

## Task 5: Cutover runbook + production cutover

Documents and performs the cutover: maintenance window, repoint app config to
Supabase, smoke test, rollback path, and password rotation. Config repoint
touches secrets and external services (Render, dashboards) — it is **not**
committed; only the runbook doc is.

**Files:**
- Create: `scripts/supabase-migration/README.md`
- Modify (NOT committed): `backend/.env`, `backend/.env.docker`, `backend/.env.local` (local dev), Render `carmen-backend` env (dashboard)

**Interfaces:**
- Consumes: a passing Task 4 verification.
- Produces: production traffic served from Supabase; dev DB retained as rollback.

- [ ] **Step 1: Write the runbook**

Create `scripts/supabase-migration/README.md`:

````markdown
# Supabase migration runbook

Migrates the Carmen KB DB from `dev.blueledgers.com` (PgBouncer-only) to
Supabase as the new production DB. Source is **read-only** the whole time.

## One-time setup
1. `cp .env.migrate.example .env.migrate` and fill in `SRC_PASSWORD` + `DST_PASSWORD`.
2. Ensure Docker is running (image `pgvector/pgvector:pg16` is pulled on first use).
3. `export MIGRATE_OUT=<a scratch dir outside the repo>`

## Order of operations
1. `bash preflight.sh` — record source row counts; if the target check fails,
   switch `DST_*` in `.env.migrate` to the **Session Pooler** (host
   `aws-0-<region>.pooler.supabase.com`, port 5432, user `postgres.<ref>`).
2. **Open the maintenance window:** pause writes on the source by scaling the
   Render `carmen-backend` service to 0 (Dashboard → service → Settings →
   Suspend, or scale instances to 0). This stops new `chat_history`/
   `activity_logs` rows so the snapshot is consistent. Downtime ≈ copy time.
3. `bash apply-schema.sh` — extensions, `0001`, RLS, truncate seed.
4. `bash copy-data.sh` — dump+load all tables (FK order, UUID-preserving).
5. `bash verify.sh` — must print `ALL PARITY CHECKS PASSED` (exit 0). If not,
   do NOT cut over — investigate; the source is untouched.
6. **Repoint config to Supabase** (see below), redeploy Render, un-suspend.
7. Smoke test (see below).
8. Close out: rotate the Supabase password; keep dev DB for 2–3 days.

## Repoint config (NOT committed — gitignored files + dashboard)
Set these `DB_*` to the Supabase **Session Pooler** everywhere the backend reads them:
- Render `carmen-backend` env (Dashboard):
  `DB_HOST=aws-0-<region>.pooler.supabase.com`, `DB_PORT=5432`,
  `DB_USER=postgres.<project-ref>`, `DB_PASSWORD=<supabase>`, `DB_NAME=postgres`,
  `DB_SSLMODE=require`, `DB_SCHEMA=public`. Leave `VECTOR_DIMENSION=2000` and
  `LLM_EMBED_MODEL=qwen/qwen3-embedding-8b` unchanged. Redeploy.
- Local dev: same values in `backend/.env`, `backend/.env.docker`,
  `backend/.env.local`.

Runtime uses the **Session Pooler (5432)**, not the Transaction Pooler (6543):
pgx prepared statements need session pooling. (Transaction pooler is a future
option only if pgx is set to simple protocol.)

## Smoke test (against Supabase)
- `curl -fsS https://carmen-backend-4o9h.onrender.com/health`
- `curl -fsS "https://carmen-backend-4o9h.onrender.com/api/documents?bu=blueledgers"` returns documents
- Send a real chat query and confirm it returns sources.

## Rollback (instant, zero data risk)
The dev DB was never written to. Set Render `carmen-backend` `DB_*` back to the
`dev.blueledgers.com:6432` values and redeploy. Un-suspend if needed.

## Close-out
- **Rotate the Supabase DB password** (it was shared in plaintext) — Supabase
  Dashboard → Project Settings → Database → Reset database password — then
  update Render env + local `.env*` with the new password and redeploy.
- Keep the dev DB running until Supabase is validated (2–3 days), then
  decommission.

## Large-dataset note (optional)
If `preflight.sh` shows `document_chunks` well above ~50k rows, load faster by
skipping the heavy indexes during copy: after `apply-schema.sh`, drop them,
run `copy-data.sh`, then recreate (DDL copied verbatim from
`backend/migrations/0001_init_schema.sql`):
```sql
DROP INDEX IF EXISTS public.idx_document_chunks_embedding;
DROP INDEX IF EXISTS public.document_chunks_content_fts_idx;
-- ... run copy-data.sh ...
CREATE INDEX idx_document_chunks_embedding
  ON public.document_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
CREATE INDEX document_chunks_content_fts_idx
  ON public.document_chunks USING gin (to_tsvector('simple', content));
```
````

- [ ] **Step 2: Commit the runbook**

```bash
git add scripts/supabase-migration/README.md
git commit -m "docs(migration): Supabase cutover runbook (window, repoint, rollback, rotation)"
```

- [ ] **Step 3: Execute the cutover (operational — follow the runbook)**

Perform, in order: open maintenance window (suspend Render `carmen-backend`) →
`apply-schema.sh` → `copy-data.sh` → `verify.sh` (must pass) → repoint Render +
local `.env*` to the Supabase Session Pooler → redeploy → un-suspend.

Expected: `verify.sh` exits 0 before any repoint. Do not proceed if it fails.

- [ ] **Step 4: Smoke-test against Supabase**

Run:
```bash
curl -fsS https://carmen-backend-4o9h.onrender.com/health && echo
curl -fsS "https://carmen-backend-4o9h.onrender.com/api/documents?bu=blueledgers" | head -c 400 && echo
```
Then send a real chat query in the app and confirm sources return.
Expected: `/health` OK; documents list non-empty; chat answers with sources.

- [ ] **Step 5: Close out (security)**

Rotate the Supabase DB password (Dashboard → Project Settings → Database →
Reset password), update Render env + local `.env*` with the new password, and
redeploy. Confirm the app still answers. Keep the dev DB for 2–3 days as
rollback, then decommission.

---

## Self-review

**Spec coverage:**
- Preflight (versions, target-endpoint fallback, baseline counts, dim, pg_dump probe) → Task 1.
- Schema setup (vector-in-public, `0001`, deny-all RLS, seed truncate) → Task 2.
- Data copy (FK order, UUID preservation, `\copy` CSV, vector text, trigger no-op) → Task 3.
- Verification (count parity, BU UUID parity, embedding dims/null) → Task 4.
- Cutover (maintenance window, Session Pooler repoint, rollback, password rotation, large-dataset index deferral) → Task 5.
- Global constraints (dim 2000, source read-only, no secrets committed, psql-not-go-migrate) → Global Constraints + `.gitignore` (Task 1) + gitignored `.env.migrate`/CSVs.
- All spec sections map to a task. No gaps.

**Placeholder scan:** No TBD/TODO. `CHANGME` in `.env.migrate.example` is an intentional template value the operator fills in the gitignored copy, not a plan placeholder. The large-dataset path ships concrete DDL, not "handle if large."

**Type/name consistency:** `psql_src`/`psql_dst`/`TABLES` defined in `lib.sh` (Task 1) and used identically in Tasks 2–4. `MIGRATE_OUT` used consistently in Tasks 3–4. Table list identical everywhere (FK-parent-first). Column lists generated the same way for dump and load (same `$cols`).
