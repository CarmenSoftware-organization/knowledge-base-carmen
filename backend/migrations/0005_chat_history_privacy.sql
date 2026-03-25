-- 0005_chat_history_privacy.sql
-- Migration: Privacy hardening for chat_history table
-- รัน: go run cmd/server/main.go migrate

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Anonymise existing user_id rows that look like real identifiers.
--    Rows already set to 'anonymous' or starting with 'u:' (already hashed)
--    are left unchanged.
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE public.chat_history
SET user_id = 'anon:' || encode(digest(user_id, 'sha256'), 'hex')
WHERE user_id IS NOT NULL
  AND user_id != 'anonymous'
  AND user_id NOT LIKE 'u:%'
  AND user_id NOT LIKE 'anon:%';

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Add expires_at column for per-row retention control.
--    Default: 90 days from created_at.
--    Application can override per BU by setting a different interval.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.chat_history
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ
    GENERATED ALWAYS AS (created_at + INTERVAL '90 days') STORED;

CREATE INDEX IF NOT EXISTS idx_chat_history_expires_at
  ON public.chat_history (expires_at);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Cleanup function — call this from a cron job or the application scheduler.
--    Returns the number of rows deleted.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_expired_chat_history()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.chat_history WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. (Optional) pg_cron schedule — uncomment if pg_cron extension is available.
--    Runs the purge every day at 02:00 UTC.
-- ──────────────────────────────────────────────────────────────────────────────
-- SELECT cron.schedule('purge-chat-history', '0 2 * * *', 'SELECT public.purge_expired_chat_history()');
