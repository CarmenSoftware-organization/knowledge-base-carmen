package api

import (
	"strings"
	"testing"

	"github.com/new-carmen/backend/internal/services"
)

func TestBuildContextFromChunks(t *testing.T) {
	chunks := []services.RetrievedChunk{
		{Path: "p/a.md", Title: "Alpha", Content: "alpha content"},
		{Path: "p/b.md", Title: "", Content: "beta content"},
	}
	ctx, sources := buildContextFromChunks(chunks, 8000, 2000)
	if !strings.Contains(ctx, "alpha content") || !strings.Contains(ctx, "beta content") {
		t.Errorf("context missing content: %q", ctx)
	}
	if len(sources) != 2 {
		t.Fatalf("sources = %d, want 2", len(sources))
	}
	if sources[0].ArticleID != "p/a.md" || sources[0].Title != "Alpha" {
		t.Errorf("source[0] = %+v", sources[0])
	}
	if sources[1].Title != "p/b.md" { // empty title falls back to path
		t.Errorf("source[1] title fallback = %q, want path", sources[1].Title)
	}
}
