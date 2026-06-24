package api

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
)

// minimalConfig installs just enough AppConfig for NewChatHandler() to
// construct (the openrouter client dereferences config.AppConfig.LLM) and for
// the native Stream handler to run.
func minimalConfig() *config.Config {
	return &config.Config{
		Server: config.ServerConfig{PrivacySecret: "0123456789abcdef0123456789abcdef"},
		Chat:   config.ChatConfig{DailyRequestLimit: 0, MaxContextChars: 8000, MaxChunkContent: 2000},
		LLM:    config.LLMConfig{APIBase: "https://example.invalid/v1", ChatModel: "m", EmbedModel: "e", IntentModel: "i"},
	}
}

func TestStream_FlagOn_SetsNDJSONContentType(t *testing.T) {
	prev := config.AppConfig
	defer func() { config.AppConfig = prev }()
	config.AppConfig = minimalConfig()
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
	config.AppConfig = minimalConfig()
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

// TestStream_RejectsInvalidBU verifies the SQL-injection guard (review finding #1):
// a bu that is not a valid schema slug is rejected with 400 before any SQL runs.
func TestStream_RejectsInvalidBU(t *testing.T) {
	prev := config.AppConfig
	defer func() { config.AppConfig = prev }()
	config.AppConfig = minimalConfig()
	t.Setenv("CHAT_CONFIG_DIR", "../../config")

	app := fiber.New()
	h := NewChatHandler()
	app.Post("/api/chat/stream", h.Stream)

	for _, badBU := range []string{`public.chat_history;--`, `x" OR 1=1`, `a b`, `1abc`} {
		body := `{"text":"hi","bu":` + jsonQuote(badBU) + `,"username":"u","room_id":"r"}`
		req := httptest.NewRequest("POST", "/api/chat/stream", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req, -1)
		if err != nil {
			t.Fatalf("app.Test(%q): %v", badBU, err)
		}
		if resp.StatusCode != fiber.StatusBadRequest {
			t.Errorf("bu=%q: status = %d, want 400 (invalid bu rejected)", badBU, resp.StatusCode)
		}
		resp.Body.Close()
	}
}

func jsonQuote(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}
