// POST /api/chat/ask — บอทถามตอบจาก pgvector + Ollama
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
)

func RegisterPublicChat(app *fiber.App) {
	chatHandler := api.NewChatHandler()
	app.Post("/api/chat/ask", chatHandler.Ask)
	// debug/utility endpoint สำหรับทดสอบ OpenClaw question routing โดยไม่ยุ่งกับ DB/LLM
	app.Post("/api/chat/route-test", chatHandler.RouteOnly)
}

