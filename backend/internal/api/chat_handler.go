package api

import (
	"bufio"
	"os"
	"strings"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/chatconfig"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/constants"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/models"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/services"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/pkg/openrouter"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ChatHandler struct {
	llm            *openrouter.Client
	embedLLM       *openrouter.Client
	router         *services.QuestionRouterService
	wiki           *services.WikiService
	logService     *services.ActivityLogService
	historyService *services.ChatHistoryService
	retrieval      *services.RetrievalService
	intentRouter   *services.IntentRouterService
	budget         *services.DailyBudget
	rewrite        *services.QueryRewriteService
	streamPrompts  chatconfig.Prompts
}

// NewChatHandler constructs a ChatHandler with all RAG services wired up and
// preloads the streaming prompt templates (degrading to empty on load failure).
func NewChatHandler() *ChatHandler {
	h := &ChatHandler{
		llm:            openrouter.NewClient(),
		embedLLM:       openrouter.NewClient(),
		router:         services.NewQuestionRouterService(),
		wiki:           services.NewWikiService(),
		logService:     services.NewActivityLogService(),
		historyService: services.NewChatHistoryService(),
		retrieval:      services.NewRetrievalService(),
		intentRouter:   services.NewIntentRouterService(),
		budget:         services.NewDailyBudget(),
		rewrite:        services.NewQueryRewriteService(),
	}
	// Load the streaming prompt templates once; fall back to empty on failure
	// so the handler still constructs (streaming degrades, never crashes).
	if p, err := chatconfig.LoadPrompts(services.ConfigDir()); err == nil {
		h.streamPrompts = *p
	}
	return h
}

// Stream handles POST /api/chat/stream — the native NDJSON RAG flow.
func (h *ChatHandler) Stream(c *fiber.Ctx) error {
	req, err := parseStreamRequest(c)
	if err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeBadRequest, err.Error())
	}
	c.Set("Content-Type", "application/x-ndjson")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")

	deps := newStreamDepsFromHandler(
		h,
		config.AppConfig.Chat.DailyRequestLimit,
		config.AppConfig.Chat.MaxContextChars,
		config.AppConfig.Chat.MaxChunkContent,
		req.Model,
		config.AppConfig.LLM.FallbackModel,
		h.streamPrompts,
	)
	// reqCtx (*fasthttp.RequestCtx) is passed into streamFlow as the context.Context
	// for the LLM call. This is safe: fasthttp runs the body-stream writer in a
	// goroutine whose pipe the server drains synchronously before releasing the
	// ctx, so reqCtx stays live for the whole stream. It also gives us request-
	// scoped cancellation — when the client disconnects, reqCtx.Done() fires and
	// the in-flight LLM stream is cancelled (parity with Python's is_disconnected).
	reqCtx := c.Context()
	reqCtx.SetBodyStreamWriter(func(w *bufio.Writer) {
		streamFlow(reqCtx, req, deps, func(line string) {
			_, _ = w.WriteString(line)
			_ = w.Flush()
		})
	})
	return nil
}

// Image serves a wiki asset file for the given BU from local content, returning
// 404 when the path is missing or not a regular file.
func (h *ChatHandler) Image(c *fiber.Ctx) error {
	bu := strings.TrimSpace(c.Query("bu"))
	if bu == "" {
		bu = constants.DefaultBU
	}

	relPath := c.Params("*")
	if relPath == "" {
		return c.SendStatus(fiber.StatusNotFound)
	}

	fullPath, pathErr := h.wiki.GetLocalAssetPath(bu, relPath)
	if pathErr == nil {
		if st, err := os.Stat(fullPath); err == nil && !st.IsDir() {
			return c.SendFile(fullPath)
		}
	}

	return c.SendStatus(fiber.StatusNotFound)
}

// Ask handles POST /api/chat/ask — runs askFlow and returns the JSON answer, or an
// error response with empty answer/sources on failure.
func (h *ChatHandler) Ask(c *fiber.Ctx) error {
	resp, status, err := h.askFlow(c)
	if err != nil {
		code := response.CodeInternal
		if status == fiber.StatusBadRequest {
			code = response.CodeBadRequest
		}
		return response.Fail(c, status, code, err.Error())
	}
	return response.OK(c, resp)
}

// Feedback handles POST /api/chat/feedback/:message_id — records a thumbs-up/down
// score for the given message, scoped to the requesting user.
func (h *ChatHandler) Feedback(c *fiber.Ctx) error {
	messageID, err := uuid.Parse(c.Params("message_id"))
	if err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidMessageID, "invalid message_id")
	}
	var body struct {
		Score    int    `json:"score"`
		BU       string `json:"bu"`
		Username string `json:"username"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, "invalid body")
	}
	if body.Score != 1 && body.Score != -1 {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidScore, "score must be 1 or -1")
	}
	buID, err := h.historyService.GetBUIDFromSlug(strings.TrimSpace(body.BU))
	if err != nil || buID == uuid.Nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeBUNotFound, "unknown bu")
	}
	userID := services.HashUserID(body.Username, config.AppConfig.Server.PrivacySecret)
	if err := h.historyService.UpdateFeedback(buID, messageID, userID, body.Score); err != nil {
		return response.Fail(c, fiber.StatusNotFound, response.CodeFeedbackTargetNotFound, "feedback target not found")
	}
	return response.OK(c, models.StatusResult{Status: "ok"})
}

// ClearRoom handles DELETE /api/chat/clear/:room_id. Chat history is owned by the
// frontend (localStorage passed in each /stream call); there is no server-side room
// state to clear, so this acknowledges the clear with a simple ok response.
func (h *ChatHandler) ClearRoom(c *fiber.Ctx) error {
	return response.OK(c, models.ClearResult{Status: "ok", RoomID: c.Params("room_id")})
}

// IntentTest is an admin endpoint that exposes the intent classification pipeline
// for offline testing and debugging. POST body: { "message": "...", "lang": "th", "have_history": false }.
func (h *ChatHandler) IntentTest(c *fiber.Ctx) error {
	var req struct {
		Message     string `json:"message"`
		Lang        string `json:"lang"`
		HaveHistory bool   `json:"have_history"`
	}
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Message) == "" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeMissingParam, "message is required")
	}
	if req.Lang == "" {
		req.Lang = "th"
	}
	r := h.intentRouter.Classify(req.Message, req.Lang, req.HaveHistory)
	return response.OK(c, models.IntentTestResult{
		Type:            r.Type,
		Source:          r.Source,
		CannedResponse:  r.CannedResponse,
		EmbedTokens:     r.EmbedTokens,
		LLMInputTokens:  r.LLMInputTokens,
		LLMOutputTokens: r.LLMOutputTokens,
	})
}
