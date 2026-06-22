package api

import (
	"bufio"
	"os"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/proxy"
	"github.com/new-carmen/backend/internal/chatconfig"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/constants"
	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/services"
	"github.com/new-carmen/backend/pkg/openrouter"
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
	dir := chatconfig.DefaultDir()
	if d := strings.TrimSpace(os.Getenv("CHAT_CONFIG_DIR")); d != "" {
		dir = d
	}
	if p, err := chatconfig.LoadPrompts(dir); err == nil {
		h.streamPrompts = *p
	}
	return h
}

// Stream handles POST /api/chat/stream. When native streaming is disabled it
// delegates to the Python proxy; otherwise it runs the native NDJSON flow.
func (h *ChatHandler) Stream(c *fiber.Ctx) error {
	if config.AppConfig == nil || !config.AppConfig.ChatNative.Stream {
		return h.Proxy(c)
	}
	req, err := parseStreamRequest(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
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

func (h *ChatHandler) Proxy(c *fiber.Ctx) error {
	chatbotURL := strings.TrimRight(strings.TrimSpace(config.AppConfig.Server.ChatbotURL), "/")
	if chatbotURL == "" {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error":   "chatbot_proxy_failed",
			"message": "PYTHON_CHATBOT_URL is not set; deploy the Python chatbot service and set this env on the Go backend.",
		})
	}

	target := chatbotURL + c.OriginalURL()

	if err := proxy.Do(c, target); err != nil {
		// Proxy failures often omit CORS on the error path → browser shows generic "Failed to fetch".
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error":   "chatbot_proxy_failed",
			"message": "Could not reach the chat service at PYTHON_CHATBOT_URL. Check that carmen-chatbot is deployed and the URL is correct.",
			"detail":  err.Error(),
		})
	}

	origin := c.Get("Origin")
	if origin != "" {
		c.Set("Access-Control-Allow-Origin", origin)
		c.Set("Access-Control-Allow-Credentials", "true")
	}

	return nil
}

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

	return h.Proxy(c)
}

func (h *ChatHandler) Ask(c *fiber.Ctx) error {
	resp, status, err := h.askFlow(c)
	if err != nil {
		return c.Status(status).JSON(fiber.Map{
			"error":   err.Error(),
			"answer":  "",
			"sources": []models.ChatSource{},
		})
	}
	return c.JSON(resp)
}

// Feedback handles POST /api/chat/feedback/:message_id. When the native flag is
// disabled it delegates to the Python proxy; otherwise it records a thumbs-up/down
// score for the given message, scoped to the requesting user.
func (h *ChatHandler) Feedback(c *fiber.Ctx) error {
	if config.AppConfig == nil || !config.AppConfig.ChatNative.Feedback {
		return h.Proxy(c)
	}
	messageID, err := strconv.ParseInt(c.Params("message_id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid message_id"})
	}
	var body struct {
		Score    int    `json:"score"`
		BU       string `json:"bu"`
		Username string `json:"username"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if body.Score != 1 && body.Score != -1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "score must be 1 or -1"})
	}
	buID, err := h.historyService.GetBUIDFromSlug(strings.TrimSpace(body.BU))
	if err != nil || buID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unknown bu"})
	}
	userID := services.HashUserID(body.Username, config.AppConfig.Server.PrivacySecret)
	if err := h.historyService.UpdateFeedback(buID, messageID, userID, body.Score); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "feedback target not found"})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}

// ClearRoom handles DELETE /api/chat/clear/:room_id. Chat history is owned by the
// frontend (localStorage passed in each /stream call); there is no server-side room
// state to clear. When the native flag is disabled it delegates to the Python proxy;
// otherwise it acknowledges the clear with a simple ok response.
func (h *ChatHandler) ClearRoom(c *fiber.Ctx) error {
	if config.AppConfig == nil || !config.AppConfig.ChatNative.Feedback {
		return h.Proxy(c)
	}
	return c.JSON(fiber.Map{"status": "ok", "room_id": c.Params("room_id")})
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
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "message is required"})
	}
	if req.Lang == "" {
		req.Lang = "th"
	}
	r := h.intentRouter.Classify(req.Message, req.Lang, req.HaveHistory)
	return c.JSON(fiber.Map{
		"type":              r.Type,
		"source":            r.Source,
		"canned_response":   r.CannedResponse,
		"embed_tokens":      r.EmbedTokens,
		"llm_input_tokens":  r.LLMInputTokens,
		"llm_output_tokens": r.LLMOutputTokens,
	})
}
