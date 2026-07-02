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
5. `bash reindex-vectors.sh` — rebuild both ivfflat vector indexes so their
   centroids are computed from the loaded data. **Mandatory** — the indexes are
   created on empty tables by `apply-schema.sh`, and skipping this silently
   degrades RAG retrieval recall.
6. `bash verify.sh` — must print `ALL PARITY CHECKS PASSED` (exit 0). If not,
   do NOT cut over — investigate; the source is untouched.
7. **Repoint config to Supabase** (see below), redeploy Render, un-suspend.
8. Smoke test (see below).
9. Close out: rotate the Supabase password; keep dev DB for 2–3 days.

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
- Confirm deny-all RLS still holds: connecting as the Supabase `anon` role,
  `select count(*) from public.documents;` must return 0 rows (RLS blocks it).
  RLS is enabled by `apply-schema.sh` and nothing in the flow disables it.
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
