package api

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
)

// TestClearRoom_ReturnsOK verifies DELETE /api/chat/clear/:room_id returns 200
// with {"status":"ok","room_id":"r1"} (history is frontend-owned; no server state).
func TestClearRoom_ReturnsOK(t *testing.T) {
	prev := config.AppConfig
	defer func() { config.AppConfig = prev }()
	config.AppConfig = minimalFeedbackConfig()
	t.Setenv("CHAT_CONFIG_DIR", "../../config")

	app := fiber.New()
	h := NewChatHandler()
	app.Delete("/api/chat/clear/:room_id", h.ClearRoom)

	req := httptest.NewRequest("DELETE", "/api/chat/clear/r1", nil)

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("clear should return 200, got %d", resp.StatusCode)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body["status"] != "ok" {
		t.Errorf(`expected status "ok", got %v`, body["status"])
	}
	if body["room_id"] != "r1" {
		t.Errorf(`expected room_id "r1", got %v`, body["room_id"])
	}
}
