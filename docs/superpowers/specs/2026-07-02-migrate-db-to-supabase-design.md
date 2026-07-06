# Migrate database from dev.blueledgers.com to Supabase — Design

**Date:** 2026-07-02
**Status:** Approved (design)
**Author:** brainstorming session

## Goal

Move the Carmen knowledge-base Postgres+pgvector database from the current
dev host (`dev.blueledgers.com`) to a Supabase-hosted Postgres, and make
Supabase the **new production database**. This is a full cutover: after
migration the app (Render backend + local dev) points at Supabase, and the
dev DB is kept only as a rollback target.

- **Source:** `dev.blueledgers.com:6432`, db `ai`, schema `public`, pgvector dim **2000**, embed model `qwen/qwen3-embedding-8b`. **Access is via PgBouncer (6432) only — no direct Postgres port, no SSH to the host.**
- **Target:** Supabase project ref `bqlgmrcvfdisufiiwzyv`, db `postgres`. Direct connection `db.<ref>.supabase.co:5432` is IPv6-only; IPv4 clients must use the Session Pooler.

## Non-goals

- No schema redesign — target schema is the repo's canonical `backend/migrations/0001_init_schema.sql`.
- No re-embedding — embeddings are copied verbatim (embed model and `VECTOR_DIMENSION=2000` are unchanged, so copied vectors stay valid).
- No changes to `contents/`, the indexer, or the RAG flow.

## Scope of data

**Full copy** of every tenant/table, including embeddings and logs:
`business_units`, `documents`, `document_chunks` (VECTOR 2000), `chat_history`,
`activity_logs`, `faq_modules`, `faq_submodules`, `faq_categories`,
`faq_entries`, `faq_related`.

## Approach (chosen)

**Logical copy: schema from repo + per-table `\copy`.** Rejected alternatives:

- **pg_dump/pg_restore through PgBouncer** — high risk: transaction pooling can't hold a cross-statement snapshot, and PgBouncer commonly rejects pg_dump's `extra_float_digits` startup param unless `ignore_startup_parameters` is set. Kept only as an opportunistic preflight fast-path (§Preflight step 5).
- **pgloader / external tooling** — pooler-safe but adds a dependency for no gain over plain `\copy`.

Why the chosen approach wins here: `\copy` runs the COPY protocol inside a
single session, which works fine through PgBouncer; the source is **read-only
throughout** (trivial rollback); and driving the schema from the repo lets us
control Supabase-specific concerns (extension schema, RLS) that a raw dump
would fight.

## Architecture & tooling

- Data path: source (read-only) → intermediate CSV files in the session scratchpad (never committed) → target.
- Tooling: one-off `pgvector/pgvector:pg16` docker containers (same pattern as `scripts/migrate-docker.sh`) — ships `psql`/`pg_dump`, no host client needed. TLS both sides (`PGSSLMODE=require`).
- Client major version (pg16) must be ≥ the source server version (confirmed in preflight).

## Preflight checks (before any write)

1. **Source reachable:** `select version();` through 6432 → confirms connectivity + PG major version.
2. **Target reachable:** try direct `db.<ref>.supabase.co:5432`; if it fails (IPv6-only network), switch to the **Session Pooler** connection string from the Supabase dashboard (`aws-0-<region>.pooler.supabase.com:5432`, user `postgres.<ref>`, db `postgres`). Record which endpoint works.
3. **Baseline row counts** for every table on source → used for sizing and post-copy verification.
4. **Dimension check:** `select vector_dims(embedding) from public.document_chunks limit 1;` = 2000.
5. **(Optional) Approach-B probe:** attempt `pg_dump --schema-only` through the pooler. If it connects and completes, pg_dump/pg_restore is viable as a faster path; otherwise proceed with the logical copy.

## Schema setup on Supabase

1. Enable extensions with explicit schema so the app's `search_path=public` resolves vector operators/casts:
   - `create extension if not exists vector with schema public;` (matches source, where vector lives in `public`; Supabase otherwise defaults extensions to the `extensions` schema).
   - `create extension if not exists pgcrypto with schema extensions;` (only needed for the `gen_random_uuid()` DB-default fallback; core PG13+ also provides it).
2. Apply `backend/migrations/0001_init_schema.sql` with `psql -v ON_ERROR_STOP=1` (the `CREATE EXTENSION IF NOT EXISTS vector` becomes a no-op). This creates all tables, functions, triggers, and indexes. **Do not** use the Go `./server migrate` (splits on `;`, corrupts `DO $$` blocks).
3. **Enable RLS (Supabase security):** `public` tables without RLS are exposed through Supabase's auto REST API to anyone holding the anon key; `chat_history`/`activity_logs` are sensitive. Run `ALTER TABLE public.<t> ENABLE ROW LEVEL SECURITY;` for every table, with **no policies** (deny-all to `anon`/`authenticated`). The Go backend connects as `postgres` (bypasses RLS), so the app is unaffected.
4. **Index timing:** if preflight shows a large `document_chunks` (roughly > 50k rows), apply the schema without the ivfflat + GIN indexes, bulk-load, then `CREATE INDEX` — faster load and better ivfflat quality. For smaller volumes, apply `0001` as-is.

## Data copy: order + UUID preservation

**Critical — preserve source UUIDs.** `0001` seeds `business_units`
(carmen/blueledgers) with fresh `gen_random_uuid()` values that will **not**
match the source; `documents.bu_id` would then reference the wrong (or a
non-existent) BU.

Procedure:

1. On target, after applying schema: `TRUNCATE public.business_units CASCADE;` — removes the seeded rows and cascades to all child tables (target is fresh anyway).
2. `\copy` each table in FK-parent-first order, carrying the **original `id` values**:
   `business_units → documents → document_chunks → chat_history → activity_logs → faq_modules → faq_submodules → faq_categories → faq_entries → faq_related`

Per-table mechanic:

- Source: `\copy (SELECT * FROM public.<t>) TO '<scratch>/<t>.csv' WITH (FORMAT csv, HEADER true)` — single-session COPY, pooler-safe.
- Target: `\copy public.<t> (<explicit column list>) FROM '<scratch>/<t>.csv' WITH (FORMAT csv, HEADER true)` — explicit column list guards against any column-order drift (both sides use `0001`, so order matches).

Notes:

- **Vectors** serialize as pgvector text `[...]` (round-trippable, full precision) and are CSV-quoted (they contain commas).
- **`chat_history` trigger** only sets `expires_at` when NULL; the copy supplies `expires_at`, so the trigger is a no-op and original timestamps are preserved. Optionally `SET session_replication_role = replica;` on the load session to disable triggers entirely (if the Supabase `postgres` role permits it).

## Cutover, config repoint, rollback

Recommended **maintenance window** for a consistent snapshot (no lost writes):

1. Pause writes — scale down / stop the Render `carmen-backend` service so dev stops receiving new `chat_history`/`activity_logs`. Downtime ≈ copy duration (minutes).
2. Run the copy → verify (§Verification).
3. Repoint config to Supabase and redeploy:
   - Render `carmen-backend` env: `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/DB_SSLMODE` → Supabase **Session Pooler** (port 5432, user `postgres.<ref>`, sslmode `require`).
   - Local: `backend/.env`, `backend/.env.docker`, `backend/.env.local` → same Supabase values (all gitignored — never committed).
   - `VECTOR_DIMENSION=2000` and `LLM_EMBED_MODEL` unchanged.
4. Bring the service back up → smoke test.

**Runtime connection choice:** use the **Session Pooler (5432)**, not the
Transaction Pooler (6543). pgx/Go prepared statements are incompatible with
transaction pooling unless forced to simple protocol; the session pooler
behaves like a direct connection (prepared statements OK) and is IPv4-friendly.
Fine for KB-level traffic. Transaction pooler remains a future option if pgx is
configured for it.

**Rollback:** the source dev DB is never written to. Rollback = set Render env
`DB_*` back to the `dev.blueledgers.com` values and redeploy (near-instant, zero
data risk). Keep the dev DB running until Supabase is validated for 2–3 days.

**Security close-out:**

- **Rotate the Supabase DB password** after migration — it was shared in plaintext in the chat/history.
- Confirm RLS is enabled on all `public` tables.

## Verification

- `count(*)` for every table matches source == target.
- `business_units` `id`+`slug` are identical source vs target (the critical UUID check).
- `vector_dims(embedding) = 2000`; count of NULL embeddings matches source.
- App smoke tests against Supabase: `/health`, `/api/documents?bu=blueledgers`, and a real chat query that returns sources.

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| pg_dump blocked by PgBouncer | Primary approach avoids pg_dump entirely (logical `\copy`). |
| Supabase direct 5432 unreachable (IPv6-only) | Preflight falls back to Session Pooler string. |
| BU UUID mismatch breaks FKs | Truncate seeded `business_units`, copy with original ids, verify id+slug. |
| Data exposed via Supabase auto REST API | Enable deny-all RLS on all public tables. |
| Vector precision loss | pgvector text format is round-trippable (exact). |
| Lost writes during copy | Maintenance window (pause Render writes) for a clean snapshot. |
| Bad cutover | Source untouched → repoint env back to dev + redeploy. |
| Leaked Supabase password | Rotate after migration. |

## Open items for the implementation plan

- Exact per-table explicit column lists (generate from `information_schema`).
- Concrete docker `psql` invocations for both endpoints.
- Decision on deferring indexes (based on preflight `document_chunks` count).
- Whether the Approach-B pg_dump fast-path is used (based on preflight probe).
