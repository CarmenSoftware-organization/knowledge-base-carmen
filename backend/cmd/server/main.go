package main

import (
	"context"
	"log"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/router"
	"github.com/new-carmen/backend/internal/security"
	"github.com/new-carmen/backend/internal/services"

	_ "github.com/new-carmen/backend/docs"
)

func main() {
	if err := config.Load(); err != nil {
		log.Fatal("Failed to load config:", err)
	}
	if err := config.Validate(); err != nil {
		log.Fatal("Invalid configuration:", err)
	}
	if config.AppConfig != nil && strings.EqualFold(config.AppConfig.Server.Environment, "production") {
		u := strings.TrimSpace(config.AppConfig.Server.ChatbotURL)
		low := strings.ToLower(u)
		if strings.Contains(u, "localhost") || strings.Contains(u, "127.0.0.1") {
			log.Println("WARNING: PYTHON_CHATBOT_URL still points to loopback; POST /api/chat/* will fail until you set it to the public URL of the carmen-chatbot service (Render/Fly/etc.).")
		}
		if strings.Contains(low, "your-chatbot-url") || strings.Contains(low, "example.com") {
			log.Println("WARNING: PYTHON_CHATBOT_URL looks like a placeholder; deploy the Python carmen-chatbot service and set this env to its real HTTPS URL (see render.yaml). Chat stream will not work until then.")
		}
	}
	if config.AppConfig == nil || config.AppConfig.Translation.APIKey == "" {
		log.Println("Translation: disabled (GOOGLE_TRANSLATE_API_KEY not set or empty)")
	}
	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect database:", err)
	}

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
		buArg := args[1]
		idx := services.NewIndexingService()
		ctx := context.Background()
		if strings.EqualFold(buArg, "all") {
			var bus []models.BusinessUnit
			if err := database.DB.Table("public.business_units").Find(&bus).Error; err != nil {
				log.Fatalf("List business_units: %v", err)
			}
			for _, bu := range bus {
				slug := strings.TrimSpace(bu.Slug)
				if slug == "" || !security.ValidateSchema(slug) {
					continue
				}
				log.Printf("Reindex BU: %s...", slug)
				if err := idx.IndexAll(ctx, slug); err != nil {
					log.Fatalf("Reindex failed (%s): %v", slug, err)
				}
			}
			log.Println("Reindex all completed.")
			return
		}
		if !security.ValidateSchema(buArg) {
			log.Fatalf("Invalid BU: %q (use slug or \"all\")", buArg)
		}
		log.Printf("Starting manual reindex for BU: %s...", buArg)
		if err := idx.IndexAll(ctx, buArg); err != nil {
			log.Fatalf("Reindex failed: %v", err)
		}
		log.Println("Reindex completed successfully.")
		return
	}

	// In production, try to sync wiki content once on boot so /api/wiki/* does not
	// immediately fail when the local repo path is still empty.
	if config.AppConfig != nil && strings.EqualFold(config.AppConfig.Server.Environment, "production") {
		if err := services.NewWikiSyncService().Sync(); err != nil {
			log.Printf("WARNING: startup wiki sync failed: %v", err)
		} else {
			log.Println("Startup wiki sync completed.")
		}
	}

	app := fiber.New(fiber.Config{
		AppName:       "New Carmen Backend",
		BodyLimit:     4 * 1024 * 1024,
		CaseSensitive: true,
	})
	app.Use(requestid.New())
	app.Use(recover.New())
	router.SetupRoutes(app)
	port := config.AppConfig.Server.Port
	if err := app.Listen(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
