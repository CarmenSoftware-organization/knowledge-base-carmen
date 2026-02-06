// API ฝั่ง content docs ที่ frontend จะใช้
package api

import (
	"errors"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/services"
)

type WikiHandler struct {
	wikiService   *services.WikiService
	syncService   *services.WikiSyncService
}

func NewWikiHandler() *WikiHandler {
	return &WikiHandler{
		wikiService: services.NewWikiService(),
		syncService: services.NewWikiSyncService(),
	}
}

// List GET /api/wiki/list — รายการไฟล์ .md ทั้งหมด
func (h *WikiHandler) List(c *fiber.Ctx) error {
	entries, err := h.wikiService.ListMarkdown()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	if entries == nil {
		entries = []services.WikiEntry{}
	}
	return c.JSON(fiber.Map{
		"items": entries,
	})
}

// GetContent GET /api/wiki/content/* — เนื้อหาไฟล์ตาม path (เช่น content/docs/hello.md)
func (h *WikiHandler) GetContent(c *fiber.Ctx) error {
	pathParam := c.Params("*")
	if pathParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "path is required",
		})
	}
	content, err := h.wikiService.GetContent(pathParam)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(content)
}

// Sync POST /api/wiki/sync — รัน git pull (หรือ clone) อัปเดตโฟลเดอร์ wiki-content
func (h *WikiHandler) Sync(c *fiber.Ctx) error {
	if err := h.syncService.Sync(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(fiber.Map{"ok": true, "message": "synced"})
}
