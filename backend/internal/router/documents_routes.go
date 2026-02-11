// GET /api/documents — รายการเอกสารใน index (ให้ frontend โชว์)
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
)

func RegisterDocuments(app *fiber.App) {
	docHandler := api.NewDocumentsHandler()
	app.Get("/api/documents", docHandler.List)
}
