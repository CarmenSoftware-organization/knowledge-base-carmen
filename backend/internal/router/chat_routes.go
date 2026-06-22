package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
	"github.com/new-carmen/backend/internal/middleware"
)

func RegisterPublicChat(app *fiber.App) {
	chatHandler := api.NewChatHandler()

	app.Post("/api/chat/ask", chatHandler.Ask)
	app.Post("/api/chat/record-history", middleware.RequireInternalAPIKey, chatHandler.RecordHistory)
	app.Get("/api/chat/history/list", middleware.RequireAdminKey, chatHandler.ListHistory)
	app.Post("/api/chat/route-test", middleware.RequireAdminKey, chatHandler.RouteOnly)
	app.Post("/api/chat/intent-test", middleware.RequireAdminKey, chatHandler.IntentTest)

	app.Delete("/api/chat/clear/:room_id", chatHandler.ClearRoom)
	app.Post("/api/chat/stream", chatHandler.Stream)
	app.Post("/api/chat/feedback/:message_id", chatHandler.Feedback)

	app.Get("/images/*", chatHandler.Image)
}
