package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/middleware"
)


func SetupRoutes(app *fiber.App) {
	app.Use(middleware.Logger())
	app.Use(middleware.CORS())

	RegisterHealth(app)
	RegisterPublicSystem(app)
	RegisterWiki(app)
	RegisterWebhook(app)
	RegisterIndexing(app)
	RegisterDocuments(app)
}
