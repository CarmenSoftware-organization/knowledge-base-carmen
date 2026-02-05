// /api/documents (CRUD, versions) ต้อง login — ยังไม่ใช้ (เปิดเมื่อมี DB ใน routes.go)
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
)

func RegisterDocuments(apiGroup fiber.Router) {
	docHandler := api.NewDocumentHandler()
	documents := apiGroup.Group("/documents")
	documents.Post("/", docHandler.CreateDocument)
	documents.Get("/:id", docHandler.GetDocument)
	documents.Put("/:id", docHandler.UpdateDocument)
	documents.Delete("/:id", docHandler.DeleteDocument)
	documents.Post("/:id/versions", docHandler.AddVersion)
}
