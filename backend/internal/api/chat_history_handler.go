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

	id, err := h.historyService.SaveWithID(buID, userID, q, a, sources, emb)
	if err != nil {
		log.Printf("[chat] record-history save failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true, "id": id})
}

func (h *ChatHandler) ListHistory(c *fiber.Ctx) error {
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
