package api

import (
	"strings"
	"testing"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/services"
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

func TestBuildImageMap(t *testing.T) {
	chunks := []services.RetrievedChunk{
		{Path: "ap/AP-doc.md", Content: "see ![alt](image-44.png) and bare image-45.png too"},
		{Path: "faq/q.md", Content: "![](_images/slug/img-001.png)"},
		{Path: "gl/GL-doc.md", Content: "![](image-44.png)"}, // collision: ap wins (earlier)
		{Path: "root.md", Content: "![](image-99.png)"},     // root-level dir "." skipped
		{Path: "ap/x.md", Content: "remote ![](https://ex.com/a.png) and data ![](data:image/png;base64,z)"},
	}
	m := buildImageMap(chunks)

	want := map[string]string{
		"image-44.png": "/images/ap/image-44.png", // earlier chunk wins over gl
		"image-45.png": "/images/ap/image-45.png",
		"img-001.png":  "/images/faq/_images/slug/img-001.png",
	}
	for k, v := range want {
		if m[k] != v {
			t.Errorf("map[%q] = %q, want %q", k, m[k], v)
		}
	}
	if _, ok := m["image-99.png"]; ok {
		t.Errorf("root-level image should be skipped, got %q", m["image-99.png"])
	}
	if _, ok := m["a.png"]; ok {
		t.Errorf("http image should be skipped")
	}
}

func TestBakeImagePaths(t *testing.T) {
	m := map[string]string{"image-44.png": "/images/ap/image-44.png"}
	in := "![](image-44.png) and prose image-44.png, but image-77.png unknown"
	want := "![](/images/ap/image-44.png) and prose /images/ap/image-44.png, but image-77.png unknown"
	if got := bakeImagePaths(in, m); got != want {
		t.Errorf("\n got: %q\nwant: %q", got, want)
	}
	// empty map is a no-op
	if got := bakeImagePaths(in, nil); got != in {
		t.Errorf("nil map should no-op, got %q", got)
	}
}
