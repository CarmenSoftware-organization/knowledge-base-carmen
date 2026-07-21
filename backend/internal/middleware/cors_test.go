package middleware

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
	"github.com/gofiber/fiber/v2"
)

// TestCORS_AllowsAdminKeyHeader guards the browser admin console: a cross-origin
// preflight (OPTIONS) requesting the custom X-Admin-Key header must be allowed,
// otherwise the browser blocks the real GET/POST and the console can't
// authenticate. Regression test for the admin console being the first browser
// client to send X-Admin-Key.
func TestCORS_AllowsAdminKeyHeader(t *testing.T) {
	if err := config.Load(); err != nil {
		t.Skipf("config load failed: %v", err)
	}
	config.AppConfig.Server.CORSOrigins = "http://localhost:3302"

	app := fiber.New()
	app.Use(CORS())
	app.Get("/x", func(c *fiber.Ctx) error { return c.SendStatus(200) })

	req := httptest.NewRequest("OPTIONS", "/x", nil)
	req.Header.Set("Origin", "http://localhost:3302")
	req.Header.Set("Access-Control-Request-Method", "GET")
	req.Header.Set("Access-Control-Request-Headers", "X-Admin-Key")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("preflight request: %v", err)
	}
	allow := resp.Header.Get("Access-Control-Allow-Headers")
	if !strings.Contains(allow, "X-Admin-Key") {
		t.Fatalf("Access-Control-Allow-Headers = %q, must include X-Admin-Key", allow)
	}
}
