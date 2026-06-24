package router

import (
	"github.com/gofiber/fiber/v2"
)

// RegisterHealth wires the GET /health liveness probe returning {"status":"ok"}.
func RegisterHealth(app *fiber.App) {
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})
}
