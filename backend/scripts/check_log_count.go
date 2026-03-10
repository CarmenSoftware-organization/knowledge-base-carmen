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

	var count int64
	err := database.DB.Table("activity_logs").Count(&count).Error
	if err != nil {
		fmt.Printf("Count Error: %v\n", err)
	} else {
		fmt.Printf("Total Logs: %d\n", count)
	}
}
