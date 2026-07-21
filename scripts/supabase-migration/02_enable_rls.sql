-- Deny-all: enable RLS with NO policies. The Go backend connects as the
-- Supabase 'postgres' role, which bypasses RLS, so the app is unaffected;
-- the anon/authenticated roles (Supabase auto REST API) get nothing.
ALTER TABLE public.business_units  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_modules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_submodules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_related     ENABLE ROW LEVEL SECURITY;
