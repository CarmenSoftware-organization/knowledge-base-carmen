// GET /api/wiki/list, GET /api/wiki/content/* — อ่านจาก repo wiki-content (ไม่ใช้ DB)
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
	"github.com/new-carmen/backend/internal/config"
)

func RegisterWiki(app *fiber.App) {
	wikiHandler := api.NewWikiHandler()
	app.Get("/api/wiki/list", wikiHandler.List)
	app.Get("/api/wiki/categories", wikiHandler.ListCategories)
	app.Get("/api/wiki/category/:slug", wikiHandler.GetCategory)
	app.Get("/api/wiki/content/*", wikiHandler.GetContent)
	// ใช้ path เดียวกับที่อ่าน markdown (จาก config) เพื่อให้ frontend โหลดรูปได้
	app.Static("/wiki-assets", config.GetWikiContentPath())
	app.Get("/api/wiki/search", wikiHandler.Search)
	app.Post("/api/wiki/sync", wikiHandler.Sync)
}
