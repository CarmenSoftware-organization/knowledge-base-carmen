package routertest

import (
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/router"
)

func TestHealthRoute(t *testing.T) {
	app := fiber.New()
	router.RegisterHealth(app)

	req := httptest.NewRequest("GET", "/health", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		t.Errorf("status = %d, want 200", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	if len(body) == 0 {
		t.Error("expected non-empty body")
	}
}

func TestWiki_GetCategory_EmptySlug(t *testing.T) {
	app := router.SetupTestApp()

	req := httptest.NewRequest("GET", "/api/wiki/category/?bu=carmen", nil)
	req.URL.Path = "/api/wiki/category/"
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 404 {
		t.Errorf("status = %d, want 404 (empty slug)", resp.StatusCode)
	}
}

func TestWiki_GetContent_EmptyPath(t *testing.T) {
	app := router.SetupTestApp()

	req := httptest.NewRequest("GET", "/api/wiki/content/?bu=carmen", nil)
	req.URL.Path = "/api/wiki/content/"
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 400 {
		t.Errorf("status = %d, want 400 (empty path)", resp.StatusCode)
	}
}

func TestWiki_Search_EmptyQuery(t *testing.T) {
	app := router.SetupTestApp()

	req := httptest.NewRequest("GET", "/api/wiki/search?q=&bu=carmen", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		t.Errorf("status = %d, want 200", resp.StatusCode)
	}
}

