package services

import (
	"os"
	"testing"

	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
)

// TestIndexing_WritesPublicTables verifies a manual upsert path writes bu_id and
// doc_id into the shared public tables and that ON CONFLICT (bu_id, path) updates
// rather than duplicates. It exercises the same SQL shape indexSingle uses.
func TestIndexing_WritesPublicTables(t *testing.T) {
	if os.Getenv("RUN_DB_TESTS") != "1" {
		t.Skip("set RUN_DB_TESTS=1 to run DB-backed tests")
	}
	if err := config.Load(); err != nil {
		t.Skipf("config load failed: %v", err)
	}
	if err := database.Connect(); err != nil {
		t.Skipf("DB unreachable: %v", err)
	}

	const slug = "idx_test_bu"
	database.DB.Exec(`INSERT INTO public.business_units (name, slug) VALUES ('IDX','idx_test_bu') ON CONFLICT (slug) DO NOTHING`)
	buID, err := database.BUIDForSlug(slug)
	if err != nil || buID == 0 {
		t.Fatalf("seed bu: id=%d err=%v", buID, err)
	}
	t.Cleanup(func() { database.DB.Exec(`DELETE FROM public.business_units WHERE slug = ?`, slug) })

	upsert := func(title string) int64 {
		var id int64
		err := database.DB.Raw(
			`INSERT INTO public.documents (bu_id, path, title, source, created_at, updated_at)
			 VALUES (?, ?, ?, 'wiki', now(), now())
			 ON CONFLICT (bu_id, path) DO UPDATE SET title = EXCLUDED.title, updated_at = now()
			 RETURNING id`, buID, "doc.md", title).Scan(&id).Error
		if err != nil {
			t.Fatalf("upsert: %v", err)
		}
		return id
	}
	id1 := upsert("first")
	id2 := upsert("second") // same (bu_id, path) → must update, not duplicate
	if id1 != id2 {
		t.Fatalf("ON CONFLICT (bu_id, path) did not update in place: %d vs %d", id1, id2)
	}

	var count int
	database.DB.Raw(`SELECT count(*) FROM public.documents WHERE bu_id = ? AND path = 'doc.md'`, buID).Scan(&count)
	if count != 1 {
		t.Fatalf("expected exactly 1 row, got %d", count)
	}
}
