package services

import (
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/utils"
)

// TestRetrieve_BUIsolation proves a query for BU A never returns BU B's rows,
// even when both chunks have an identical (distance-0) embedding. It seeds two
// throwaway BUs, asserts isolation, then deletes them (cascade clears rows).
func TestRetrieve_BUIsolation(t *testing.T) {
	if os.Getenv("RUN_DB_TESTS") != "1" {
		t.Skip("set RUN_DB_TESTS=1 to run DB-backed retrieval tests")
	}
	if err := config.Load(); err != nil {
		t.Skipf("config load failed: %v", err)
	}
	if err := database.Connect(); err != nil {
		t.Skipf("DB unreachable: %v", err)
	}

	const slugA, slugB = "iso_test_a", "iso_test_b"
	seedBU := func(slug string) uuid.UUID {
		database.DB.Exec(`INSERT INTO public.business_units (name, slug) VALUES (?, ?) ON CONFLICT (slug) DO NOTHING`, strings.ToUpper(slug), slug)
		id, err := database.BUIDForSlug(slug)
		if err != nil || id == uuid.Nil {
			t.Fatalf("seed bu %s: id=%s err=%v", slug, id, err)
		}
		return id
	}
	idA := seedBU(slugA)
	idB := seedBU(slugB)
	t.Cleanup(func() {
		database.DB.Exec(`DELETE FROM public.business_units WHERE slug IN (?, ?)`, slugA, slugB)
	})

	// Identical, normalized embedding for both BUs → distance 0 for both.
	dim := utils.CurrentEmbeddingDim()
	emb := make([]float32, dim)
	emb[0] = 1.0
	emb = utils.NormalizeEmbedding(emb)
	embStr := utils.Float32SliceToPgVector(emb)

	insert := func(buID uuid.UUID, path, content string) {
		docID := uuid.Must(uuid.NewV7())
		if err := database.DB.Exec(
			`INSERT INTO public.documents (id, bu_id, path, title, source, created_at, updated_at)
			 VALUES (?, ?, ?, ?, 'test', now(), now())`, docID, buID, path, path).Error; err != nil {
			t.Fatalf("insert doc: %v", err)
		}
		if err := database.DB.Exec(
			`INSERT INTO public.document_chunks (id, bu_id, doc_id, chunk_index, content, embedding, created_at)
			 VALUES (?, ?, ?, 0, ?, ?::vector, now())`, uuid.Must(uuid.NewV7()), buID, docID, content, embStr).Error; err != nil {
			t.Fatalf("insert chunk: %v", err)
		}
	}
	insert(idA, "iso_a_doc.md", "isolationkeyword apple")
	insert(idB, "iso_b_doc.md", "isolationkeyword banana")

	rs := NewRetrievalService()
	chunks, err := rs.Retrieve(slugA, "isolationkeyword", emb)
	if err != nil {
		t.Fatalf("Retrieve: %v", err)
	}

	sawA := false
	for _, c := range chunks {
		if strings.Contains(c.Path, "iso_b_doc.md") {
			t.Fatalf("BU isolation breach: BU A query returned BU B path %q", c.Path)
		}
		if strings.Contains(c.Path, "iso_a_doc.md") {
			sawA = true
		}
	}
	if !sawA {
		t.Fatalf("expected BU A's own doc in results, got %d chunks", len(chunks))
	}
}
