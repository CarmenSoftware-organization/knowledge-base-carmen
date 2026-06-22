package api

import (
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
)

func TestProvisionDeprovision_NoSchema(t *testing.T) {
	if os.Getenv("RUN_DB_TESTS") != "1" {
		t.Skip("set RUN_DB_TESTS=1 to run DB-backed tests")
	}
	if err := config.Load(); err != nil {
		t.Skipf("config load failed: %v", err)
	}
	if err := database.Connect(); err != nil {
		t.Skipf("DB unreachable: %v", err)
	}

	const slug = "prov_test_bu"
	t.Cleanup(func() { database.DB.Exec(`DELETE FROM public.business_units WHERE slug = ?`, slug) })

	app := fiber.New()
	h := NewBusinessUnitHandler()
	app.Post("/prov", h.Provision)
	app.Post("/deprov", h.Deprovision)

	// Provision
	provReq := httptest.NewRequest("POST", "/prov",
		strings.NewReader(`{"slug":"prov_test_bu","name":"Prov"}`))
	provReq.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(provReq, -1)
	if err != nil {
		t.Fatalf("provision request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("provision status = %d, want 200", resp.StatusCode)
	}

	// BU row exists, and NO schema named after the slug was created.
	var buCount, schemaCount int
	database.DB.Raw(`SELECT count(*) FROM public.business_units WHERE slug = ?`, slug).Scan(&buCount)
	if buCount != 1 {
		t.Fatalf("expected 1 business_units row, got %d", buCount)
	}
	database.DB.Raw(`SELECT count(*) FROM information_schema.schemata WHERE schema_name = ?`, slug).Scan(&schemaCount)
	if schemaCount != 0 {
		t.Fatalf("provision must NOT create a schema, found %d", schemaCount)
	}

	// Seed one document, then deprovision and confirm cascade delete.
	var buID int
	database.DB.Raw(`SELECT id FROM public.business_units WHERE slug = ?`, slug).Scan(&buID)
	database.DB.Exec(`INSERT INTO public.documents (bu_id, path, title) VALUES (?, 'd.md', 'D')`, buID)

	deprovReq := httptest.NewRequest("POST", "/deprov",
		strings.NewReader(`{"slug":"prov_test_bu"}`))
	deprovReq.Header.Set("Content-Type", "application/json")
	resp2, err := app.Test(deprovReq, -1)
	if err != nil {
		t.Fatalf("deprovision request: %v", err)
	}
	defer resp2.Body.Close()
	if resp2.StatusCode != 200 {
		t.Fatalf("deprovision status = %d, want 200", resp2.StatusCode)
	}

	var afterBU, afterDocs int
	database.DB.Raw(`SELECT count(*) FROM public.business_units WHERE slug = ?`, slug).Scan(&afterBU)
	database.DB.Raw(`SELECT count(*) FROM public.documents WHERE bu_id = ?`, buID).Scan(&afterDocs)
	if afterBU != 0 {
		t.Fatalf("BU row should be deleted, got %d", afterBU)
	}
	if afterDocs != 0 {
		t.Fatalf("documents should cascade-delete, got %d", afterDocs)
	}
}
