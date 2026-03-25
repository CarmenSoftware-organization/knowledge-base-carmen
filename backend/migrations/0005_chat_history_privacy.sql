-- 0005_chat_history_privacy.sql
-- Migration: Privacy hardening for chat_history table
-- รัน: go run cmd/server/main.go migrate

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
-- 2. expires_at — plain column + backfill + trigger (GENERATED timestamptz+interval
--    is not immutable in PostgreSQL, so we maintain it in a BEFORE trigger).
--    On INSERT: if expires_at is NULL, set to created_at + 90 days.
--    On UPDATE: if created_at changes, set expires_at to new created_at + 90 days.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.chat_history
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.chat_history
SET expires_at = created_at + interval '90 days'
WHERE expires_at IS NULL;

CREATE OR REPLACE FUNCTION public.chat_history_set_expires_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.expires_at IS NULL THEN
      NEW.expires_at := NEW.created_at + interval '90 days';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      NEW.expires_at := NEW.created_at + interval '90 days';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_history_expires_at ON public.chat_history;
CREATE TRIGGER trg_chat_history_expires_at
  BEFORE INSERT OR UPDATE ON public.chat_history
  FOR EACH ROW
  EXECUTE PROCEDURE public.chat_history_set_expires_at();

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
