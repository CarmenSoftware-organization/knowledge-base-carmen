package main

import (
	"fmt"
	"log"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
)

func main() {
	if err := config.Load(); err != nil {
		log.Fatalf("Load config failed: %v", err)
	}
	if err := database.Connect(); err != nil {
		log.Fatalf("Connect DB failed: %v", err)
	}

	var tables []string
	database.DB.Raw("SELECT tablename FROM pg_tables WHERE schemaname = 'public'").Scan(&tables)
	fmt.Printf("Tables in public: %v\n", tables)

	var searchPath string
	database.DB.Raw("SHOW search_path").Scan(&searchPath)
	fmt.Printf("Current search_path: %s\n", searchPath)
}
