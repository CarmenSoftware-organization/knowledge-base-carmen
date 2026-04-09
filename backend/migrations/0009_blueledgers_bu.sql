-- Add schema blueledgers + tables if missing (no truncate). Prefer 0002 on fresh DB.

INSERT INTO public.business_units (name, slug, description)
VALUES (
    'Blueledgers',
    'blueledgers',
    'Wiki / KB documents for Blueledgers'
)
ON CONFLICT (slug) DO NOTHING;

CREATE SCHEMA IF NOT EXISTS blueledgers;

SELECT create_bu_tables('blueledgers');

DROP INDEX IF EXISTS blueledgers.idx_document_chunks_embedding;
ALTER TABLE blueledgers.document_chunks
  ALTER COLUMN embedding TYPE vector(2000);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON blueledgers.document_chunks USING ivfflat (embedding vector_l2_ops)
  WITH (lists = 100);
