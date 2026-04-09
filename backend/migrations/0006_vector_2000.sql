-- 0006_vector_2000.sql
-- Migration: Align pgvector dimensions to 2000 for qwen3-embedding (truncate from 4096)
-- Note: pgvector IVFFlat/HNSW limit is 2000, so 2000 is the max safe dimension for indexed vectors.
-- Run: go run cmd/server/main.go migrate migrations/0006_vector_2000.sql

-- 1. carmen.document_chunks
DROP INDEX IF EXISTS carmen.idx_document_chunks_embedding;
ALTER TABLE carmen.document_chunks
  ALTER COLUMN embedding TYPE vector(2000);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON carmen.document_chunks USING ivfflat (embedding vector_l2_ops)
  WITH (lists = 100);

-- 2. blueledgers.document_chunks
DROP INDEX IF EXISTS blueledgers.idx_document_chunks_embedding;
ALTER TABLE blueledgers.document_chunks
  ALTER COLUMN embedding TYPE vector(2000);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON blueledgers.document_chunks USING ivfflat (embedding vector_l2_ops)
  WITH (lists = 100);

-- 3. public.chat_history
DROP INDEX IF EXISTS idx_chat_history_embedding;
ALTER TABLE public.chat_history
  ALTER COLUMN question_embedding TYPE vector(2000);
CREATE INDEX IF NOT EXISTS idx_chat_history_embedding
  ON public.chat_history USING ivfflat (question_embedding vector_l2_ops)
  WITH (lists = 100);

