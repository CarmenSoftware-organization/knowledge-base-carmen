package api

import (
	"github.com/gofiber/fiber/v2"
	domain "github.com/new-carmen/backend/internal/domain"
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
	var req domain.ChatAskRequest
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
			"sources": []domain.ChatSource{},
		})
	}
	return c.JSON(domain.ChatAskResponse{
		Answer:  answer,
		Sources: sources,
	})
}
