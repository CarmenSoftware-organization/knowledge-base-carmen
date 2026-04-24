package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
	"github.com/new-carmen/backend/internal/middleware"
)

func RegisterIndexing(app *fiber.App) {
	indexingHandler := api.NewIndexingHandler()
	app.Post("/api/index/rebuild", middleware.RequireAdminKey, indexingHandler.Rebuild)
	app.Post("/api/index/rebuild/one", middleware.RequireAdminKey, indexingHandler.RebuildOne)
	app.Get("/api/index/rebuild/status", middleware.RequireAdminKey, indexingHandler.Status)
	app.Post("/api/index/rebuild/unlock", middleware.RequireAdminKey, indexingHandler.ForceUnlock)
}
