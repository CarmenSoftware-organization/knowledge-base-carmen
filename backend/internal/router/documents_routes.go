package router

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api"
	"github.com/gofiber/fiber/v2"
)

// RegisterDocuments wires the GET /api/documents indexed-documents listing route.
func RegisterDocuments(app *fiber.App) {
	docHandler := api.NewDocumentsHandler()
	app.Get("/api/documents", docHandler.List)
}
