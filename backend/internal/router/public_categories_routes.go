// /api/categories — ยังไม่ใช้ (เปิดเมื่อมี DB ใน routes.go)
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
)

func RegisterPublicCategories(app *fiber.App) {
	catHandler := api.NewCategoriesHandler()
	app.Get("/api/categories", catHandler.List)
	app.Get("/api/categories/:categoryId", catHandler.GetByID)
	app.Get("/api/categories/:categoryId/articles", catHandler.ListArticles)
}
