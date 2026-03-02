package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
	"github.com/new-carmen/backend/internal/config"
)


func RegisterWiki(app *fiber.App) {
	h := api.NewWikiHandler()
	app.Get("/api/wiki/list", h.List)
	app.Get("/api/wiki/categories", h.ListCategories)
	app.Get("/api/wiki/category/:slug", h.GetCategory)
	app.Get("/api/wiki/content/*", h.GetContent)
	app.Get("/api/wiki/search", h.Search)
	app.Post("/api/wiki/sync", h.Sync)
	app.Static("/wiki-assets", config.GetWikiContentPath())
}
