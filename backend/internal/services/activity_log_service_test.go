package services

import (
	"os"
	"testing"

	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
)

func mustConnectServices(t *testing.T) {
	t.Helper()
	if os.Getenv("RUN_DB_TESTS") != "1" {
		t.Skip("set RUN_DB_TESTS=1 to run DB-backed tests")
	}
	if err := config.Load(); err != nil {
		t.Skipf("config load failed: %v", err)
	}
	if err := database.Connect(); err != nil {
		t.Skipf("DB unreachable: %v", err)
	}
}

func TestActivityLogDoubleLog_NoPKCollision(t *testing.T) {
	mustConnectServices(t)

	const testSlug = "test_activity_log_pk"

	// Seed a test business unit
	database.DB.Exec(
		`INSERT INTO public.business_units (name, slug) VALUES (?, ?) ON CONFLICT (slug) DO NOTHING`,
		testSlug, testSlug,
	)
	t.Cleanup(func() {
		database.DB.Exec(`DELETE FROM public.business_units WHERE slug = ?`, testSlug)
	})

	// Look up the BU ID so we can query activity_logs after cleanup sets bu_id NULL
	var buID string
	database.DB.Raw(`SELECT id FROM public.business_units WHERE slug = ?`, testSlug).Scan(&buID)
	if buID == "" {
		t.Fatalf("seeded BU not found for slug %q", testSlug)
	}

	svc := NewActivityLogService()

	// First Log call
	if err := svc.Log(testSlug, "u", "act", "cat", nil, ""); err != nil {
		t.Fatalf("first Log call failed: %v", err)
	}

	// Second Log call — must NOT collide on PK
	if err := svc.Log(testSlug, "u", "act", "cat", nil, ""); err != nil {
		t.Fatalf("second Log call failed (PK collision?): %v", err)
	}

	// Verify two distinct rows exist for the test BU (query before cleanup)
	var count int64
	database.DB.Raw(`
		SELECT count(*) FROM public.activity_logs al
		JOIN public.business_units bu ON bu.id = al.bu_id
		WHERE bu.slug = ?
	`, testSlug).Scan(&count)

	if count != 2 {
		t.Fatalf("expected 2 activity_log rows for slug %q, got %d", testSlug, count)
	}
}
