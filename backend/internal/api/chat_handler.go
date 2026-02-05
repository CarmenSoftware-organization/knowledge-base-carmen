// POST /api/chat/ask — ยังไม่ใช้ (เปิดเมื่อมี DB)
package api

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/services"
)

type ChatHandler struct {
	searchService *services.SearchService
}

func NewChatHandler() *ChatHandler {
	return &ChatHandler{searchService: services.NewSearchService()}
}

// Ask POST /api/chat/ask
func (h *ChatHandler) Ask(c *fiber.Ctx) error {
	var req models.ChatAskRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Question == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "question is required"})
	}
	answer, sources, err := h.searchService.ChatAsk(req.Question)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   err.Error(),
			"answer":  "",
			"sources": []models.ChatSource{},
		})
	}
	return c.JSON(models.ChatAskResponse{
		Answer:  answer,
		Sources: sources,
	})
}
