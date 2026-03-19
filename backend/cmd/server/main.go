package main

import (
	"context"
	"log"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/router"
	"github.com/new-carmen/backend/internal/security"
	"github.com/new-carmen/backend/internal/services"
)

func main() {
	// Load backend/.env by absolute path so it works when binary runs from backend/tmp/
	if execPath, err := os.Executable(); err == nil {
		backendDir := filepath.Dir(filepath.Dir(execPath))
		envPath := filepath.Join(backendDir, ".env")
		if _, err := os.Stat(envPath); err == nil {
			_ = godotenv.Load(envPath)
		}
	}
	if err := config.Load(); err != nil {
		log.Fatal("Failed to load config:", err)
	}
	if config.AppConfig != nil && config.AppConfig.Translation.APIKey != "" {
	} else {
		log.Println("Translation: disabled (GOOGLE_TRANSLATE_API_KEY not set or empty)")
	}
	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect database:", err)
	}

	// Handle CLI Commands
	args := os.Args[1:]
	if len(args) >= 1 && args[0] == "migrate" {
		path := "migrations/0004_chat_history.sql"
		if len(args) >= 2 {
			path = args[1]
		}
		if err := database.RunSQLFile(path); err != nil {
			log.Fatalf("Migration failed: %v", err)
		}
		log.Println("Migration completed.")
		return
	}
	if len(args) >= 2 && args[0] == "reset" {
		sub := args[1]
		if sub == "index" && len(args) >= 3 {
			bu := args[2]
			if !security.ValidateSchema(bu) {
				log.Fatalf("Invalid BU: %q", bu)
			}
			log.Printf("Truncating documents for BU: %s...", bu)
			if err := database.TruncateBUTables(bu); err != nil {
				log.Fatalf("Reset index failed: %v", err)
			}
			log.Println("Index cleared. Run 'reindex " + bu + "' to rebuild.")
			return
		}
		if sub == "all" {
			log.Println("Truncating public tables (activity_logs, chat_history, etc.)...")
			if err := database.ClearPublicTables(); err != nil {
				log.Fatalf("Reset all failed: %v", err)
			}
			log.Println("Public tables cleared.")
			return
		}
		log.Fatal("Usage: go run cmd/server/main.go reset index <bu> | reset all")
	}
	if len(args) >= 2 && args[0] == "reindex" {
		bu := args[1]
		if !security.ValidateSchema(bu) {
			log.Fatalf("Invalid BU: %q", bu)
		}
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
