package export

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestGotenbergClient_RenderPDF(t *testing.T) {
	var gotPath, gotCT, gotBody string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotCT = r.Header.Get("Content-Type")
		_ = r.ParseMultipartForm(1 << 20)
		f, _, _ := r.FormFile("files")
		b, _ := io.ReadAll(f)
		gotBody = string(b)
		w.Header().Set("Content-Type", "application/pdf")
		w.Write([]byte("%PDF-1.4 fake"))
	}))
	defer srv.Close()

	out, err := NewGotenbergClient(srv.URL).RenderPDF(context.Background(), "<html>hi</html>")
	if err != nil {
		t.Fatalf("RenderPDF: %v", err)
	}
	if gotPath != "/forms/chromium/convert/html" {
		t.Errorf("path = %q", gotPath)
	}
	if !strings.HasPrefix(gotCT, "multipart/form-data") {
		t.Errorf("content-type = %q", gotCT)
	}
	if gotBody != "<html>hi</html>" {
		t.Errorf("file body = %q", gotBody)
	}
	if string(out) != "%PDF-1.4 fake" {
		t.Errorf("out = %q", out)
	}
}

func TestGotenbergClient_Non2xxErrors(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("boom"))
	}))
	defer srv.Close()
	if _, err := NewGotenbergClient(srv.URL).RenderPDF(context.Background(), "x"); err == nil {
		t.Error("expected error on 500")
	}
}
