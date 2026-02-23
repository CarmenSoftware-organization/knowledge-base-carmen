
package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/router"
)

func main() {
	if err := config.Load(); err != nil {
		log.Fatal("Failed to load config:", err)
	}
	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect database:", err)
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
