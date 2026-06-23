package router

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestRegisterExport_RouteWired(t *testing.T) {
	app := fiber.New()
	RegisterExport(app) // GOTENBERG_URL unset in tests → nil renderer
	// missing html → 400 (route exists, handler runs)
	req := httptest.NewRequest("POST", "/api/export/pdf", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	if resp.StatusCode != 400 {
		t.Errorf("status = %d want 400 (route wired, empty html)", resp.StatusCode)
	}
}
