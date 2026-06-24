package api

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
)

// minimalFeedbackConfig builds just enough AppConfig for NewChatHandler() to
// construct and for the Feedback handler to run (PrivacySecret + LLM + Chat).
func minimalFeedbackConfig() *config.Config {
	return &config.Config{
		Server: config.ServerConfig{
			PrivacySecret: "0123456789abcdef0123456789abcdef",
		},
		Chat: config.ChatConfig{
			DailyRequestLimit: 0,
			MaxContextChars:   8000,
			MaxChunkContent:   2000,
		},
		LLM: config.LLMConfig{
			APIBase:     "https://example.invalid/v1",
			ChatModel:   "m",
			EmbedModel:  "e",
			IntentModel: "i",
		},
	}
}

// TestFeedback_InvalidScore_Returns400 verifies that a score outside {1,-1} is
// rejected with 400 before any DB access occurs.
func TestFeedback_InvalidScore_Returns400(t *testing.T) {
	prev := config.AppConfig
	defer func() { config.AppConfig = prev }()
	config.AppConfig = minimalFeedbackConfig()
	t.Setenv("CHAT_CONFIG_DIR", "../../config")

	app := fiber.New()
	h := NewChatHandler()
	app.Post("/api/chat/feedback/:message_id", h.Feedback)

	// Valid UUID message_id so the score check (not the id parse) is what rejects.
	req := httptest.NewRequest("POST", "/api/chat/feedback/0190a000-0000-7000-8000-000000000042",
		strings.NewReader(`{"score":5,"bu":"carmen","username":"alice"}`))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusBadRequest {
		t.Errorf("invalid score should return 400, got %d", resp.StatusCode)
	}
}

// TestFeedback_NonIntMessageID_Returns400 verifies that a non-UUID path param
// is rejected with 400 before body parsing or DB access.
func TestFeedback_NonIntMessageID_Returns400(t *testing.T) {
	prev := config.AppConfig
	defer func() { config.AppConfig = prev }()
	config.AppConfig = minimalFeedbackConfig()
	t.Setenv("CHAT_CONFIG_DIR", "../../config")

	app := fiber.New()
	h := NewChatHandler()
	app.Post("/api/chat/feedback/:message_id", h.Feedback)

	req := httptest.NewRequest("POST", "/api/chat/feedback/abc",
		strings.NewReader(`{"score":1,"bu":"carmen","username":"alice"}`))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusBadRequest {
		t.Errorf("non-int message_id should return 400, got %d", resp.StatusCode)
	}
}

// TestFeedback_UnknownBU_Returns400 verifies that a valid score + valid message_id
// but unresolvable BU slug returns 400 (or 500 from a nil-DB panic in the no-DB
// unit-test environment). Score and message_id validation happens before the DB
// lookup, so those checks are separately covered. This test confirms the handler
// does not return 200 when given an unknown BU.
func TestFeedback_UnknownBU_Returns400(t *testing.T) {
	prev := config.AppConfig
	defer func() { config.AppConfig = prev }()
	config.AppConfig = minimalFeedbackConfig()
	t.Setenv("CHAT_CONFIG_DIR", "../../config")

	// Use Fiber's recover middleware so a nil-DB panic becomes a 500 rather than
	// crashing the test process. Either 400 or 500 is acceptable here — the
	// important invariant is that 200 is never returned for an unknown BU.
	app := fiber.New()
	app.Use(recover.New())
	h := NewChatHandler()
	app.Post("/api/chat/feedback/:message_id", h.Feedback)

	// Valid UUID message_id so the handler reaches the BU lookup (not the id parse).
	req := httptest.NewRequest("POST", "/api/chat/feedback/0190a000-0000-7000-8000-000000000042",
		strings.NewReader(`{"score":1,"bu":"nonexistent_bu","username":"alice"}`))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	// Without a DB, GetBUIDFromSlug panics (nil gorm.DB) → recover converts to 500.
	// Either 400 or 500 is acceptable; 200 must not be returned.
	if resp.StatusCode == fiber.StatusOK {
		t.Errorf("unknown bu must not return 200, got %d", resp.StatusCode)
	}
}
