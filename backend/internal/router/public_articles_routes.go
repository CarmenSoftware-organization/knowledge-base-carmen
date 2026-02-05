// /api/articles (popular, recommended, :id, toc, related, feedback) — ยังไม่ใช้ (เปิดเมื่อมี DB ใน routes.go)
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
)

func RegisterPublicArticles(app *fiber.App) {
	articlesHandler := api.NewArticlesPublicHandler()
	app.Get("/api/articles/popular", articlesHandler.ListPopular)
	app.Get("/api/articles/recommended", articlesHandler.ListRecommended)
	app.Get("/api/articles/:articleId", articlesHandler.GetArticle)
	app.Get("/api/articles/:articleId/toc", articlesHandler.GetTOC)
	app.Get("/api/articles/:articleId/related", articlesHandler.GetRelated)
	app.Post("/api/articles/:articleId/feedback", articlesHandler.PostFeedback)
}
