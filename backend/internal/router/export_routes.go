package router

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/new-carmen/backend/internal/api"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/export"
)

// RegisterExport wires POST /api/export/pdf. The endpoint is public (the chat
// widget is anonymous) but rate-limited; it returns 503 when Gotenberg is not
// configured (GOTENBERG_URL empty).
func RegisterExport(app *fiber.App) {
	h := &api.ExportHandler{
		Deps: export.Deps{
			IsSafe: export.IsURLSafe,
			Fetch: func(ctx context.Context, u string) ([]byte, string, error) {
				return export.SafeFetch(ctx, u, 0)
			},
		},
	}
	if config.AppConfig != nil {
		h.ImageBaseURL = config.AppConfig.Export.ImageBaseURL
		if url := config.AppConfig.Export.GotenbergURL; url != "" {
			h.Renderer = export.NewGotenbergClient(url)
		}
	}

	exportLimiter := limiter.New(limiter.Config{Max: 10, Expiration: time.Minute})
	app.Post("/api/export/pdf", exportLimiter, h.PDF)
}
