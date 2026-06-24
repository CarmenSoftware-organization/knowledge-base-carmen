package router

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/middleware"
	"github.com/gofiber/fiber/v2"
)

// RegisterIndexing wires the admin-only /api/index/rebuild* routes (rebuild,
// rebuild one, status, force-unlock), each guarded by RequireAdminKey.
func RegisterIndexing(app *fiber.App) {
	indexingHandler := api.NewIndexingHandler()
	app.Post("/api/index/rebuild", middleware.RequireAdminKey, indexingHandler.Rebuild)
	app.Post("/api/index/rebuild/one", middleware.RequireAdminKey, indexingHandler.RebuildOne)
	app.Get("/api/index/rebuild/status", middleware.RequireAdminKey, indexingHandler.Status)
	app.Post("/api/index/rebuild/unlock", middleware.RequireAdminKey, indexingHandler.ForceUnlock)
}
