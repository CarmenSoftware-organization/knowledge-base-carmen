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

	for _, schema := range []string{"carmen", "public"} {
		var tables []string
		database.DB.Raw(fmt.Sprintf("SELECT tablename FROM pg_tables WHERE schemaname = '%s'", schema)).Scan(&tables)
		fmt.Printf("Tables in %-6s: %v\n", schema, tables)
	}
}
