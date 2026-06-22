package database

import (
	"os"
	"testing"

	"github.com/new-carmen/backend/internal/config"
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

	id, err := BUIDForSlug("carmen")
	if err != nil {
		t.Fatalf("BUIDForSlug(carmen) error: %v", err)
	}
	if id <= 0 {
		t.Fatalf("expected positive id for carmen, got %d", id)
	}

	missing, err := BUIDForSlug("no_such_bu_xyz")
	if err != nil {
		t.Fatalf("unknown slug should not error, got: %v", err)
	}
	if missing != 0 {
		t.Fatalf("expected 0 for unknown slug, got %d", missing)
	}

	if _, err := BUIDForSlug("bad-slug!!"); err == nil {
		t.Fatalf("expected error for invalid slug format")
	}
}
