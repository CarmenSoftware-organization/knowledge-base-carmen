package api

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/proxy"
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
}

func NewChatHandler() *ChatHandler {
	return &ChatHandler{
		llm:            openrouter.NewClient(),
		embedLLM:       openrouter.NewClient(),
		router:         services.NewQuestionRouterService(),
		wiki:           services.NewWikiService(),
		logService:     services.NewActivityLogService(),
		historyService: services.NewChatHistoryService(),
	}
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
