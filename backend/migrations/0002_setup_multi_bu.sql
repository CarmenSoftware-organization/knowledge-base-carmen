-- 0002_setup_multi_bu.sql
-- Migration: Setup schemas and tables for Multi-BU architecture

-- 1. Create Business Units table in public schema
CREATE TABLE IF NOT EXISTS public.business_units (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert initial business units
INSERT INTO public.business_units (name, slug, description) 
VALUES ('Carmen Cloud', 'carmen', 'System for Carmen Cloud documents and Wiki'),
       ('Inventory', 'inventory', 'System for Inventory management and Wiki')
ON CONFLICT (slug) DO NOTHING;

-- 3. Create Schemas for each BU
CREATE SCHEMA IF NOT EXISTS carmen;
CREATE SCHEMA IF NOT EXISTS inventory;

-- 4. Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- 5. Define function to create BU-specific tables
-- This helps in maintaining consistency across BU schemas
CREATE OR REPLACE FUNCTION create_bu_tables(schema_name TEXT) 
RETURNS VOID AS $$
BEGIN
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.documents (
            id BIGSERIAL PRIMARY KEY,
            path TEXT NOT NULL UNIQUE,
            title TEXT,
            source TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS %I.document_chunks (
            id BIGSERIAL PRIMARY KEY,
            document_id BIGINT NOT NULL REFERENCES %I.documents(id) ON DELETE CASCADE,
            chunk_index INT NOT NULL,
            content TEXT,
            embedding VECTOR(768),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ', schema_name, schema_name, schema_name);
END;
$$ LANGUAGE plpgsql;

-- 6. Execute for existing schemas
SELECT create_bu_tables('carmen');
SELECT create_bu_tables('inventory');

-- 7. Migrate data from public.documents to carmen.documents if they exist
-- (This assumes existing data belongs to Carmen Cloud by default)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documents') THEN
        INSERT INTO carmen.documents (id, path, title, source, created_at, updated_at)
        SELECT id, path, title, source, created_at, updated_at FROM public.documents
        ON CONFLICT (path) DO NOTHING;

        INSERT INTO carmen.document_chunks (id, document_id, chunk_index, content, embedding, created_at)
        SELECT id, document_id, chunk_index, content, embedding, created_at FROM public.document_chunks
        ON CONFLICT DO NOTHING;
        
        -- Reset sequences for safety
        PERFORM setval('carmen.documents_id_seq', (SELECT MAX(id) FROM carmen.documents));
        PERFORM setval('carmen.document_chunks_id_seq', (SELECT MAX(id) FROM carmen.document_chunks));
    END IF;
END $$;
