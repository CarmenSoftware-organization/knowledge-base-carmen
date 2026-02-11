// POST /api/index/rebuild — สั่ง reindex ทั้งก้อนเข้า documents + document_chunks
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
)

func RegisterIndexing(app *fiber.App) {
	indexingHandler := api.NewIndexingHandler()
	app.Post("/api/index/rebuild", indexingHandler.Rebuild)
}
