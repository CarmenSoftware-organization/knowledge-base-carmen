package routertest

import (
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/router"
)

func TestDocsRoutes_ScalarReplacesSwagger(t *testing.T) {
	app := fiber.New()
	router.RegisterDocs(app)

	// /openapi.json serves the embedded OpenAPI spec.
	resp, err := app.Test(httptest.NewRequest("GET", "/openapi.json", nil), -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Errorf("/openapi.json status = %d, want 200", resp.StatusCode)
	}
	if ct := resp.Header.Get("Content-Type"); !strings.Contains(ct, "json") {
		t.Errorf("/openapi.json Content-Type = %q, want json", ct)
	}
	if body, _ := io.ReadAll(resp.Body); !strings.Contains(string(body), "Knowledge base carmen API") {
		t.Errorf("/openapi.json missing spec title (got %d bytes)", len(body))
	}

	// /scalar serves the Scalar reference HTML pointing at /openapi.json.
	resp2, _ := app.Test(httptest.NewRequest("GET", "/scalar", nil), -1)
	defer resp2.Body.Close()
	if resp2.StatusCode != 200 {
		t.Errorf("/scalar status = %d, want 200", resp2.StatusCode)
	}
	body2, _ := io.ReadAll(resp2.Body)
	if !strings.Contains(string(body2), "@scalar/api-reference") || !strings.Contains(string(body2), `data-url="/openapi.json"`) {
		t.Errorf("/scalar missing Scalar script or data-url; got:\n%s", body2)
	}

	// /swagger redirects to /scalar (back-compat for old links).
	resp3, _ := app.Test(httptest.NewRequest("GET", "/swagger", nil), -1)
	defer resp3.Body.Close()
	if resp3.StatusCode != 302 {
		t.Errorf("/swagger status = %d, want 302", resp3.StatusCode)
	}
	if loc := resp3.Header.Get("Location"); loc != "/scalar" {
		t.Errorf("/swagger Location = %q, want /scalar", loc)
	}
}

func TestRootRoute_LandingPageLinksToDocs(t *testing.T) {
	app := fiber.New()
	router.RegisterRoot(app)

	req := httptest.NewRequest("GET", "/", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		t.Errorf("status = %d, want 200 (landing page, not a redirect)", resp.StatusCode)
	}
	if ct := resp.Header.Get("Content-Type"); !strings.Contains(ct, "text/html") {
		t.Errorf("Content-Type = %q, want text/html", ct)
	}
	body, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(body), `href="/scalar"`) {
		t.Errorf("body missing API docs link href=\"/scalar\"; got:\n%s", body)
	}
}

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

