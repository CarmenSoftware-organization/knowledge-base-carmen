package main

import (
	"log"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
)

func main() {
	if err := config.Load(); err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	if err := database.Connect(); err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}

	log.Println("Nuking all activity_logs tables...")
	
	database.DB.Exec("DROP TABLE IF EXISTS public.activity_logs CASCADE")
	database.DB.Exec("DROP TABLE IF EXISTS carmen.activity_logs CASCADE")
	
	err := database.DB.Exec(`
		CREATE TABLE public.activity_logs (
			id BIGSERIAL PRIMARY KEY,
			bu_id INTEGER REFERENCES public.business_units(id),
			user_id TEXT,
			action TEXT NOT NULL,
			category TEXT NOT NULL,
			details JSONB,
			user_agent TEXT,
			timestamp TIMESTAMPTZ DEFAULT NOW(),
			created_at TIMESTAMPTZ DEFAULT NOW()
		)
	`).Error

	if err != nil {
		log.Fatalf("Failed to recreate table: %v", err)
	}

	log.Println("Table activity_logs recreated successfully!")
}
