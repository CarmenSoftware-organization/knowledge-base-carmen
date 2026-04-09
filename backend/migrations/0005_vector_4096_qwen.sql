-- 0005_vector_4096_qwen.sql
-- Migration: Change vector dimension to 1536 for qwen3-embedding (truncate from 4096)
-- pgvector IVFFlat/HNSW limit is 2000, so we use 1536 for index support.
-- รัน: go run cmd/server/main.go migrate migrations/0005_vector_4096_qwen.sql

-- 1. carmen.document_chunks
DROP INDEX IF EXISTS carmen.idx_document_chunks_embedding;

ALTER TABLE carmen.document_chunks DROP COLUMN IF EXISTS embedding;

ALTER TABLE carmen.document_chunks
ADD COLUMN embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON carmen.document_chunks USING ivfflat (embedding vector_l2_ops)
WITH (lists = 100);

-- 2. blueledgers.document_chunks
DROP INDEX IF EXISTS blueledgers.idx_document_chunks_embedding;

ALTER TABLE blueledgers.document_chunks
DROP COLUMN IF EXISTS embedding;

ALTER TABLE blueledgers.document_chunks
ADD COLUMN embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON blueledgers.document_chunks USING ivfflat (embedding vector_l2_ops)
WITH (lists = 100);

-- 3. public.chat_history
DROP INDEX IF EXISTS idx_chat_history_embedding;

ALTER TABLE public.chat_history
DROP COLUMN IF EXISTS question_embedding;

ALTER TABLE public.chat_history
ADD COLUMN question_embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_chat_history_embedding ON public.chat_history USING ivfflat (
    question_embedding vector_l2_ops
)
WITH (lists = 100);

-- 4. Update create_bu_tables: รัน migrations/0005b_create_bu_tables_1536.sql ด้วย psql