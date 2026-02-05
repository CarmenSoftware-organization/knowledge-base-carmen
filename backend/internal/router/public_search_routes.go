// /api/search, popular, suggest — ยังไม่ใช้ (เปิดเมื่อมี DB ใน routes.go)
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
)

func RegisterPublicSearch(app *fiber.App) {
	searchHandler := api.NewSearchHandler()
	app.Post("/api/search", searchHandler.SearchPublic)
	app.Get("/api/search/popular", searchHandler.GetPopularSearches)
	app.Get("/api/search/suggest", searchHandler.GetSuggest)
}
