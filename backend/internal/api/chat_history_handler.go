package api

import (
	"log"
	"strconv"
	"strings"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/middleware"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/models"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// RecordHistory persists an externally-supplied Q&A to chat history (embedding the
// question), returning the new row id; it is a no-op when history is disabled.
func (h *ChatHandler) RecordHistory(c *fiber.Ctx) error {
	var req models.RecordHistoryRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, "invalid request body")
	}
	bu := strings.TrimSpace(req.BU)
	q := strings.TrimSpace(req.Question)
	a := strings.TrimSpace(req.Answer)
	if bu == "" || q == "" || a == "" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeMissingParam, "bu, question, answer required")
	}

	if !config.AppConfig.Chat.HistoryEnabled {
		return response.OK(c, models.RecordHistoryResult{Skipped: "history disabled"})
	}

	buID, err := h.historyService.GetBUIDFromSlug(bu)
	if err != nil || buID == uuid.Nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBU, "invalid bu: "+bu)
	}

	emb, err := h.embedLLM.Embedding(q)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeEmbeddingFailed, "embedding failed: "+err.Error())
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
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, models.RecordHistoryResult{ID: id.String()})
}

// ListHistory returns a paginated list of chat history entries for the request BU
// (limit capped at 100) along with the total count.
func (h *ChatHandler) ListHistory(c *fiber.Ctx) error {
	bu := middleware.GetBU(c)
	buID, err := h.historyService.GetBUIDFromSlug(bu)
	if err != nil || buID == uuid.Nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBU, "invalid bu")
	}
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	if limit > 100 {
		limit = 100
	}
	entries, total, err := h.historyService.List(buID, limit, offset)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	if entries == nil {
		entries = []services.ListEntry{}
	}
	return response.List(c, entries, &response.Meta{
		Total:  response.IntPtr(int(total)),
		Limit:  response.IntPtr(limit),
		Offset: response.IntPtr(offset),
	})
}

// RouteOnly runs only the question router and returns its raw routing result
// (candidates) without retrieval or answer generation.
func (h *ChatHandler) RouteOnly(c *fiber.Ctx) error {
	var req models.ChatAskRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, "invalid request body")
	}
	q := strings.TrimSpace(req.Question)
	if q == "" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeMissingParam, "question is required")
	}

	res, err := h.router.RouteQuestion(q)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, res)
}
