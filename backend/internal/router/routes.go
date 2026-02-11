// ลงทะเบียน route ทั้งหมด — ใช้อยู่ 
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/middleware"
)

func SetupRoutes(app *fiber.App) {
	app.Use(middleware.Logger())
	app.Use(middleware.CORS())

	// Public (ไม่ใช้ DB)
	RegisterHealth(app)
	RegisterPublicSystem(app)
	RegisterWiki(app)    // อ่านจาก repo wiki-content (local หรือ GitHub)
	RegisterWebhook(app)   // เมื่อมี push ที่ wiki-content → git pull + index อัตโนมัติ
	RegisterIndexing(app)  // POST /api/index/rebuild — กด reindex เองได้
	RegisterPublicChat(app) // POST /api/chat/ask
}
