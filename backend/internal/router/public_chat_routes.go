// POST /api/chat/ask — ยังไม่ใช้ (เปิดเมื่อมี DB ใน routes.go)
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
)

func RegisterPublicChat(app *fiber.App) {
	chatHandler := api.NewChatHandler()
	app.Post("/api/chat/ask", chatHandler.Ask)
}
