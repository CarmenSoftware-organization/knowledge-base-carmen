package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/middleware"
)

func SetupTestApp() *fiber.App {
	_ = config.Load()
	app := fiber.New()
	app.Use(middleware.CORS())
	app.Use(middleware.BUContext())
	RegisterHealth(app)
	RegisterWiki(app)
	return app
}

func SetupRoutes(app *fiber.App) {
	app.Use(middleware.Logger())
	app.Use(middleware.CORS())
	app.Use(middleware.BUContext())

	RegisterHealth(app)
	RegisterPublicSystem(app)
	RegisterWiki(app)
	RegisterWebhook(app)
	RegisterIndexing(app)
	RegisterDocuments(app)
	RegisterPublicChat(app)
	RegisterActivity(app)
	RegisterBusinessUnits(app)
}

func RegisterBusinessUnits(app *fiber.App) {
	h := api.NewBusinessUnitHandler()
	app.Get("/api/business-units", h.List)
}

func RegisterActivity(app *fiber.App) {
	h := api.NewActivityHandler()
	g := app.Group("/api/activity")
	g.Get("/list", h.List)
	g.Get("/summary", h.Summary)
}
