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
	"github.com/google/uuid"
)

func indexResetApp(t *testing.T) *fiber.App {
	t.Helper()
	if err := config.Load(); err != nil {
		t.Skipf("config load failed: %v", err)
	}
	config.AppConfig.Server.AdminAPIKey = "test-admin-key"
	app := fiber.New()
	app.Use(middleware.BUContext())
	h := NewIndexingHandler()
	app.Post("/api/index/reset", middleware.RequireAdminKey, h.Reset)
	return app
}

func TestIndexReset_AuthAndConfirm(t *testing.T) {
	app := indexResetApp(t)

	// 401 without admin key
	r1 := httptest.NewRequest("POST", "/api/index/reset?bu=carmen", strings.NewReader(`{"confirm":"carmen"}`))
	r1.Header.Set("Content-Type", "application/json")
	resp1, err := app.Test(r1, -1)
	if err != nil {
		t.Fatalf("req: %v", err)
	}
	if resp1.StatusCode != 401 {
		t.Fatalf("no key: status = %d, want 401", resp1.StatusCode)
	}

	// 400 on confirm mismatch (with key)
	r2 := httptest.NewRequest("POST", "/api/index/reset?bu=carmen", strings.NewReader(`{"confirm":"nope"}`))
	r2.Header.Set("Content-Type", "application/json")
	r2.Header.Set("X-Admin-Key", "test-admin-key")
	resp2, err := app.Test(r2, -1)
	if err != nil {
		t.Fatalf("req: %v", err)
	}
	if resp2.StatusCode != 400 {
		t.Fatalf("bad confirm: status = %d, want 400", resp2.StatusCode)
	}

	// 400 for bu=all when confirm != "ALL"
	r3 := httptest.NewRequest("POST", "/api/index/reset?bu=all", strings.NewReader(`{"confirm":"all"}`))
	r3.Header.Set("Content-Type", "application/json")
	r3.Header.Set("X-Admin-Key", "test-admin-key")
	resp3, err := app.Test(r3, -1)
	if err != nil {
		t.Fatalf("req: %v", err)
	}
	if resp3.StatusCode != 400 {
		t.Fatalf("bu=all wrong confirm: status = %d, want 400", resp3.StatusCode)
	}
}

func TestIndexReset_DBGated(t *testing.T) {
	if os.Getenv("RUN_DB_TESTS") != "1" {
		t.Skip("set RUN_DB_TESTS=1 to run DB-backed tests")
	}
	app := indexResetApp(t)
	if err := database.Connect(); err != nil {
		t.Skipf("DB unreachable: %v", err)
	}
	const slug = "reset_test_bu"
	t.Cleanup(func() { database.DB.Exec(`DELETE FROM public.business_units WHERE slug = ?`, slug) })
	database.DB.Exec(`INSERT INTO public.business_units (slug, name) VALUES (?, 'Reset Test') ON CONFLICT (slug) DO NOTHING`, slug)
	var buID uuid.UUID
	if err := database.DB.Raw(`SELECT id FROM public.business_units WHERE slug = ?`, slug).Row().Scan(&buID); err != nil {
		t.Fatalf("bu_id: %v", err)
	}
	database.DB.Exec(`INSERT INTO public.documents (bu_id, path, title) VALUES (?, 'd.md', 'D')`, buID)

	req := httptest.NewRequest("POST", "/api/index/reset?bu="+slug, strings.NewReader(`{"confirm":"`+slug+`"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Key", "test-admin-key")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("req: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("reset: status = %d, want 200", resp.StatusCode)
	}

	var docs int
	database.DB.Raw(`SELECT count(*) FROM public.documents WHERE bu_id = ?`, buID).Scan(&docs)
	if docs != 0 {
		t.Fatalf("documents should be gone, got %d", docs)
	}
}
