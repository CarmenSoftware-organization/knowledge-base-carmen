package router

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"
	"github.com/gofiber/fiber/v2"
)

// RegisterHealth wires the GET /health liveness probe returning
// {"status":"ok","database":"up"|"down"}. It stays 200 when the DB is down:
// the server still serves wiki content (wiki-only mode).
func RegisterHealth(app *fiber.App) {
	app.Get("/health", func(c *fiber.Ctx) error {
		db := "up"
		if !database.Ready() {
			db = "down"
		}
		return c.JSON(fiber.Map{"status": "ok", "database": db})
	})
}
