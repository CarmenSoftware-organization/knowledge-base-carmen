package database

import (
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
)

func mustConnect(t *testing.T) {
	t.Helper()
	if os.Getenv("RUN_DB_TESTS") != "1" {
		t.Skip("set RUN_DB_TESTS=1 to run DB-backed tests")
	}
	if err := config.Load(); err != nil {
		t.Skipf("config load failed: %v", err)
	}
	if err := Connect(); err != nil {
		t.Skipf("DB unreachable: %v", err)
	}
}

func TestBUIDForSlug_KnownAndUnknown(t *testing.T) {
	mustConnect(t)

	// Seed a known BU so the resolver has something to find (fresh test DBs have
	// no BU rows). ON CONFLICT keeps an existing carmen row untouched.
	DB.Exec(`INSERT INTO public.business_units (name, slug) VALUES ('Carmen', 'carmen') ON CONFLICT (slug) DO NOTHING`)

	id, err := BUIDForSlug("carmen")
	if err != nil {
		t.Fatalf("BUIDForSlug(carmen) error: %v", err)
	}
	if id == uuid.Nil {
		t.Fatalf("expected non-nil id for carmen, got %s", id)
	}

	missing, err := BUIDForSlug("no_such_bu_xyz")
	if err != nil {
		t.Fatalf("unknown slug should not error, got: %v", err)
	}
	if missing != uuid.Nil {
		t.Fatalf("expected uuid.Nil for unknown slug, got %s", missing)
	}

	if _, err := BUIDForSlug("bad-slug!!"); err == nil {
		t.Fatalf("expected error for invalid slug format")
	}
}
