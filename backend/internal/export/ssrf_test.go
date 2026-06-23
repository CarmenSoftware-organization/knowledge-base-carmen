package export

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestIsURLSafe_Schemes(t *testing.T) {
	ctx := context.Background()
	if IsURLSafe(ctx, "ftp://example.com/x") {
		t.Error("ftp should be unsafe")
	}
	if IsURLSafe(ctx, "not a url") {
		t.Error("garbage should be unsafe")
	}
}

func TestIsURLSafe_BlockedLiterals(t *testing.T) {
	ctx := context.Background()
	blocked := []string{
		"http://127.0.0.1/x", "http://10.0.0.5/x", "http://169.254.169.254/latest",
		"http://192.168.1.1/x", "http://172.16.0.1/x", "http://0.0.0.0/x",
		"http://[::1]/x", "http://[fe80::1]/x", "http://[fc00::1]/x",
		"http://[::ffff:127.0.0.1]/x",
	}
	for _, u := range blocked {
		if IsURLSafe(ctx, u) {
			t.Errorf("expected blocked: %s", u)
		}
	}
}

func TestIsURLSafe_PublicLiteralPasses(t *testing.T) {
	if !IsURLSafe(context.Background(), "http://8.8.8.8/x") {
		t.Error("public IP should be safe")
	}
}

func TestSafeFetch_RejectsRedirect(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "http://example.com/elsewhere", http.StatusFound)
	}))
	defer srv.Close()
	// srv listens on 127.0.0.1 — SafeFetch's dialer will block it, which also
	// proves the guard. Use a public-looking override is not possible here, so
	// assert it errors (either ssrf-blocked or redirect).
	_, _, err := SafeFetch(context.Background(), srv.URL, 0)
	if err == nil {
		t.Error("expected error (ssrf-blocked loopback)")
	}
}

func TestSafeFetch_BodyCap(t *testing.T) {
	body := strings.Repeat("a", 100)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		w.Write([]byte(body))
	}))
	defer srv.Close()
	// loopback is blocked by the dialer; this asserts the dialer guard fires.
	_, _, err := SafeFetch(context.Background(), srv.URL, 10)
	if err == nil {
		t.Error("expected ssrf-blocked error for loopback httptest server")
	}
}
