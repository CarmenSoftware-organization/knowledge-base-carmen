package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	domain "github.com/new-carmen/backend/internal/domain"
	"github.com/new-carmen/backend/internal/router"
)

func main() {
	// Load configuration
	if err := config.Load(); err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// Connect to database
	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	// Run migrations
	if err := database.Migrate(
		&domain.User{},
		&domain.Role{},
		&domain.Category{},
		&domain.Document{},
		&domain.DocumentVersion{},
		&domain.DocumentPermission{},
		&domain.ArticleFeedback{},
	); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName: "New Carmen Backend",
	})

	// Setup routes
	router.SetupRoutes(app)

	// Start server
	port := config.AppConfig.Server.Port
	if err := app.Listen(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
