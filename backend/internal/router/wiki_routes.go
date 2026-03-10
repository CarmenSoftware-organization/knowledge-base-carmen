package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
)


func RegisterWiki(app *fiber.App) {
	h := api.NewWikiHandler()
	app.Get("/api/wiki/list", h.List)
	app.Get("/api/wiki/categories", h.ListCategories)
	app.Get("/api/wiki/category/:slug", h.GetCategory)
	app.Get("/api/wiki/content/*", h.GetContent)
	app.Get("/api/wiki/search", h.Search)
	app.Post("/api/wiki/sync", h.Sync)
	app.Get("/wiki-assets/*", func(c *fiber.Ctx) error {
		bu := c.Query("bu")
		if bu == "" {
			bu = "carmen"
		}
		
		relPath := c.Params("*")
		if relPath == "" {
			return c.SendStatus(fiber.StatusNotFound)
		}
		
		wikiSvc := h.GetWikiService()
		fullPath := wikiSvc.GetLocalAssetPath(bu, relPath)
		return c.SendFile(fullPath)
	})
}
