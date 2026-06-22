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
    -- Skip a BU that has no legacy schema OR was already migrated. The copy
    -- below is one atomic DO block, so any existing public.documents rows for
    -- this bu_id mean it was fully copied — re-running must not duplicate chunks.
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = r.slug AND table_name = 'documents'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.documents WHERE bu_id = r.id
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
