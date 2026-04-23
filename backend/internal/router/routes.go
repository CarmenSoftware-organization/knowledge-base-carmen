package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/middleware"
	fiberSwagger "github.com/swaggo/fiber-swagger"
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

	app.Get("/swagger/*", fiberSwagger.WrapHandler)

	RegisterHealth(app)
	RegisterPublicSystem(app)
	RegisterWiki(app)
	RegisterFAQ(app)
	RegisterWebhook(app)
	RegisterIndexing(app)
	RegisterDocuments(app)
	RegisterPublicChat(app)
	RegisterActivity(app)
	RegisterBusinessUnits(app)
}

func RegisterFAQ(app *fiber.App) {
	h := api.NewFAQHandler()
	g := app.Group("/api/faq")
	g.Get("/modules", h.ListModules)
	g.Get("/entry/:id", h.GetEntry)
	g.Get("/:module", h.GetModuleDetail)
	g.Get("/:module/:sub/:category", h.ListByCategory)
}

func RegisterBusinessUnits(app *fiber.App) {
	h := api.NewBusinessUnitHandler()
	app.Get("/api/business-units", h.List)
	app.Post("/api/business-units/provision", middleware.RequireAdminKey, h.Provision)
	app.Post("/api/business-units/deprovision", middleware.RequireAdminKey, h.Deprovision)
}

func RegisterActivity(app *fiber.App) {
	h := api.NewActivityHandler()
	g := app.Group("/api/activity")
	g.Get("/list", h.List)
	g.Get("/summary", h.Summary)
}
