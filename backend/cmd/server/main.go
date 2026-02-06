// Entry point — ตอนปิด DB จะรันแค่ GET /health + GET /api/system/status
package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/router"
)

func main() {
	// Load configuration
	if err := config.Load(); err != nil {
		log.Fatal("Failed to load config:", err)
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
