// POST /api/chat/ask — บอทถามตอบจาก pgvector + Ollama
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
)

func RegisterPublicChat(app *fiber.App) {
	chatHandler := api.NewChatHandler()

	// Direct routes (Go Backend handles these)
	app.Post("/api/chat/ask", chatHandler.Ask)
	app.Post("/api/chat/route-test", chatHandler.RouteOnly)

	// Proxy routes (Forwarded to Python Chatbot)
	app.Get("/api/chat/rooms/:bu/:username", chatHandler.Proxy)
	app.Post("/api/chat/rooms", chatHandler.Proxy)
	app.Delete("/api/chat/rooms/:room_id", chatHandler.Proxy)
	app.Get("/api/chat/room-history/:room_id", chatHandler.Proxy)
	app.Delete("/api/chat/history", chatHandler.Proxy)
	app.Delete("/api/chat/clear/:room_id", chatHandler.Proxy)
	app.Post("/api/chat/stream", chatHandler.Proxy)
	app.Post("/api/chat/feedback/:message_id", chatHandler.Proxy)

	// Image routing (Forwarded to Python Chatbot)
	app.Get("/images/*", chatHandler.Proxy)
}
