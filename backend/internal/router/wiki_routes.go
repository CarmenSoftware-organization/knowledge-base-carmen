package router

import (
	"net/url"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
	"github.com/new-carmen/backend/internal/constants"
	"github.com/new-carmen/backend/internal/middleware"
)

func RegisterWiki(app *fiber.App) {
	h := api.NewWikiHandler()
	app.Get("/api/wiki/list", h.List)
	app.Get("/api/wiki/categories", h.ListCategories)
	app.Get("/api/wiki/sidebar", h.Sidebar)
	app.Get("/api/wiki/category/:slug", h.GetCategory)
	app.Get("/api/wiki/content/*", h.GetContent)
	app.Get("/api/wiki/search", h.Search)
	app.Post("/api/wiki/sync", middleware.RequireAdminKey, h.Sync)
	app.Get("/api/wiki/sync/audit", middleware.RequireAdminKey, h.SyncAudit)
	app.Get("/wiki-assets/*", func(c *fiber.Ctx) error {
		bu := c.Query("bu")
		if bu == "" {
			bu = constants.DefaultBU
		}

		relPath := c.Params("*")
		if relPath == "" {
			return c.SendStatus(fiber.StatusNotFound)
		}
		if dec, err := url.PathUnescape(relPath); err == nil {
			relPath = dec
		}

		wikiSvc := h.GetWikiService()
		fullPath, err := wikiSvc.GetLocalAssetPath(bu, relPath)
		if err != nil {
			return c.SendStatus(fiber.StatusNotFound)
		}
		return c.SendFile(fullPath)
	})
}
