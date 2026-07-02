-- 0001_init_schema.sql
-- Canonical single-file schema for the Carmen multi-BU knowledge base (pgvector).
-- Embedding dimension: 2000 (matches production VECTOR_DIMENSION in render.yaml).
-- Idempotent — safe to re-run. Apply with psql (contains PL/pgSQL blocks):
--   psql -U <user> -d <db> -v ON_ERROR_STOP=1 -f backend/migrations/0001_init_schema.sql
-- Supersedes the former 0001–0012 migration chain. New BUs are provisioned at
-- runtime by inserting into public.business_units; documents/chunks are shared tables keyed by bu_id.

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Business units (tenant registry) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_units (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_business_units_deleted_at ON public.business_units(deleted_at);

INSERT INTO public.business_units (name, slug, description)
VALUES ('Carmen Cloud', 'carmen', 'System for Carmen Cloud documents and Wiki'),
       ('Blueledgers', 'blueledgers', 'Wiki / KB documents for Blueledgers')
ON CONFLICT (slug) DO NOTHING;

-- ── Documents + chunks (shared public tables, keyed by bu_id) ────────────────
-- One row per document/chunk; tenants separated by bu_id (FK → business_units).
-- bu_id is denormalized onto document_chunks so the vector filter sits on the
-- same table as the embedding (works well with the ivfflat index).
CREATE TABLE IF NOT EXISTS public.documents (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bu_id      UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
    path       TEXT NOT NULL,
    title      TEXT,
    source     TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (bu_id, path)
);
CREATE INDEX IF NOT EXISTS idx_documents_bu ON public.documents(bu_id);

CREATE TABLE IF NOT EXISTS public.document_chunks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bu_id       UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
    doc_id      UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content     TEXT,
    embedding   VECTOR(2000),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chunks_bu ON public.document_chunks(bu_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
    ON public.document_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS document_chunks_content_fts_idx
    ON public.document_chunks USING gin (to_tsvector('simple', content));

-- ── Chat history (similarity cache + privacy retention + metrics) ────────────
CREATE TABLE IF NOT EXISTS public.chat_history (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bu_id              UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
    user_id            TEXT,
    question           TEXT NOT NULL,
    answer             TEXT NOT NULL,
    sources            JSONB,
    question_embedding VECTOR(2000),
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    expires_at         TIMESTAMPTZ,
    metrics            JSONB DEFAULT '{}'::jsonb,
    -- Chatbot telemetry (present in production; kept in sync so fresh DBs match)
    lang                  CHAR(2),
    intent_type           VARCHAR(30),
    model_name            VARCHAR(100),
    chat_input_tokens     INTEGER DEFAULT 0,
    chat_output_tokens    INTEGER DEFAULT 0,
    embed_tokens          INTEGER DEFAULT 0,
    rewrite_input_tokens  INTEGER DEFAULT 0,
    rewrite_output_tokens INTEGER DEFAULT 0,
    total_tokens          INTEGER DEFAULT 0,
    cost_usd              NUMERIC(18,8) DEFAULT 0,
    intent_input_tokens   INTEGER DEFAULT 0 NOT NULL,
    intent_output_tokens  INTEGER DEFAULT 0 NOT NULL,
    avg_similarity_score  NUMERIC(6,4),
    answer_length         INTEGER DEFAULT 0 NOT NULL,
    device_type           VARCHAR(20),
    referrer_page         TEXT,
    embed_model           VARCHAR(200),
    intent_model          VARCHAR(200)
);

CREATE INDEX IF NOT EXISTS idx_chat_history_bu_id      ON public.chat_history(bu_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id    ON public.chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON public.chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_history_expires_at ON public.chat_history(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_history_embedding
    ON public.chat_history USING ivfflat (question_embedding vector_l2_ops) WITH (lists = 100);

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

-- ── Activity logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bu_id      UUID REFERENCES public.business_units(id) ON DELETE SET NULL,
    user_id    TEXT,
    action     TEXT NOT NULL,
    category   TEXT NOT NULL,
    details    JSONB,
    user_agent TEXT,
    timestamp  TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_bu_id     ON public.activity_logs(bu_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category  ON public.activity_logs(category);

-- ── FAQ (BU-aware hierarchy) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.faq_modules (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bu_id      UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL,
    icon       TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (bu_id, slug)
);

CREATE TABLE IF NOT EXISTS public.faq_submodules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id   UUID NOT NULL REFERENCES public.faq_modules(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL,
    description TEXT,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (module_id, slug)
);

CREATE TABLE IF NOT EXISTS public.faq_categories (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submodule_id UUID NOT NULL REFERENCES public.faq_submodules(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    slug         TEXT NOT NULL,
    sort_order   INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (submodule_id, slug)
);

CREATE TABLE IF NOT EXISTS public.faq_entries (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id   UUID NOT NULL REFERENCES public.faq_categories(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    sample_case   TEXT,
    problem_cause TEXT,
    solution      TEXT,
    tags          TEXT[] DEFAULT '{}',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_by    TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.faq_related (
    faq_id         UUID NOT NULL REFERENCES public.faq_entries(id) ON DELETE CASCADE,
    related_faq_id UUID NOT NULL REFERENCES public.faq_entries(id) ON DELETE CASCADE,
    PRIMARY KEY (faq_id, related_faq_id)
);
