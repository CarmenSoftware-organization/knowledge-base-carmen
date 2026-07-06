-- 0002_chat_history_count_rpc.sql
-- Count-only RPC for the frontend Supabase connectivity test (/history/count).
-- SECURITY DEFINER so the anon role can read ONLY the row count of
-- public.chat_history without any SELECT access to the (RLS-locked) table rows.
-- Idempotent: safe to re-run.

CREATE OR REPLACE FUNCTION public.get_chat_history_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$ SELECT count(*) FROM public.chat_history $$;

-- Lock down, then grant EXECUTE only to the anonymous API role.
REVOKE ALL ON FUNCTION public.get_chat_history_count() FROM public;
GRANT EXECUTE ON FUNCTION public.get_chat_history_count() TO anon;

-- Ask PostgREST to reload its schema cache so the function is exposed immediately.
NOTIFY pgrst, 'reload schema';
