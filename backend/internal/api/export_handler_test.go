package api

import (
	"context"
	"errors"
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/export"
)

type fakeRenderer struct {
	out []byte
	err error
}

func (f fakeRenderer) RenderPDF(context.Context, string) ([]byte, error) { return f.out, f.err }

func passDeps() export.Deps {
	return export.Deps{
		IsSafe: func(context.Context, string) bool { return true },
		Fetch:  func(context.Context, string) ([]byte, string, error) { return nil, "", errors.New("no") },
	}
}

func appWith(h *ExportHandler) *fiber.App {
	app := fiber.New()
	app.Post("/api/export/pdf", h.PDF)
	return app
}

func TestExportPDF_MissingHTML(t *testing.T) {
	app := appWith(&ExportHandler{Renderer: fakeRenderer{out: []byte("x")}, Deps: passDeps()})
	resp, _ := app.Test(httptest.NewRequest("POST", "/api/export/pdf", strings.NewReader(`{}`)))
	if resp.StatusCode != 400 {
		t.Errorf("status = %d want 400", resp.StatusCode)
	}
}

func TestExportPDF_NilRenderer503(t *testing.T) {
	app := appWith(&ExportHandler{Renderer: nil, Deps: passDeps()})
	req := httptest.NewRequest("POST", "/api/export/pdf", strings.NewReader(`{"html":"<p>x</p>"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req)
	if resp.StatusCode != 503 {
		t.Errorf("status = %d want 503", resp.StatusCode)
	}
}

func TestExportPDF_Success(t *testing.T) {
	app := appWith(&ExportHandler{Renderer: fakeRenderer{out: []byte("%PDF-1.4")}, Deps: passDeps()})
	req := httptest.NewRequest("POST", "/api/export/pdf", strings.NewReader(`{"html":"<p>x</p>"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req)
	if resp.StatusCode != 200 {
		t.Fatalf("status = %d want 200", resp.StatusCode)
	}
	if resp.Header.Get("Content-Type") != "application/pdf" {
		t.Errorf("content-type = %q", resp.Header.Get("Content-Type"))
	}
	if cd := resp.Header.Get("Content-Disposition"); !strings.Contains(cd, "carmen-export.pdf") {
		t.Errorf("disposition = %q", cd)
	}
	b, _ := io.ReadAll(resp.Body)
	if string(b) != "%PDF-1.4" {
		t.Errorf("body = %q", b)
	}
}

func TestExportPDF_RenderError500(t *testing.T) {
	app := appWith(&ExportHandler{Renderer: fakeRenderer{err: errors.New("boom")}, Deps: passDeps()})
	req := httptest.NewRequest("POST", "/api/export/pdf", strings.NewReader(`{"html":"<p>x</p>"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req)
	if resp.StatusCode != 500 {
		t.Errorf("status = %d want 500", resp.StatusCode)
	}
}
