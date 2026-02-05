// ลงทะเบียน route ทั้งหมด — ใช้อยู่ (ลงแค่ Health + System status เมื่อปิด DB)
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/middleware"
)

func SetupRoutes(app *fiber.App) {
	// Global middleware
	app.Use(middleware.Logger())
	app.Use(middleware.CORS())

	// Public (ไม่ใช้ DB)
	RegisterHealth(app)
	RegisterPublicSystem(app)
	RegisterWiki(app)   // อ่านจาก repo wiki-content (local หรือ GitHub)
	RegisterWebhook(app) // เมื่อมี push ที่ wiki-content → git pull + index Chroma อัตโนมัติ

	// --- ปิดไว้เมื่อยังไม่มี DB/role (เปิดเมื่อ config DB แล้ว — ต้องเปิดใน cmd/server/main.go ด้วย) ---
	// RegisterAuth(app)
	// RegisterPublicSearch(app)
	// RegisterPublicCategories(app)
	// RegisterPublicArticles(app)
	// RegisterPublicChat(app)
	// apiGroup := app.Group("/api", middleware.AuthMiddleware())
	// RegisterDocuments(apiGroup)
	// RegisterSearchProtected(apiGroup)
	// RegisterIndexing(apiGroup)
	// RegisterAdmin(apiGroup)
}
