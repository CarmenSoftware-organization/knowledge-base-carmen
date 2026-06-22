-- 0012_chat_history_metrics.sql
-- Adds the metrics JSONB column used for feedback (jsonb_set '{feedback}') and
-- for per-message token/cost logging. Idempotent.
ALTER TABLE public.chat_history
  ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}'::jsonb;
