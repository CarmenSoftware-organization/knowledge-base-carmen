package router

import (
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/new-carmen/backend/internal/api"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/middleware"
)

// parseRatePerMinute parses a "N/minute" string (slowapi format) into N.
// Falls back to 20 on anything unparseable or non-positive.
func parseRatePerMinute(s string) int {
	field := strings.TrimSpace(strings.SplitN(s, "/", 2)[0])
	if n, err := strconv.Atoi(field); err == nil && n > 0 {
		return n
	}
	return 20
}

func RegisterPublicChat(app *fiber.App) {
	chatHandler := api.NewChatHandler()

	// Per-IP rate limit on the public chat endpoints (parity with the Python
	// service's slowapi @limiter.limit(RATE_LIMIT_PER_MINUTE)). Caps unbounded
	// LLM/embedding spend from a single abusive client.
	rate := 20
	if config.AppConfig != nil {
		rate = parseRatePerMinute(config.AppConfig.Chat.RateLimitPerMin)
	}
	chatLimiter := limiter.New(limiter.Config{
		Max:        rate,
		Expiration: time.Minute,
	})

	app.Post("/api/chat/ask", chatLimiter, chatHandler.Ask)
	app.Post("/api/chat/record-history", middleware.RequireInternalAPIKey, chatHandler.RecordHistory)
	app.Get("/api/chat/history/list", middleware.RequireAdminKey, chatHandler.ListHistory)
	app.Post("/api/chat/route-test", middleware.RequireAdminKey, chatHandler.RouteOnly)
	app.Post("/api/chat/intent-test", middleware.RequireAdminKey, chatHandler.IntentTest)

	app.Delete("/api/chat/clear/:room_id", chatLimiter, chatHandler.ClearRoom)
	app.Post("/api/chat/stream", chatLimiter, chatHandler.Stream)
	app.Post("/api/chat/feedback/:message_id", chatLimiter, chatHandler.Feedback)

	app.Get("/images/*", chatHandler.Image)
}
