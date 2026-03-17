-- 0005b_create_bu_tables_1536.sql
-- Update create_bu_tables to use VECTOR(1536) for new BU schemas.
-- รันด้วย psql: psql $DATABASE_URL -f migrations/0005b_create_bu_tables_1536.sql

CREATE OR REPLACE FUNCTION create_bu_tables(schema_name TEXT) RETURNS VOID AS $fn$
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
            embedding VECTOR(1536),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ', schema_name, schema_name, schema_name);
END;
$fn$ LANGUAGE plpgsql;
