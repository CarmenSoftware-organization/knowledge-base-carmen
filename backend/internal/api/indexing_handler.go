// load-github, index-all (admin) — ยังไม่ใช้ (เปิดเมื่อมี DB)
package api

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/services"
)

type IndexingHandler struct {
	indexingService *services.IndexingService
}

func NewIndexingHandler() *IndexingHandler {
	return &IndexingHandler{
		indexingService: services.NewIndexingService(),
	}
}

func (h *IndexingHandler) LoadFromGitHub(c *fiber.Ctx) error {
	files, err := h.indexingService.LoadContentFromGitHub()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"files": files,
		"count": len(files),
	})
}

func (h *IndexingHandler) IndexAll(c *fiber.Ctx) error {
	if err := h.indexingService.IncrementalIndexing(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Indexing completed",
	})
}
