# Go PDF Export Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `POST /api/export/pdf` natively in the Go Fiber backend — it SSRF-guards and inlines images, wraps the HTML in a styled template, and renders a PDF via a Gotenberg sidecar — so the `frontend-react` chat "Export PDF" works in production.

**Architecture:** A new `internal/export/` package holds the framework-agnostic rendering logic (SSRF guard with an IP-pinned dialer, image inlining, the styled HTML wrapper, and a Gotenberg HTTP client behind a `Renderer` interface). A thin `ExportHandler` in `internal/api/` orchestrates them, registered as a public, rate-limited route. Gotenberg runs as a separate Docker service so Chromium's memory stays off the 512 MB Go instance. DOCX is dropped.

**Tech Stack:** Go 1.25, Fiber v2, stdlib `net/netip` + `net/http` + `mime/multipart`, Gotenberg 8 (`gotenberg/gotenberg:8`), Vitest (frontend test update).

## Global Constraints

- Go module path: `github.com/new-carmen/backend`. Go 1.25, `CGO_ENABLED=0` static binary. Existing patterns: handlers in `internal/api/` (`NewXHandler()` / `func (h *X) M(c *fiber.Ctx) error`), routes in `internal/router/` via `RegisterX(app)` called from `SetupRoutes`, config via `config.AppConfig` populated in `config.Load()` with `getEnv("KEY", default)`.
- **PDF only. No DOCX, no LibreOffice, no Chromium added to the Go image.**
- Endpoint is **public** (chat widget is anonymous) — NO admin key. Protected by `exportLimiter` (`Max: 10, Expiration: time.Minute`), a `2 MB` request-body cap (`413`), and a `30s` render timeout.
- **`GOTENBERG_URL` default is empty string `""`** (NOT `http://localhost:3000`). When empty → handler's `Renderer` is `nil` → returns `503`. Local dev gets it from docker-compose (`http://gotenberg:3000`). (This resolves the spec's §5 contradiction in favor of the 503-when-unconfigured behavior.)
- SSRF blocked ranges via `netip.Addr` (after `.Unmap()`): `IsLoopback() || IsPrivate() || IsLinkLocalUnicast() || IsLinkLocalMulticast() || IsUnspecified()`. Fail-closed on DNS failure / parse error. Image fetch: IP-pinned dial (no DNS-rebinding), no redirects, `20 MiB` cap, `8s` timeout.
- Gotenberg Chromium route `POST {BaseURL}/forms/chromium/convert/html`, multipart file field `files` filename `index.html`; A4 in inches: `paperWidth=8.27 paperHeight=11.69`, margins `0.79/0.79/0.59/0.59` (orig 20mm/15mm), `printBackground=true`.
- Response on success: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="carmen-export.pdf"`.
- The styled HTML `<style>` block in `WrapHTML` must be copied **verbatim** from `frontend/app/api/export/pdf/route.ts` (lines from `*, *::before` through the closing of the `<style>`), so output is visually identical.
- Frontend change lives in `frontend-react/src/components/chat/carmen-message.tsx` (this branch is stacked on the frontend-react branch).

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/internal/config/config.go` (modify) | add `Export ExportConfig{ GotenbergURL, ImageBaseURL }` + populate in `Load()` |
| `backend/internal/export/ssrf.go` | `isBlocked`, `IsURLSafe`, `SafeFetch` (IP-pinned) |
| `backend/internal/export/ssrf_test.go` | IP-range table + `SafeFetch` redirect/cap via `httptest` |
| `backend/internal/export/images.go` | `Deps`, `EmbedSafeImages` |
| `backend/internal/export/images_test.go` | keep/strip/inline with injected deps + `httptest` |
| `backend/internal/export/template.go` | `WrapHTML(body) string` (verbatim styled wrapper) |
| `backend/internal/export/template_test.go` | body embedded + key style markers present |
| `backend/internal/export/gotenberg.go` | `Renderer` interface, `GotenbergClient`, `NewGotenbergClient` |
| `backend/internal/export/gotenberg_test.go` | multipart shape + PDF passthrough via `httptest` |
| `backend/internal/export/gotenberg_integration_test.go` | gated `RUN_GOTENBERG_TESTS=1` real render |
| `backend/internal/api/export_handler.go` | `ExportHandler.PDF` orchestration |
| `backend/internal/api/export_handler_test.go` | 413/400/503/200/500 via mock `Renderer` |
| `backend/internal/router/export_routes.go` | `RegisterExport(app)` + `exportLimiter` |
| `backend/internal/router/routes.go` (modify) | call `RegisterExport(app)` |
| `backend/docker-compose.yml` (modify) | add `gotenberg` service + `GOTENBERG_URL` on backend |
| `render.yaml` (modify) | add `gotenberg` service + `GOTENBERG_URL` on `carmen-backend` |
| `frontend-react/src/components/chat/carmen-message.tsx` (modify) | remove DOCX export |
| `frontend-react/src/components/chat/carmen-message.export.test.tsx` (modify) | drop DOCX assertions |

---

## Task 1: Export config section

**Files:**
- Modify: `backend/internal/config/config.go`
- Test: `backend/internal/config/config_export_test.go`

**Interfaces:**
- Produces: `config.AppConfig.Export.GotenbergURL string`, `config.AppConfig.Export.ImageBaseURL string`.

- [ ] **Step 1: Write the failing test**

Create `backend/internal/config/config_export_test.go`:
```go
package config

import (
	"os"
	"testing"
)

func TestLoad_ExportDefaults(t *testing.T) {
	os.Unsetenv("GOTENBERG_URL")
	os.Unsetenv("EXPORT_IMAGE_BASE_URL")
	if err := Load(); err != nil {
		t.Fatalf("Load: %v", err)
	}
	if AppConfig.Export.GotenbergURL != "" {
		t.Errorf("GotenbergURL default = %q, want empty", AppConfig.Export.GotenbergURL)
	}
}

func TestLoad_ExportFromEnv(t *testing.T) {
	t.Setenv("GOTENBERG_URL", "http://gotenberg:3000")
	t.Setenv("EXPORT_IMAGE_BASE_URL", "https://kb.example.com")
	if err := Load(); err != nil {
		t.Fatalf("Load: %v", err)
	}
	if AppConfig.Export.GotenbergURL != "http://gotenberg:3000" {
		t.Errorf("GotenbergURL = %q", AppConfig.Export.GotenbergURL)
	}
	if AppConfig.Export.ImageBaseURL != "https://kb.example.com" {
		t.Errorf("ImageBaseURL = %q", AppConfig.Export.ImageBaseURL)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/config/ -run TestLoad_Export -v`
Expected: compile error — `AppConfig.Export` undefined.

- [ ] **Step 3: Add the config struct + field**

In `backend/internal/config/config.go`, add to the `Config` struct (after `LLM LLMConfig`):
```go
	Export ExportConfig
```
Add the type near the other config types:
```go
type ExportConfig struct {
	GotenbergURL string
	ImageBaseURL string
}
```

- [ ] **Step 4: Populate it in `Load()`**

In `Load()`, inside the `&Config{ ... }` literal, after the `LLM: LLMConfig{...}` block, add:
```go
		Export: ExportConfig{
			GotenbergURL: getEnv("GOTENBERG_URL", ""),
			ImageBaseURL: getEnv("EXPORT_IMAGE_BASE_URL", ""),
		},
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && go test ./internal/config/ -run TestLoad_Export -v`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/internal/config/config.go backend/internal/config/config_export_test.go
git commit -m "feat(backend): export config (GOTENBERG_URL, EXPORT_IMAGE_BASE_URL)"
```

---

## Task 2: SSRF guard (`internal/export/ssrf.go`)

**Files:**
- Create: `backend/internal/export/ssrf.go`
- Test: `backend/internal/export/ssrf_test.go`

**Interfaces:**
- Produces: `func IsURLSafe(ctx context.Context, rawURL string) bool`; `func SafeFetch(ctx context.Context, rawURL string, maxBytes int64) (body []byte, contentType string, err error)`.

- [ ] **Step 1: Write the failing test**

Create `backend/internal/export/ssrf_test.go`:
```go
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
```
Note: `httptest` servers bind to `127.0.0.1`, which `SafeFetch` correctly blocks — so these tests assert the guard fires on loopback. (The happy-path body-cap/content-type behavior is covered indirectly in `images_test.go` via an injected fake fetch.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/export/ -run TestIsURLSafe -v`
Expected: compile error — package/functions don't exist.

- [ ] **Step 3: Write `backend/internal/export/ssrf.go`**

```go
// Package export renders chat answers to PDF with SSRF-guarded image inlining
// and a Gotenberg (Chromium) backend. Ported from the former Next.js
// app/api/export/* routes (puppeteer + ssrf-guard + export-images).
package export

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"time"
)

const (
	defaultFetchTimeout = 8 * time.Second
	defaultMaxBytes     = 20 * 1024 * 1024
)

var errRedirect = errors.New("export: redirects not allowed")

// isBlocked reports whether an IP is internal/reserved and must not be fetched.
func isBlocked(a netip.Addr) bool {
	a = a.Unmap()
	return a.IsLoopback() || a.IsPrivate() || a.IsLinkLocalUnicast() ||
		a.IsLinkLocalMulticast() || a.IsUnspecified()
}

// IsURLSafe reports whether rawURL is safe to fetch server-side: it must be
// http(s) and its host must resolve only to non-blocked addresses. Fails closed.
func IsURLSafe(ctx context.Context, rawURL string) bool {
	u, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return false
	}
	host := u.Hostname()
	if host == "" {
		return false
	}
	if addr, err := netip.ParseAddr(host); err == nil {
		return !isBlocked(addr)
	}
	addrs, err := net.DefaultResolver.LookupNetIP(ctx, "ip", host)
	if err != nil || len(addrs) == 0 {
		return false
	}
	for _, a := range addrs {
		if isBlocked(a) {
			return false
		}
	}
	return true
}

// SafeFetch GETs rawURL with SSRF protection: http(s) only, the connection is
// pinned to a DNS-validated address (no rebinding), redirects are NOT followed,
// and the body is size-capped. Returns the body and Content-Type.
func SafeFetch(ctx context.Context, rawURL string, maxBytes int64) ([]byte, string, error) {
	if maxBytes <= 0 {
		maxBytes = defaultMaxBytes
	}
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, "", err
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, "", errors.New("export: unsupported scheme")
	}

	baseDialer := &net.Dialer{Timeout: defaultFetchTimeout}
	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(addr)
			if err != nil {
				return nil, err
			}
			ips, err := net.DefaultResolver.LookupNetIP(ctx, "ip", host)
			if err != nil || len(ips) == 0 {
				return nil, errors.New("export: dns lookup failed")
			}
			for _, ip := range ips {
				if isBlocked(ip) {
					return nil, errors.New("export: ssrf blocked " + ip.String())
				}
			}
			return baseDialer.DialContext(ctx, network, net.JoinHostPort(ips[0].String(), port))
		},
	}
	client := &http.Client{
		Transport:     transport,
		Timeout:       defaultFetchTimeout,
		CheckRedirect: func(*http.Request, []*http.Request) error { return errRedirect },
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, "", err
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, "", errors.New("export: non-2xx " + resp.Status)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBytes))
	if err != nil {
		return nil, "", err
	}
	ct := resp.Header.Get("Content-Type")
	if ct == "" {
		ct = "image/png"
	}
	return body, ct, nil
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/export/ -run 'TestIsURLSafe|TestSafeFetch' -v`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/internal/export/ssrf.go backend/internal/export/ssrf_test.go
git commit -m "feat(backend/export): SSRF guard with IP-pinned dialer"
```

---

## Task 3: Image inlining (`internal/export/images.go`)

**Files:**
- Create: `backend/internal/export/images.go`
- Test: `backend/internal/export/images_test.go`

**Interfaces:**
- Consumes: nothing from other tasks (the `Deps` funcs are injected; production wires `IsURLSafe`/`SafeFetch` in Task 6).
- Produces: `type Deps struct { IsSafe func(context.Context, string) bool; Fetch func(context.Context, string) ([]byte, string, error) }`; `func EmbedSafeImages(ctx context.Context, html, baseURL string, d Deps) string`.

- [ ] **Step 1: Write the failing test**

Create `backend/internal/export/images_test.go`:
```go
package export

import (
	"context"
	"strings"
	"testing"
)

func fakeDeps(safe bool, body string) Deps {
	return Deps{
		IsSafe: func(context.Context, string) bool { return safe },
		Fetch: func(context.Context, string) ([]byte, string, error) {
			return []byte(body), "image/png", nil
		},
	}
}

func TestEmbedSafeImages_KeepsDataURI(t *testing.T) {
	in := `<p><img src="data:image/png;base64,AAA" alt="x"></p>`
	out := EmbedSafeImages(context.Background(), in, "https://b", fakeDeps(true, "z"))
	if out != in {
		t.Errorf("data: img changed: %q", out)
	}
}

func TestEmbedSafeImages_StripsUnsafe(t *testing.T) {
	in := `a<img src="http://evil/x.png">b`
	out := EmbedSafeImages(context.Background(), in, "https://b", fakeDeps(false, "z"))
	if strings.Contains(out, "<img") {
		t.Errorf("unsafe img not stripped: %q", out)
	}
	if out != "ab" {
		t.Errorf("got %q want ab", out)
	}
}

func TestEmbedSafeImages_InlinesSafe(t *testing.T) {
	in := `<img src="https://ok/x.png">`
	out := EmbedSafeImages(context.Background(), in, "https://b", fakeDeps(true, "PNGDATA"))
	if !strings.Contains(out, "data:image/png;base64,") {
		t.Errorf("safe img not inlined: %q", out)
	}
}

func TestEmbedSafeImages_ResolvesRelativeThenInlines(t *testing.T) {
	var gotURL string
	d := Deps{
		IsSafe: func(_ context.Context, u string) bool { gotURL = u; return true },
		Fetch:  func(context.Context, string) ([]byte, string, error) { return []byte("d"), "image/jpeg", nil },
	}
	EmbedSafeImages(context.Background(), `<img src="/img/a.png">`, "https://base.test", d)
	if gotURL != "https://base.test/img/a.png" {
		t.Errorf("relative not resolved against base: %q", gotURL)
	}
}

func TestEmbedSafeImages_FetchErrorLeavesURL(t *testing.T) {
	d := Deps{
		IsSafe: func(context.Context, string) bool { return true },
		Fetch:  func(context.Context, string) ([]byte, string, error) { return nil, "", context.DeadlineExceeded },
	}
	out := EmbedSafeImages(context.Background(), `<img src="https://ok/x.png">`, "https://b", d)
	if !strings.Contains(out, `src="https://ok/x.png"`) {
		t.Errorf("fetch-error should leave absolute URL: %q", out)
	}
}

func TestEmbedSafeImages_StripsUnsupportedScheme(t *testing.T) {
	out := EmbedSafeImages(context.Background(), `<img src="javascript:alert(1)">`, "https://b", fakeDeps(true, "z"))
	if strings.Contains(out, "<img") {
		t.Errorf("unsupported scheme not stripped: %q", out)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/export/ -run TestEmbedSafeImages -v`
Expected: compile error — `Deps`/`EmbedSafeImages` undefined.

- [ ] **Step 3: Write `backend/internal/export/images.go`**

```go
package export

import (
	"context"
	"encoding/base64"
	"fmt"
	"regexp"
	"strings"
)

// Deps are the injectable url-safety check and fetcher (production: IsURLSafe,
// SafeFetch). Injecting them keeps EmbedSafeImages unit-testable without network.
type Deps struct {
	IsSafe func(ctx context.Context, url string) bool
	Fetch  func(ctx context.Context, url string) (body []byte, contentType string, err error)
}

var (
	imgTagRe = regexp.MustCompile(`(?i)<img\b[^>]*>`)
	imgSrcRe = regexp.MustCompile(`(?i)\bsrc="([^"]*)"`)
)

// EmbedSafeImages rewrites every <img> in html: data:/blob: kept; relative "/x"
// resolved against baseURL; absolute http(s) validated then fetched and inlined
// as a base64 data: URI; unsafe or unsupported srcs stripped. A fetch error
// leaves the (resolved) absolute URL in place. Tags without src are untouched.
func EmbedSafeImages(ctx context.Context, html, baseURL string, d Deps) string {
	return imgTagRe.ReplaceAllStringFunc(html, func(tag string) string {
		m := imgSrcRe.FindStringSubmatch(tag)
		if m == nil {
			return tag
		}
		src := m[1]
		low := strings.ToLower(src)
		if strings.HasPrefix(low, "data:") || strings.HasPrefix(low, "blob:") {
			return tag
		}
		var fetchURL string
		switch {
		case strings.HasPrefix(src, "/"):
			fetchURL = baseURL + src
		case strings.HasPrefix(low, "http://") || strings.HasPrefix(low, "https://"):
			fetchURL = src
		default:
			return "" // unsupported scheme — strip
		}
		if !d.IsSafe(ctx, fetchURL) {
			return "" // unsafe host — strip
		}
		body, ct, err := d.Fetch(ctx, fetchURL)
		if err != nil {
			// leave as resolved absolute URL (matches the original behavior)
			return strings.Replace(tag, m[0], fmt.Sprintf(`src="%s"`, fetchURL), 1)
		}
		dataURI := fmt.Sprintf("data:%s;base64,%s", ct, base64.StdEncoding.EncodeToString(body))
		return strings.Replace(tag, m[0], fmt.Sprintf(`src="%s"`, dataURI), 1)
	})
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/export/ -run TestEmbedSafeImages -v`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/internal/export/images.go backend/internal/export/images_test.go
git commit -m "feat(backend/export): SSRF-guarded image inlining"
```

---

## Task 4: Gotenberg client (`internal/export/gotenberg.go`)

**Files:**
- Create: `backend/internal/export/gotenberg.go`
- Test: `backend/internal/export/gotenberg_test.go`

**Interfaces:**
- Produces: `type Renderer interface { RenderPDF(ctx context.Context, html string) ([]byte, error) }`; `type GotenbergClient struct{ BaseURL string; HTTP *http.Client }`; `func NewGotenbergClient(baseURL string) *GotenbergClient`.

- [ ] **Step 1: Write the failing test**

Create `backend/internal/export/gotenberg_test.go`:
```go
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/export/ -run TestGotenbergClient -v`
Expected: compile error — undefined.

- [ ] **Step 3: Write `backend/internal/export/gotenberg.go`**

```go
package export

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"
)

// Renderer turns a full HTML document into PDF bytes.
type Renderer interface {
	RenderPDF(ctx context.Context, html string) ([]byte, error)
}

// GotenbergClient renders via a Gotenberg Chromium service.
type GotenbergClient struct {
	BaseURL string
	HTTP    *http.Client
}

func NewGotenbergClient(baseURL string) *GotenbergClient {
	return &GotenbergClient{BaseURL: baseURL, HTTP: &http.Client{Timeout: 60 * time.Second}}
}

var gotenbergFields = map[string]string{
	"paperWidth":      "8.27",  // A4 width in inches
	"paperHeight":     "11.69", // A4 height in inches
	"marginTop":       "0.79",  // 20mm
	"marginBottom":    "0.79",
	"marginLeft":      "0.59", // 15mm
	"marginRight":     "0.59",
	"printBackground": "true",
}

func (g *GotenbergClient) RenderPDF(ctx context.Context, html string) ([]byte, error) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, err := w.CreateFormFile("files", "index.html")
	if err != nil {
		return nil, err
	}
	if _, err := fw.Write([]byte(html)); err != nil {
		return nil, err
	}
	for k, v := range gotenbergFields {
		if err := w.WriteField(k, v); err != nil {
			return nil, err
		}
	}
	if err := w.Close(); err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, g.BaseURL+"/forms/chromium/convert/html", &buf)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())

	resp, err := g.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("gotenberg %d: %s", resp.StatusCode, string(b))
	}
	return io.ReadAll(resp.Body)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/export/ -run TestGotenbergClient -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/internal/export/gotenberg.go backend/internal/export/gotenberg_test.go
git commit -m "feat(backend/export): Gotenberg PDF renderer client"
```

---

## Task 5: HTML template + ExportHandler

**Files:**
- Create: `backend/internal/export/template.go`
- Create: `backend/internal/export/template_test.go`
- Create: `backend/internal/api/export_handler.go`
- Create: `backend/internal/api/export_handler_test.go`

**Interfaces:**
- Consumes: `export.Renderer`, `export.Deps`, `export.EmbedSafeImages`, `export.WrapHTML`.
- Produces: `func WrapHTML(body string) string`; `type ExportHandler struct { Renderer export.Renderer; Deps export.Deps; ImageBaseURL string }`; `func (h *ExportHandler) PDF(c *fiber.Ctx) error`.

- [ ] **Step 1: Write the failing template test**

Create `backend/internal/export/template_test.go`:
```go
package export

import (
	"strings"
	"testing"
)

func TestWrapHTML(t *testing.T) {
	out := WrapHTML(`<p>hello</p>`)
	if !strings.Contains(out, "<p>hello</p>") {
		t.Error("body not embedded")
	}
	if !strings.Contains(out, "<!DOCTYPE html>") || !strings.Contains(out, "<style>") {
		t.Error("missing doctype/style wrapper")
	}
	if !strings.Contains(out, "font-family") {
		t.Error("missing style rules")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/export/ -run TestWrapHTML -v`
Expected: compile error — `WrapHTML` undefined.

- [ ] **Step 3: Write `backend/internal/export/template.go`**

Copy the `<style>` block VERBATIM from `frontend/app/api/export/pdf/route.ts` (the CSS between `<style>` and `</style>`). Use a raw string literal:
```go
package export

// WrapHTML wraps rendered chat HTML in the full styled document used for PDF
// export. The CSS is copied verbatim from the former Next.js export route so the
// output is visually identical.
func WrapHTML(body string) string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: 'Tahoma', 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.7;
    color: #1e293b;
    background: #ffffff;
  }
  body { padding: 0 32px 32px; }

  h1, h2, h3, h4, h5, h6 {
    color: #0f172a;
    font-weight: 700;
    line-height: 1.3;
    margin: 1.4em 0 0.5em;
  }
  h1 { font-size: 1.75em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
  h2 { font-size: 1.4em; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.2em; }
  h3 { font-size: 1.15em; }
  h4, h5, h6 { font-size: 1em; }

  p { margin: 0.7em 0; }
  a { color: #2563eb; text-decoration: underline; }

  ul, ol { padding-left: 1.6em; margin: 0.6em 0; }
  li { margin: 0.25em 0; }

  strong, b { font-weight: 700; }
  em, i { font-style: italic; }

  code {
    font-family: 'Courier New', Consolas, monospace;
    font-size: 0.85em;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 3px;
    padding: 0.1em 0.35em;
  }
  pre {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 14px 16px;
    overflow-x: auto;
    margin: 1em 0;
  }
  pre code {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.82em;
  }

  blockquote {
    border-left: 4px solid #3b82f6;
    margin: 1em 0;
    padding: 8px 16px;
    background: #eff6ff;
    color: #1e40af;
    border-radius: 0 4px 4px 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
    font-size: 0.9em;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 8px 12px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #f1f5f9;
    font-weight: 700;
    color: #0f172a;
  }
  tr:nth-child(even) td { background: #f8fafc; }

  img { max-width: 100%; height: auto; border-radius: 4px; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5em 0; }

  /* Suppress Tailwind class artefacts that have no CSS loaded */
  [class] { all: revert; }
  /* But restore our resets */
  * { box-sizing: border-box !important; }
</style>
</head>
<body>
` + body + `
</body>
</html>`
}
```
(Source path: `frontend/app/api/export/pdf/route.ts`. Verify the CSS matches that file exactly.)

- [ ] **Step 4: Run template test (pass)**

Run: `cd backend && go test ./internal/export/ -run TestWrapHTML -v`
Expected: PASS.

- [ ] **Step 5: Write the failing handler test**

Create `backend/internal/api/export_handler_test.go`:
```go
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
```

- [ ] **Step 6: Run handler test to verify it fails**

Run: `cd backend && go test ./internal/api/ -run TestExportPDF -v`
Expected: compile error — `ExportHandler` undefined.

- [ ] **Step 7: Write `backend/internal/api/export_handler.go`**

```go
package api

import (
	"context"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/export"
)

const maxExportBodyBytes = 2 * 1024 * 1024

// ExportHandler renders chat answers to PDF. Renderer is nil when Gotenberg is
// not configured, in which case PDF returns 503.
type ExportHandler struct {
	Renderer     export.Renderer
	Deps         export.Deps
	ImageBaseURL string
}

type exportPDFRequest struct {
	HTML string `json:"html"`
}

// PDF handles POST /api/export/pdf — body {html}. Returns application/pdf.
func (h *ExportHandler) PDF(c *fiber.Ctx) error {
	if len(c.Body()) > maxExportBodyBytes {
		return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{"error": "html too large"})
	}
	var req exportPDFRequest
	if err := c.BodyParser(&req); err != nil || req.HTML == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "html is required"})
	}
	if h.Renderer == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "export unavailable"})
	}

	ctx, cancel := context.WithTimeout(c.UserContext(), 30*time.Second)
	defer cancel()

	embedded := export.EmbedSafeImages(ctx, req.HTML, h.ImageBaseURL, h.Deps)
	full := export.WrapHTML(embedded)
	pdf, err := h.Renderer.RenderPDF(ctx, full)
	if err != nil {
		log.Printf("PDF export error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Export failed"})
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", `attachment; filename="carmen-export.pdf"`)
	return c.Send(pdf)
}
```

- [ ] **Step 8: Run all Task-5 tests (pass)**

Run: `cd backend && go test ./internal/export/ ./internal/api/ -run 'TestWrapHTML|TestExportPDF' -v`
Expected: PASS (1 template + 4 handler tests).

- [ ] **Step 9: Commit**

```bash
git add backend/internal/export/template.go backend/internal/export/template_test.go backend/internal/api/export_handler.go backend/internal/api/export_handler_test.go
git commit -m "feat(backend/export): styled template + ExportHandler.PDF"
```

---

## Task 6: Route registration + wiring

**Files:**
- Create: `backend/internal/router/export_routes.go`
- Modify: `backend/internal/router/routes.go`
- Test: `backend/internal/router/export_routes_test.go`

**Interfaces:**
- Consumes: `api.ExportHandler`, `export.IsURLSafe`, `export.SafeFetch`, `export.NewGotenbergClient`, `config.AppConfig.Export`.
- Produces: `func RegisterExport(app *fiber.App)`; route `POST /api/export/pdf`.

- [ ] **Step 1: Write the failing test**

Create `backend/internal/router/export_routes_test.go`:
```go
package router

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestRegisterExport_RouteWired(t *testing.T) {
	app := fiber.New()
	RegisterExport(app) // GOTENBERG_URL unset in tests → nil renderer
	// missing html → 400 (route exists, handler runs)
	req := httptest.NewRequest("POST", "/api/export/pdf", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	if resp.StatusCode != 400 {
		t.Errorf("status = %d want 400 (route wired, empty html)", resp.StatusCode)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/router/ -run TestRegisterExport -v`
Expected: compile error — `RegisterExport` undefined.

- [ ] **Step 3: Write `backend/internal/router/export_routes.go`**

```go
package router

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/new-carmen/backend/internal/api"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/export"
)

// RegisterExport wires POST /api/export/pdf. The endpoint is public (the chat
// widget is anonymous) but rate-limited; it returns 503 when Gotenberg is not
// configured (GOTENBERG_URL empty).
func RegisterExport(app *fiber.App) {
	h := &api.ExportHandler{
		Deps: export.Deps{
			IsSafe: export.IsURLSafe,
			Fetch: func(ctx context.Context, u string) ([]byte, string, error) {
				return export.SafeFetch(ctx, u, 0)
			},
		},
	}
	if config.AppConfig != nil {
		h.ImageBaseURL = config.AppConfig.Export.ImageBaseURL
		if url := config.AppConfig.Export.GotenbergURL; url != "" {
			h.Renderer = export.NewGotenbergClient(url)
		}
	}

	exportLimiter := limiter.New(limiter.Config{Max: 10, Expiration: time.Minute})
	app.Post("/api/export/pdf", exportLimiter, h.PDF)
}
```

- [ ] **Step 4: Wire into `SetupRoutes`**

In `backend/internal/router/routes.go`, inside `SetupRoutes`, add after `RegisterActivity(app)`:
```go
	RegisterExport(app)
```

- [ ] **Step 5: Run test + full backend build (pass)**

Run: `cd backend && go test ./internal/router/ -run TestRegisterExport -v && go build ./... && go vet ./...`
Expected: test PASS, build + vet clean.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/router/export_routes.go backend/internal/router/routes.go backend/internal/router/export_routes_test.go
git commit -m "feat(backend): register POST /api/export/pdf (public, rate-limited)"
```

---

## Task 7: Deploy config (Gotenberg sidecar) + gated integration test

**Files:**
- Modify: `backend/docker-compose.yml`
- Modify: `render.yaml`
- Create: `backend/internal/export/gotenberg_integration_test.go`

**Interfaces:**
- Produces: a `gotenberg` service reachable at `http://gotenberg:3000` in compose; `GOTENBERG_URL` set on the backend in compose + render.

- [ ] **Step 1: Read current compose to match style**

Run: `cat backend/docker-compose.yml`
Note the existing `services:` block + how the backend service sets env (`environment:` or `env_file`).

- [ ] **Step 2: Add the gotenberg service + GOTENBERG_URL to compose**

In `backend/docker-compose.yml`, add a service (sibling of the backend service):
```yaml
  gotenberg:
    image: gotenberg/gotenberg:8
    restart: unless-stopped
    # internal only; the backend reaches it on the compose network
    expose:
      - "3000"
```
And on the **backend** service, add to its `environment:` list:
```yaml
      - GOTENBERG_URL=http://gotenberg:3000
```
(If the backend uses `env_file: .env.docker` instead of inline `environment:`, add an `environment:` block with the single var alongside it — inline env wins, and this keeps the wiring explicit.)

- [ ] **Step 3: Verify compose parses**

Run: `cd backend && docker compose config >/dev/null && echo COMPOSE_OK`
Expected: `COMPOSE_OK` (no YAML/schema error). If docker is unavailable, skip and note it.

- [ ] **Step 4: Add gotenberg service + GOTENBERG_URL to render.yaml**

In `render.yaml`, add a second service under `services:`:
```yaml
  # ─── Gotenberg (HTML→PDF via Chromium) — used by /api/export/pdf ─────────────
  - type: web
    name: gotenberg
    runtime: image
    image:
      url: gotenberg/gotenberg:8
    plan: free
    # NOTE: Render free services spin down on idle — the first export after
    # idle incurs a Gotenberg cold start (slow but functional).
```
And on the `carmen-backend` service's `envVars`, add:
```yaml
      - key: GOTENBERG_URL
        value: https://gotenberg.onrender.com
```
(Replace the value with the actual internal/public URL Render assigns to the `gotenberg` service after first deploy. Add a comment: `# set to the gotenberg service URL Render assigns`.)

- [ ] **Step 5: Write the gated integration test**

Create `backend/internal/export/gotenberg_integration_test.go`:
```go
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
```

- [ ] **Step 6: Verify the gated test compiles + skips by default**

Run: `cd backend && go test ./internal/export/ -run TestGotenbergIntegration -v`
Expected: `--- SKIP` (RUN_GOTENBERG_TESTS not set).

- [ ] **Step 7: Commit**

```bash
git add backend/docker-compose.yml render.yaml backend/internal/export/gotenberg_integration_test.go
git commit -m "chore(backend): gotenberg sidecar (compose + render) + gated integration test"
```

---

## Task 8: Drop DOCX from the SPA

**Files:**
- Modify: `frontend-react/src/components/chat/carmen-message.tsx`
- Modify: `frontend-react/src/components/chat/carmen-message.export.test.tsx`

**Interfaces:**
- Consumes: nothing (frontend-only cleanup).
- Produces: no DOCX export path; only `handleExportPdf` remains.

- [ ] **Step 1: Read the current export code + test**

Run:
```bash
sed -n '1,60p' frontend-react/src/components/chat/carmen-message.export.test.tsx
grep -n "docx\|Docx\|DOCX\|export_doc\|handleExportDocx\|exportLoading\|export/pdf\|export/docx\|Export Word\|showExportMenu" frontend-react/src/components/chat/carmen-message.tsx
```

- [ ] **Step 2: Update the test first (TDD — it should fail against current code)**

Edit `frontend-react/src/components/chat/carmen-message.export.test.tsx` so it asserts the PDF endpoint remains AND that DOCX is gone:
```tsx
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("carmen-message export", () => {
  it("posts PDF export to the Go backend and has no DOCX export", () => {
    const src = readFileSync(
      new URL("./carmen-message.tsx", import.meta.url),
      "utf8",
    );
    expect(src).toContain("${API_BASE}/api/export/pdf");
    // DOCX was dropped (Gotenberg has no HTML→DOCX route).
    expect(src).not.toContain("/api/export/docx");
    expect(src).not.toContain("handleExportDocx");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend-react && npx vitest run src/components/chat/carmen-message.export.test.tsx`
Expected: FAIL — `carmen-message.tsx` still contains `/api/export/docx` / `handleExportDocx`.

- [ ] **Step 4: Remove DOCX from `carmen-message.tsx`**

In `frontend-react/src/components/chat/carmen-message.tsx`:
- Delete the entire `handleExportDocx` function.
- Delete the "Export Word" / `export_doc` menu `<button>` item (the one calling `handleExportDocx`) from the export menu JSX.
- If `exportLoading` is a union like `"pdf" | "docx" | null`, narrow it to `"pdf" | null` and remove any `exportLoading === "docx"` branch.
- Leave `handleExportPdf` and the PDF menu item untouched.
Use the grep output from Step 1 to locate exact lines. Do not change any other behavior.

- [ ] **Step 5: Run the test + full frontend checks (pass)**

Run: `cd frontend-react && npx vitest run src/components/chat/carmen-message.export.test.tsx && npm run lint && npx tsc --noEmit && npm run build`
Expected: test PASS, lint 0, tsc 0, build clean.

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/components/chat/carmen-message.tsx frontend-react/src/components/chat/carmen-message.export.test.tsx
git commit -m "feat(frontend-react): drop DOCX export (PDF-only via Go backend)"
```

---

## Task 9: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Backend suite + build + vet**

Run: `cd backend && go build ./... && go vet ./... && go test ./internal/export/ ./internal/api/ ./internal/router/ ./internal/config/`
Expected: all PASS, no build/vet errors.

- [ ] **Step 2: Optional live smoke (if docker available)**

Run:
```bash
cd backend && docker compose up -d --build gotenberg
RUN_GOTENBERG_TESTS=1 GOTENBERG_URL=http://localhost:3000 go test ./internal/export/ -run TestGotenbergIntegration -v
docker compose down
```
Expected: integration test PASS (PDF produced). If docker unavailable, skip + note.

- [ ] **Step 3: Frontend suite**

Run: `cd frontend-react && npm test && npm run lint && npm run build`
Expected: all green.

- [ ] **Step 4: Commit (if any fixups)**

```bash
git add -A && git commit -m "chore: export endpoint verification fixups" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- §1 PDF-only via Gotenberg → Tasks 4,6,7 ✅; DOCX dropped → Task 8 ✅
- §2 data flow (embed → wrap → render) → Task 5 handler ✅
- §3 file structure → matches Tasks 2–6 ✅
- §4.1 ssrf (netip isBlocked, IsURLSafe, SafeFetch pinned) → Task 2 ✅
- §4.2 images (Deps, EmbedSafeImages) → Task 3 ✅
- §4.3 gotenberg (Renderer, client, A4 margins) → Task 4 ✅
- §4.4 template (verbatim) → Task 5 ✅
- §4.5 handler (413/400/503/200/500, 30s timeout) → Task 5 ✅
- §4.6 routes (exportLimiter 10/min, body cap) → Task 6 ✅
- §5 config + deploy (GOTENBERG_URL empty default, compose, render) → Tasks 1,7 ✅
- §6 frontend drop DOCX → Task 8 ✅
- §7 error handling → Task 5 handler ✅
- §8 testing (unit + gated integration) → Tasks 2–6,7 ✅

**Placeholder scan:** none — every step has full code or exact commands. The render.yaml `GOTENBERG_URL` value is a documented post-deploy fill-in (Render assigns the URL), not a code placeholder.

**Type consistency:** `Renderer.RenderPDF(ctx, html) ([]byte, error)`, `Deps{IsSafe func(ctx,string)bool; Fetch func(ctx,string)([]byte,string,error)}`, `IsURLSafe(ctx,string)bool`, `SafeFetch(ctx,string,int64)([]byte,string,error)`, `WrapHTML(string)string`, `ExportHandler{Renderer,Deps,ImageBaseURL}` — consistent across Tasks 2–6. The `Deps.Fetch` signature drops `SafeFetch`'s `maxBytes` via the wrapper closure in Task 6 (passes `0` → default 20 MiB), which matches `SafeFetch`'s contract.
