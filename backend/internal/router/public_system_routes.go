// GET /api/system/status 
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
)

func RegisterPublicSystem(app *fiber.App) {
	sysHandler := api.NewSystemHandler()
	app.Get("/api/system/status", sysHandler.Status)
}
