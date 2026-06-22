package api

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/config"
)

// minimalConfig installs just enough AppConfig for NewChatHandler() to
// construct (the openrouter client dereferences config.AppConfig.LLM) and for
// the Stream dispatch to read the native flag / chatbot URL.
func minimalConfig(nativeStream bool, chatbotURL string) *config.Config {
	return &config.Config{
		Server: config.ServerConfig{ChatbotURL: chatbotURL, PrivacySecret: "0123456789abcdef0123456789abcdef"},
		Chat:   config.ChatConfig{DailyRequestLimit: 0, MaxContextChars: 8000, MaxChunkContent: 2000},
		LLM:    config.LLMConfig{APIBase: "https://example.invalid/v1", ChatModel: "m", EmbedModel: "e", IntentModel: "i"},
		ChatNative: config.ChatNativeConfig{Stream: nativeStream},
	}
}

func TestStream_FlagOff_DelegatesToProxy(t *testing.T) {
	prev := config.AppConfig
	defer func() { config.AppConfig = prev }()
	// native off + no chatbot URL → Stream must call Proxy, which returns 502.
	config.AppConfig = minimalConfig(false, "")
	t.Setenv("CHAT_CONFIG_DIR", "../../config")

	app := fiber.New()
	h := NewChatHandler()
	app.Post("/api/chat/stream", h.Stream)

	req := httptest.NewRequest("POST", "/api/chat/stream", strings.NewReader(`{"text":"hi","bu":"carmen","username":"u","room_id":"r"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusBadGateway {
		t.Errorf("flag off should delegate to Proxy (502 with no chatbot URL), got %d", resp.StatusCode)
	}
}

func TestStream_FlagOn_SetsNDJSONContentType(t *testing.T) {
	prev := config.AppConfig
	defer func() { config.AppConfig = prev }()
	config.AppConfig = minimalConfig(true, "")
	t.Setenv("CHAT_CONFIG_DIR", "../../config")

	app := fiber.New()
	h := NewChatHandler()
	app.Post("/api/chat/stream", h.Stream)

	req := httptest.NewRequest("POST", "/api/chat/stream", strings.NewReader(`{"text":"hi","bu":"carmen","username":"u","room_id":"r"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()
	// Native path sets the NDJSON content type and does NOT return the proxy 502.
	if resp.StatusCode == fiber.StatusBadGateway {
		t.Fatal("flag on must NOT delegate to proxy")
	}
	if ct := resp.Header.Get("Content-Type"); !strings.Contains(ct, "application/x-ndjson") {
		t.Errorf("Content-Type = %q, want application/x-ndjson", ct)
	}
}

func TestStream_BadRequest_On_EmptyText(t *testing.T) {
	prev := config.AppConfig
	defer func() { config.AppConfig = prev }()
	config.AppConfig = minimalConfig(true, "")
	t.Setenv("CHAT_CONFIG_DIR", "../../config")

	app := fiber.New()
	h := NewChatHandler()
	app.Post("/api/chat/stream", h.Stream)

	req := httptest.NewRequest("POST", "/api/chat/stream", strings.NewReader(`{"text":"","bu":"carmen","username":"u","room_id":"r"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Errorf("empty text should be 400, got %d", resp.StatusCode)
	}
}
