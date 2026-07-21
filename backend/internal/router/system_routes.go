package router

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/middleware"
	"github.com/gofiber/fiber/v2"
)

// RegisterSystem wires the admin-only POST /api/system/reset route (clears
// chat history + activity logs).
func RegisterSystem(app *fiber.App) {
	h := api.NewSystemHandler()
	app.Post("/api/system/reset", middleware.RequireAdminKey, h.Reset)
}
