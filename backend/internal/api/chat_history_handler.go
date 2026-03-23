package api

import (
	"log"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/middleware"
	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/services"
)

// RecordHistory accepts Q&A from Python chatbot and saves to chat_history (with embedding).
// Called by carmen-chatbot after stream completes. POST /api/chat/record-history
func (h *ChatHandler) RecordHistory(c *fiber.Ctx) error {
	var req models.RecordHistoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	bu := strings.TrimSpace(req.BU)
	q := strings.TrimSpace(req.Question)
	a := strings.TrimSpace(req.Answer)
	if bu == "" || q == "" || a == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bu, question, answer required"})
	}

	if !config.AppConfig.Chat.HistoryEnabled {
		return c.JSON(fiber.Map{"ok": true, "skipped": "history disabled"})
	}

	buID, err := h.historyService.GetBUIDFromSlug(bu)
	if err != nil || buID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid bu: " + bu})
	}

	emb, err := h.embedLLM.Embedding(q)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "embedding failed: " + err.Error()})
	}

	rawUserID := req.UserID
	if rawUserID == "" {
		rawUserID = "anonymous"
	}
	userID := services.HashUserID(rawUserID, config.AppConfig.Server.PrivacySecret)

	sources := req.Sources
	if sources == nil {
		sources = []models.ChatSource{}
	}

	if err := h.historyService.Save(buID, userID, q, a, sources, emb); err != nil {
		log.Printf("[chat] record-history save failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true})
}

// ListHistory returns chat history for admin verification.
// GET /api/chat/history/list?bu=carmen&limit=10&offset=0
// Requires X-Admin-Key header matching ADMIN_API_KEY env var.
func (h *ChatHandler) ListHistory(c *fiber.Ctx) error {
	adminKey := config.AppConfig.Server.AdminAPIKey
	if adminKey == "" || c.Get("X-Admin-Key") != adminKey {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	bu := middleware.GetBU(c)
	buID, err := h.historyService.GetBUIDFromSlug(bu)
	if err != nil || buID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid bu"})
	}
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	if limit > 100 {
		limit = 100
	}
	entries, total, err := h.historyService.List(buID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"items":  entries,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// RouteOnly tests OpenClaw question routing without hitting the vector DB or LLM.
// POST /api/chat/route-test { "question": "..." }
func (h *ChatHandler) RouteOnly(c *fiber.Ctx) error {
	var req models.ChatAskRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	q := strings.TrimSpace(req.Question)
	if q == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "question is required"})
	}

	res, err := h.router.RouteQuestion(q)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(res)
}

