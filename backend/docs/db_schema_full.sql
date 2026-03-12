-- =============================================================================
-- New Carmen - Complete Database Schema
-- สำหรับออกแบบใน db.io / dbdiagram.io
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Schemas
CREATE SCHEMA IF NOT EXISTS carmen;
CREATE SCHEMA IF NOT EXISTS inventory;

-- =============================================================================
-- PUBLIC SCHEMA
-- =============================================================================

-- 1. business_units
CREATE TABLE public.business_units (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. activity_logs
CREATE TABLE public.activity_logs (
    id BIGSERIAL PRIMARY KEY,
    bu_id INT REFERENCES public.business_units(id) ON DELETE SET NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    category TEXT NOT NULL,
    details JSONB,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_bu_id ON public.activity_logs(bu_id);
CREATE INDEX idx_activity_logs_timestamp ON public.activity_logs(timestamp);
CREATE INDEX idx_activity_logs_category ON public.activity_logs(category);

-- 3. chat_history (ประวัติ Q&A สำหรับ cache)
CREATE TABLE public.chat_history (
    id BIGSERIAL PRIMARY KEY,
    bu_id INT NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
    user_id TEXT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sources JSONB,
    question_embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_history_bu_id ON public.chat_history(bu_id);
CREATE INDEX idx_chat_history_user_id ON public.chat_history(user_id);
CREATE INDEX idx_chat_history_created_at ON public.chat_history(created_at);
CREATE INDEX idx_chat_history_embedding ON public.chat_history 
    USING ivfflat (question_embedding vector_l2_ops) WITH (lists = 100);

-- =============================================================================
-- CARMEN SCHEMA (BU: carmen)
-- =============================================================================

CREATE TABLE carmen.documents (
    id BIGSERIAL PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    title TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE carmen.document_chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES carmen.documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_document_chunks_embedding ON carmen.document_chunks 
    USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- =============================================================================
-- INVENTORY SCHEMA (BU: inventory)
-- =============================================================================

CREATE TABLE inventory.documents (
    id BIGSERIAL PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    title TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory.document_chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES inventory.documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_document_chunks_embedding ON inventory.document_chunks 
    USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- =============================================================================
-- SEED DATA
-- =============================================================================

INSERT INTO public.business_units (name, slug, description) 
VALUES 
    ('Carmen Cloud', 'carmen', 'System for Carmen Cloud documents and Wiki'),
    ('Inventory', 'inventory', 'System for Inventory management and Wiki')
ON CONFLICT (slug) DO NOTHING;
