-- 0001_init_documents.sql
-- Migration: create documents and document_chunks tables
-- NOTE: Adjust vector dimension to match your embedding model.

-- Enable pgvector extension (required for vector column)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  title TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index to speed up similarity searches (pgvector)
-- Adjust using ivfflat or hnsw depending on pgvector version and needs
-- Example: CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
