package router

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api"
	"github.com/gofiber/fiber/v2"
)

// RegisterPublicSystem wires the public GET /api/system/status route.
func RegisterPublicSystem(app *fiber.App) {
	sysHandler := api.NewSystemHandler()
	app.Get("/api/system/status", sysHandler.Status)
}
