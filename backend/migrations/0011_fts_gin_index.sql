-- 0011_fts_gin_index.sql
-- Speeds up the hybrid-retrieval FTS query (to_tsvector('simple', content)).
-- Per-BU: run for each business-unit schema's document_chunks table.
-- Example for the 'carmen' schema (repeat per BU, or fold into create_bu_tables):
CREATE INDEX IF NOT EXISTS document_chunks_content_fts_idx
  ON carmen.document_chunks
  USING gin (to_tsvector('simple', content));
