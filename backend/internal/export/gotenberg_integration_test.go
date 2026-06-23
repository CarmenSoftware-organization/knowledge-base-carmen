package export

import (
	"bytes"
	"context"
	"os"
	"testing"
	"time"
)

// Gated: requires a reachable Gotenberg at GOTENBERG_URL (e.g. docker compose).
// Run: RUN_GOTENBERG_TESTS=1 GOTENBERG_URL=http://localhost:3000 go test ./internal/export/ -run TestGotenbergIntegration -v
func TestGotenbergIntegration(t *testing.T) {
	if os.Getenv("RUN_GOTENBERG_TESTS") != "1" {
		t.Skip("set RUN_GOTENBERG_TESTS=1 (and GOTENBERG_URL) to run")
	}
	url := os.Getenv("GOTENBERG_URL")
	if url == "" {
		url = "http://localhost:3000"
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	pdf, err := NewGotenbergClient(url).RenderPDF(ctx, WrapHTML("<h1>Carmen</h1><p>hello</p>"))
	if err != nil {
		t.Fatalf("RenderPDF: %v", err)
	}
	if !bytes.HasPrefix(pdf, []byte("%PDF-")) {
		t.Errorf("not a PDF: first bytes = %q", pdf[:min(8, len(pdf))])
	}
}
