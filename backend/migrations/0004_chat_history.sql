-- 0004_chat_history.sql
-- Migration: Create chat_history table for storing Q&A and enabling cache-by-similarity
-- รัน: go run cmd/server/main.go migrate

CREATE TABLE IF NOT EXISTS public.chat_history (
    id BIGSERIAL PRIMARY KEY,
    bu_id INT NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
    user_id TEXT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sources JSONB,
    question_embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_history_bu_id ON public.chat_history(bu_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON public.chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON public.chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_history_embedding ON public.chat_history 
    USING ivfflat (question_embedding vector_l2_ops) WITH (lists = 100);
