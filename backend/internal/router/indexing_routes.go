// /api/indexing (load-github, index-all) admin — ยังไม่ใช้ (เปิดเมื่อมี DB ใน routes.go)
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
	"github.com/new-carmen/backend/internal/middleware"
)

func RegisterIndexing(apiGroup fiber.Router) {
	indexingHandler := api.NewIndexingHandler()
	indexing := apiGroup.Group("/indexing", middleware.RoleMiddleware("admin", "superadmin"))
	indexing.Post("/load-github", indexingHandler.LoadFromGitHub)
	indexing.Post("/index-all", indexingHandler.IndexAll)
}
