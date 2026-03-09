
package main

import (
	"context"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/router"
	"github.com/new-carmen/backend/internal/services"
)

func main() {
	if err := config.Load(); err != nil {
		log.Fatal("Failed to load config:", err)
	}
	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect database:", err)
	}

	// Handle CLI Commands
	args := os.Args[1:]
	if len(args) >= 2 && args[0] == "reindex" {
		bu := args[1]
		log.Printf("Starting manual reindex for BU: %s...", bu)
		idx := services.NewIndexingService()
		if err := idx.IndexAll(context.Background(), bu); err != nil {
			log.Fatalf("Reindex failed: %v", err)
		}
		log.Println("Reindex completed successfully.")
		return
	}

	app := fiber.New(fiber.Config{
		AppName: "New Carmen Backend",
	})
	router.SetupRoutes(app)
	port := config.AppConfig.Server.Port
	if err := app.Listen(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
