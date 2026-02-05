// /api/search (analyze, get, context) ต้อง login — ยังไม่ใช้ (เปิดเมื่อมี DB ใน routes.go)
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
)

func RegisterSearchProtected(apiGroup fiber.Router) {
	searchHandler := api.NewSearchHandler()
	search := apiGroup.Group("/search")
	search.Post("/analyze", searchHandler.AnalyzeClarity)
	search.Get("/", searchHandler.Search)
	search.Get("/context", searchHandler.SearchWithContext)
}
