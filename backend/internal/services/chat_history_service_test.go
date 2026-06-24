package services

import (
	"testing"

	"github.com/google/uuid"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"
)

func TestUpdateFeedback(t *testing.T) {
	// DB-gated: skip when RUN_DB_TESTS != "1" or DB is unreachable.
	dbAvailable(t)

	svc := NewChatHistoryService()

	// Seed a known BU so the test runs on a fresh DB (no carmen row otherwise).
	database.DB.Exec(`INSERT INTO public.business_units (name, slug) VALUES ('Carmen', 'carmen') ON CONFLICT (slug) DO NOTHING`)

	// Resolve a known BU id (use "carmen" slug which now exists in the test DB).
	buID, err := svc.GetBUIDFromSlug("carmen")
	if err != nil || buID == uuid.Nil {
		t.Skipf("BU 'carmen' not found — cannot run UpdateFeedback test: %v", err)
	}

	// Insert a synthetic chat_history row with a minimal embedding.
	fakeEmb := make([]float32, 1536)
	msgID, err := svc.SaveWithID(buID, "test-user-feedback", "feedback question?", "feedback answer", nil, fakeEmb)
	if err != nil {
		t.Fatalf("SaveWithID: %v", err)
	}

	// Derive the hashed user_id the same way SaveWithID does.
	secret := ""
	if config.AppConfig != nil {
		secret = config.AppConfig.Server.PrivacySecret
	}
	hashedUID := HashUserID("test-user-feedback", secret)

	// Call UpdateFeedback with score=1.
	if err := svc.UpdateFeedback(buID, msgID, hashedUID, 1); err != nil {
		t.Fatalf("UpdateFeedback: %v", err)
	}

	// Read back metrics->>'feedback' and verify it equals "1".
	var got string
	if err := database.DB.Raw(
		`SELECT metrics->>'feedback' FROM public.chat_history WHERE id = ?`, msgID,
	).Scan(&got).Error; err != nil {
		t.Fatalf("reading metrics: %v", err)
	}
	if got != "1" {
		t.Errorf("expected metrics->>'feedback' = '1', got %q", got)
	}

	// Cleanup.
	database.DB.Exec("DELETE FROM public.chat_history WHERE id = ?", msgID)
}
