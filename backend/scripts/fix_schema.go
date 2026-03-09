package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	_ = godotenv.Load("d:/New-carmen/backend/.env")

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_SSLMODE"),
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}

	fmt.Println("--- Fixing Carmen Schema and Tables ---")

	sql := `
	CREATE SCHEMA IF NOT EXISTS carmen;
	CREATE SCHEMA IF NOT EXISTS inventory;

	-- Create Table function (to ensure consistency)
	CREATE OR REPLACE FUNCTION create_bu_tables(schema_name text) RETURNS void AS $$
	BEGIN
		EXECUTE format('
			CREATE TABLE IF NOT EXISTS %I.documents (
				id SERIAL PRIMARY KEY,
				path TEXT NOT NULL UNIQUE,
				title TEXT,
				source TEXT,
				created_at TIMESTAMPTZ DEFAULT NOW(),
				updated_at TIMESTAMPTZ DEFAULT NOW()
			);

			CREATE TABLE IF NOT EXISTS %I.document_chunks (
				id SERIAL PRIMARY KEY,
				document_id INT REFERENCES %I.documents(id) ON DELETE CASCADE,
				chunk_index INT,
				content TEXT,
				embedding vector(768),
				created_at TIMESTAMPTZ DEFAULT NOW()
			);
			
			CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON %I.document_chunks USING hnsw (embedding vector_cosine_ops);
		', schema_name, schema_name, schema_name, schema_name);
	END;
	$$ LANGUAGE plpgsql;

	-- Run creation
	SELECT create_bu_tables('carmen');
	SELECT create_bu_tables('inventory');
	`

	if err := db.Exec(sql).Error; err != nil {
		log.Fatalf("Failed to fix schema: %v", err)
	}

	fmt.Println("Schema and tables created successfully.")
}
