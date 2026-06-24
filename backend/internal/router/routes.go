package router

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/middleware"
	"github.com/gofiber/fiber/v2"
)

// SetupTestApp builds a minimal Fiber app (CORS + BU context middleware, health
// and wiki routes only) for use in tests.
func SetupTestApp() *fiber.App {
	_ = config.Load()
	app := fiber.New()
	app.Use(middleware.CORS())
	app.Use(middleware.BUContext())
	RegisterHealth(app)
	RegisterWiki(app)
	return app
}

// SetupRoutes installs the global middleware and registers every route group
// (root, docs, health, system, wiki, FAQ, webhook, indexing, documents, chat,
// activity, business units) on the app.
func SetupRoutes(app *fiber.App) {
	app.Use(middleware.Logger())
	app.Use(middleware.CORS())
	app.Use(middleware.BUContext())

	RegisterRoot(app)
	RegisterDocs(app)

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

// RegisterFAQ wires the /api/faq routes (modules, entry by id, module detail,
// and listing by module/sub/category).
func RegisterFAQ(app *fiber.App) {
	h := api.NewFAQHandler()
	g := app.Group("/api/faq")
	g.Get("/modules", h.ListModules)
	g.Get("/entry/:id", h.GetEntry)
	g.Get("/:module", h.GetModuleDetail)
	g.Get("/:module/:sub/:category", h.ListByCategory)
}

// RegisterBusinessUnits wires the GET /api/business-units list route plus the
// admin-only provision and deprovision routes.
func RegisterBusinessUnits(app *fiber.App) {
	h := api.NewBusinessUnitHandler()
	app.Get("/api/business-units", h.List)
	app.Post("/api/business-units/provision", middleware.RequireAdminKey, h.Provision)
	app.Post("/api/business-units/deprovision", middleware.RequireAdminKey, h.Deprovision)
}

// RegisterActivity wires the /api/activity routes (list and summary).
func RegisterActivity(app *fiber.App) {
	h := api.NewActivityHandler()
	g := app.Group("/api/activity")
	g.Get("/list", h.List)
	g.Get("/summary", h.Summary)
}
