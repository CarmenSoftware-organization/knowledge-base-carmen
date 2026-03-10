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
	err := service.Log("carmen", "debug-user", "TEST_ACTION", "test", map[string]interface{}{"foo": "bar"}, "test-ua")
	if err != nil {
		fmt.Printf("Log Creation Error: %v\n", err)
	} else {
		fmt.Println("Log created successfully!")
	}
}
