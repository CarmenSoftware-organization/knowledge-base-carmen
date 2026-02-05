// GET /api/wiki/list, GET /api/wiki/content/* — อ่านจาก repo wiki-content (ไม่ใช้ DB)
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
)

func RegisterWiki(app *fiber.App) {
	wikiHandler := api.NewWikiHandler()
	app.Get("/api/wiki/list", wikiHandler.List)
	app.Get("/api/wiki/content/*", wikiHandler.GetContent)
	app.Post("/api/wiki/sync", wikiHandler.Sync)
}
