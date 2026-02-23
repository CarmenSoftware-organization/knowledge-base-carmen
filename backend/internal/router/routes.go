package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/middleware"
)

// SetupRoutes registers all application middleware and route groups.
func SetupRoutes(app *fiber.App) {
	app.Use(middleware.Logger())
	app.Use(middleware.CORS())

	RegisterHealth(app)
	RegisterPublicSystem(app)
	RegisterWiki(app)
	RegisterWebhook(app)
	RegisterIndexing(app)
	RegisterDocuments(app)
	RegisterPublicChat(app)
}
