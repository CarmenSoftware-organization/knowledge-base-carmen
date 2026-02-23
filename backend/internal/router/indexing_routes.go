package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
)

func RegisterIndexing(app *fiber.App) {
	indexingHandler := api.NewIndexingHandler()
	app.Post("/api/index/rebuild", indexingHandler.Rebuild)
}
