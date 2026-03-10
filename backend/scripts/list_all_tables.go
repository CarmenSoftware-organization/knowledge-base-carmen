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

	rows, err := database.DB.Raw("SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')").Rows()
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var schema, table string
		rows.Scan(&schema, &table)
		fmt.Printf("%s.%s\n", schema, table)
	}
}
