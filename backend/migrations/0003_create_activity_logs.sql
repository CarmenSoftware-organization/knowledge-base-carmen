-- 0003_create_activity_logs.sql
-- Migration: Create activity_logs table in public schema for global logging

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id BIGSERIAL PRIMARY KEY,
    bu_id INT REFERENCES public.business_units(id) ON DELETE SET NULL,
    user_id TEXT, -- For now, store user name or ID as text until user table is implemented
    action TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g., 'wiki', 'system', 'admin'
    details JSONB, -- Store JSON data for flexibility (e.g., old/new values, document path)
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_bu_id ON public.activity_logs(bu_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON public.activity_logs(category);
