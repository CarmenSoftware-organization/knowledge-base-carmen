-- 0011_fts_gin_index.sql
-- Speeds up the native hybrid-retrieval FTS query (to_tsvector('simple', content)).
-- Creates a GIN index on every registered BU schema's document_chunks table so all
-- existing BUs are covered (not just 'carmen'). Idempotent (IF NOT EXISTS per schema).
--
-- For BRAND-NEW BUs provisioned later via create_bu_tables(): either re-run this file,
-- or add the same CREATE INDEX into the create_bu_tables() function body (0002/0005b)
-- so new schemas get the index automatically. Run with psql (DO $$ … $$ block).
DO $$
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN
    SELECT slug FROM public.business_units
  LOOP
    -- slug regex (^[a-zA-Z_][a-zA-Z0-9_]*$) makes the schema name safe; use %I anyway.
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = schema_name AND table_name = 'document_chunks'
    ) THEN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS document_chunks_content_fts_idx ON %I.document_chunks USING gin (to_tsvector(''simple'', content))',
        schema_name
      );
    END IF;
  END LOOP;
END $$;
