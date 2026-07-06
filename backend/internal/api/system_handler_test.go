package api

import (
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/middleware"
	"github.com/gofiber/fiber/v2"
)

func systemResetApp(t *testing.T) *fiber.App {
	t.Helper()
	if err := config.Load(); err != nil {
		t.Skipf("config load failed: %v", err)
	}
	config.AppConfig.Server.AdminAPIKey = "test-admin-key"
	app := fiber.New()
	h := NewSystemHandler()
	app.Post("/api/system/reset", middleware.RequireAdminKey, h.Reset)
	return app
}

func TestSystemReset_AuthAndConfirm(t *testing.T) {
	app := systemResetApp(t)

	// 401 without key
	r1 := httptest.NewRequest("POST", "/api/system/reset", strings.NewReader(`{"confirm":"RESET-CHAT-LOGS"}`))
	r1.Header.Set("Content-Type", "application/json")
	resp1, err := app.Test(r1, -1)
	if err != nil {
		t.Fatalf("req: %v", err)
	}
	if resp1.StatusCode != 401 {
		t.Fatalf("no key: status = %d, want 401", resp1.StatusCode)
	}

	// 400 wrong confirm
	r2 := httptest.NewRequest("POST", "/api/system/reset", strings.NewReader(`{"confirm":"nope"}`))
	r2.Header.Set("Content-Type", "application/json")
	r2.Header.Set("X-Admin-Key", "test-admin-key")
	resp2, err := app.Test(r2, -1)
	if err != nil {
		t.Fatalf("req: %v", err)
	}
	if resp2.StatusCode != 400 {
		t.Fatalf("wrong confirm: status = %d, want 400", resp2.StatusCode)
	}
}

// TestSystemReset_DBGated TRUNCATEs chat_history + activity_logs for ALL BUs.
// Double-gated so it can never fire against a shared/real DB by accident.
func TestSystemReset_DBGated(t *testing.T) {
	if os.Getenv("RUN_DB_TESTS") != "1" || os.Getenv("RUN_DESTRUCTIVE_TESTS") != "1" {
		t.Skip("set RUN_DB_TESTS=1 AND RUN_DESTRUCTIVE_TESTS=1 — this wipes chat_history + activity_logs")
	}
	app := systemResetApp(t)
	if err := database.Connect(); err != nil {
		t.Skipf("DB unreachable: %v", err)
	}
	database.DB.Exec(`INSERT INTO public.activity_logs (action, category) VALUES ('t', 'test')`)

	req := httptest.NewRequest("POST", "/api/system/reset", strings.NewReader(`{"confirm":"RESET-CHAT-LOGS"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Key", "test-admin-key")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("req: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("reset: status = %d, want 200", resp.StatusCode)
	}

	var n int
	database.DB.Raw(`SELECT count(*) FROM public.activity_logs`).Scan(&n)
	if n != 0 {
		t.Fatalf("activity_logs should be empty, got %d", n)
	}
}
