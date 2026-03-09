package main

import (
	"fmt"
	"log"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/services"
)

func main() {
	if err := config.Load(); err != nil {
		log.Fatalf("Load config failed: %v", err)
	}
	if err := database.Connect(); err != nil {
		log.Fatalf("Connect DB failed: %v", err)
	}

	service := services.NewActivityLogService()
	logs, err := service.GetLogs("carmen", 20, 0)
	if err != nil {
		fmt.Printf("GetLogs Error: %v\n", err)
		return
	}

	fmt.Printf("Success! Found %d logs\n", len(logs))
}
