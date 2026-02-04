package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
	"github.com/new-carmen/backend/internal/middleware"
)

func SetupRoutes(app *fiber.App) {
	// Middleware
	app.Use(middleware.Logger())
	app.Use(middleware.CORS())

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
		})
	})

	// Auth routes (public)
	authHandler := api.NewAuthHandler()
	auth := app.Group("/api/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)

	// GitHub Webhook (public) - ใช้สำหรับ push event แล้วให้ backend index เอง
	githubWebhookHandler := api.NewGitHubWebhookHandler()
	app.Post("/webhook/github", githubWebhookHandler.HandlePush)

	// --- Public API (SRS Frontend) ไม่ต้อง login ---
	searchHandler := api.NewSearchHandler()
	app.Post("/api/search", searchHandler.SearchPublic)
	app.Get("/api/search/popular", searchHandler.GetPopularSearches)
	app.Get("/api/search/suggest", searchHandler.GetSuggest)

	catHandler := api.NewCategoriesHandler()
	app.Get("/api/categories", catHandler.List)
	app.Get("/api/categories/:categoryId", catHandler.GetByID)
	app.Get("/api/categories/:categoryId/articles", catHandler.ListArticles)

	articlesHandler := api.NewArticlesPublicHandler()
	app.Get("/api/articles/popular", articlesHandler.ListPopular)
	app.Get("/api/articles/recommended", articlesHandler.ListRecommended)
	app.Get("/api/articles/:articleId", articlesHandler.GetArticle)
	app.Get("/api/articles/:articleId/toc", articlesHandler.GetTOC)
	app.Get("/api/articles/:articleId/related", articlesHandler.GetRelated)
	app.Post("/api/articles/:articleId/feedback", articlesHandler.PostFeedback)

	chatHandler := api.NewChatHandler()
	app.Post("/api/chat/ask", chatHandler.Ask)

	sysHandler := api.NewSystemHandler()
	app.Get("/api/system/status", sysHandler.Status)

	// --- Protected routes (ต้อง login) ---
	apiGroup := app.Group("/api", middleware.AuthMiddleware())

	// Document routes
	docHandler := api.NewDocumentHandler()
	documents := apiGroup.Group("/documents")
	documents.Post("/", docHandler.CreateDocument)
	documents.Get("/:id", docHandler.GetDocument)
	documents.Put("/:id", docHandler.UpdateDocument)
	documents.Delete("/:id", docHandler.DeleteDocument)
	documents.Post("/:id/versions", docHandler.AddVersion)

	// Search routes (protected)
	search := apiGroup.Group("/search")
	search.Post("/analyze", searchHandler.AnalyzeClarity)
	search.Get("/", searchHandler.Search)
	search.Get("/context", searchHandler.SearchWithContext)

	// Indexing routes (admin only)
	indexingHandler := api.NewIndexingHandler()
	indexing := apiGroup.Group("/indexing", middleware.RoleMiddleware("admin", "superadmin"))
	indexing.Post("/load-github", indexingHandler.LoadFromGitHub)
	indexing.Post("/index-all", indexingHandler.IndexAll)

	// Admin routes
	_ = apiGroup.Group("/admin", middleware.RoleMiddleware("admin", "superadmin"))
	// Add admin routes here
}
