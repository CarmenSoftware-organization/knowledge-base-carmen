# Go Export Endpoint (PDF) — Design Spec

- **Date:** 2026-06-23
- **Status:** Approved (design)
- **Component:** `backend/` (Go Fiber) + a Gotenberg sidecar; small change in `frontend-react/`
- **Depends from:** `docs/superpowers/specs/2026-06-23-frontend-react-spa-clone-design.md` (§8 flagged this as the out-of-scope export dependency)

## 1. Goal & Context

The `frontend-react` SPA chat widget already calls `${VITE_API_BASE}/api/export/pdf` and `/api/export/docx` to export a chat answer, but those endpoints do not exist on the Go backend (the old Next.js `app/api/export/*` puppeteer/`html-to-docx` routes were dropped in the SPA migration). This builds the **PDF** endpoint natively in the Go backend so export works in production.

**Decisions made during brainstorming:**
- **PDF rendering via a Gotenberg sidecar** (official `gotenberg/gotenberg:8`), not Chromium-in-the-Go-image. Reason: the backend runs on Render free tier (512 MB, `alpine` image); bundling Chromium per-request risks OOM and bloats the image. Gotenberg isolates Chromium's memory in a separate service and keeps the Go image light. It gives the same Chromium fidelity (oklch/modern CSS) the original puppeteer path had.
- **PDF-only. DOCX is dropped.** Gotenberg has no HTML→DOCX route, and HTML→DOCX in Go has no good library (the original used Node `html-to-docx`); LibreOffice is too heavy for the free tier. The DOCX export button is removed from the SPA.
- **All SSRF defense stays in the Go handler.** Images are fetched server-side with an IP-pinned dialer and inlined as base64 before the HTML is handed to Gotenberg, so Gotenberg renders fully self-contained HTML and makes no outbound requests for our content.
- **Public endpoint, rate-limited** (no admin key — the chat widget is anonymous), with a body-size cap and a per-request render timeout.

### Non-goals
- No DOCX. No Chromium in the Go image. No changes to chat/wiki/other backend features.
- The Gotenberg→DOCX/LibreOffice path is explicitly out of scope.

## 2. Architecture & Data Flow

```
chat widget (SPA)                Go Fiber backend                    Gotenberg (sidecar)
  POST /api/export/pdf  ───────▶  ExportHandler.PDF                   Chromium HTML→PDF
   { html }                        1. parse + size-cap body
                                   2. EmbedSafeImages(html)  ─fetch──▶ (SSRF-guarded,
                                      strip unsafe / inline safe       IP-pinned, no
                                        as base64 data: URIs           redirects, capped)
                                   3. WrapHTML(styled template)
                                   4. Renderer.RenderPDF ───────────▶ /forms/chromium/
                                      (multipart to GOTENBERG_URL)     convert/html
                                   5. stream PDF bytes back  ◀────────  application/pdf
  ◀── application/pdf  ◀──────────  Content-Disposition: attachment
```

- The HTML handed to Gotenberg is **fully self-contained** (safe images inlined as data: URIs, unsafe ones stripped) → Gotenberg makes no outbound requests for our content.
- Gotenberg is a **separate service** reached via `GOTENBERG_URL`; Chromium memory lives there, not in the 512 MB Go instance.
- The PDF styling `<style>` block moves into the Go handler verbatim so output looks identical to the original.

## 3. File Structure

New package `internal/export/` (rendering logic, framework-agnostic, unit-testable) + handler in `internal/api/` + route registration in `internal/router/`.

| File | Responsibility |
|---|---|
| `backend/internal/export/ssrf.go` | `isBlocked(netip.Addr)`, `IsURLSafe(ctx,url)`, `SafeFetch(ctx,url,maxBytes)` with an IP-pinned dialer |
| `backend/internal/export/ssrf_test.go` | IP-range coverage, redirect rejection, body cap |
| `backend/internal/export/images.go` | `EmbedSafeImages(ctx, html, baseURL, Deps)` |
| `backend/internal/export/images_test.go` | keep/strip/inline cases with injected `IsSafe`/`Fetch` |
| `backend/internal/export/template.go` | `WrapHTML(body string) string` (verbatim styled wrapper) |
| `backend/internal/export/gotenberg.go` | `Renderer` interface + `GotenbergClient.RenderPDF` |
| `backend/internal/export/gotenberg_test.go` | multipart shape + PDF passthrough via `httptest` |
| `backend/internal/api/export_handler.go` | `ExportHandler.PDF(c)` — orchestration |
| `backend/internal/api/export_handler_test.go` | 400 / 503 / 200+headers / 500 via a mock `Renderer` |
| `backend/internal/router/export_routes.go` | `app.Post("/api/export/pdf", exportLimiter, h.PDF)` |

Modified: `backend/internal/config/config.go` (+`GOTENBERG_URL`, `EXPORT_IMAGE_BASE_URL`), `backend/cmd/server/main.go` (wire handler when configured), `backend/internal/router/routes.go` (call `RegisterExportRoutes`), `backend/docker-compose.yml` (+gotenberg service), `render.yaml` (+gotenberg service + `GOTENBERG_URL`), `frontend-react/src/components/chat/carmen-message.tsx` (remove DOCX).

## 4. Components

### 4.1 `ssrf.go` — port of `ssrf-guard.ts` via stdlib
- `func isBlocked(a netip.Addr) bool`: after `a = a.Unmap()`, return `a.IsLoopback() || a.IsPrivate() || a.IsLinkLocalUnicast() || a.IsLinkLocalMulticast() || a.IsUnspecified()`. (`IsPrivate` = RFC1918 + IPv6 ULA `fc00::/7`; `IsLinkLocalUnicast` = IPv4 `169.254/16` incl. cloud metadata + IPv6 `fe80::/10`.)
- `func IsURLSafe(ctx context.Context, rawURL string) bool`: parse URL; require scheme `http`/`https`; `net.DefaultResolver.LookupNetIP(ctx,"ip",host)`; return false if resolution fails or **any** IP `isBlocked` (fail-closed). IP-literal hosts are validated directly.
- `func SafeFetch(ctx, rawURL string, maxBytes int64) (body []byte, contentType string, err error)`: `http.Client` whose `Transport.DialContext` re-resolves the host, validates every IP, and dials a validated IP (pins the connection → no DNS-rebinding TOCTOU; TLS SNI uses the original hostname so certs validate). `CheckRedirect` returns an error (no redirects). Body via `io.LimitReader(resp.Body, maxBytes)`. Bounded by `ctx`. Defaults: `maxBytes = 20 MiB`, timeout 8 s.

### 4.2 `images.go` — port of `embedSafeImages`
- `type Deps struct { IsSafe func(context.Context, string) bool; Fetch func(context.Context, string) (body []byte, ct string, err error) }` (injected; production uses `IsURLSafe`/`SafeFetch`).
- `func EmbedSafeImages(ctx, html, baseURL string, d Deps) string`: regex `(?i)<img\b[^>]*>` to find tags; extract `src="([^"]*)"`; classify — `data:`/`blob:` kept as-is; `/…` → `baseURL + src` (http path); absolute `http(s)://` → http path; anything else stripped. For http: `IsSafe` false → strip tag; else `Fetch` → on success replace src with `data:<ct>;base64,<b64>`; on fetch error → leave the (absolute) URL (matches original). Offset-based rewrite so duplicate tags/order are handled (faithful to TS).

### 4.3 `gotenberg.go` — renderer
- `type Renderer interface { RenderPDF(ctx context.Context, html string) ([]byte, error) }`.
- `type GotenbergClient struct { BaseURL string; HTTP *http.Client }`; `RenderPDF` builds `multipart/form-data`: file part field `files`, filename `index.html`, content = html; text fields `paperWidth=8.27`, `paperHeight=11.69` (A4 inches), `marginTop=0.79`, `marginBottom=0.79`, `marginLeft=0.59`, `marginRight=0.59` (original 20 mm/15 mm), `printBackground=true`. `POST {BaseURL}/forms/chromium/convert/html`. Non-2xx → error (include status). Returns response body (PDF bytes). Uses `ctx` for timeout.

### 4.4 `template.go`
- `func WrapHTML(body string) string`: the exact `<!DOCTYPE html><html><head>…<style>{the original PDF route's CSS}</style></head><body>{body}</body></html>` from `frontend/app/api/export/pdf/route.ts`, with `${embeddedHtml}` → `body`.

### 4.5 `export_handler.go`
- `type ExportHandler struct { Renderer export.Renderer; Deps export.Deps; ImageBaseURL string }`.
- `func (h *ExportHandler) PDF(c *fiber.Ctx) error`:
  1. Reject bodies over `~2 MB` (`len(c.Body()) > 2*1024*1024` → `413`; see §4.6). Bind JSON `{ HTML string `json:"html"` }`; if empty → `400 {"error":"html is required"}`.
  2. If `h.Renderer == nil` → `503 {"error":"export unavailable"}`.
  3. `ctx, cancel := context.WithTimeout(c.UserContext(), 30*time.Second)`; defer cancel.
  4. `embedded := export.EmbedSafeImages(ctx, body.HTML, h.ImageBaseURL, h.Deps)`; `full := export.WrapHTML(embedded)`; `pdf, err := h.Renderer.RenderPDF(ctx, full)`.
  5. err → log + `500 {"error":"Export failed"}`. Success → set `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="carmen-export.pdf"`, `c.Send(pdf)`.

### 4.6 `export_routes.go`
- `func RegisterExportRoutes(app *fiber.App, h *api.ExportHandler)`: `app.Post("/api/export/pdf", exportLimiter, fiber.New BodyLimit?, h.PDF)`.
- `exportLimiter`: `github.com/gofiber/fiber/v2/middleware/limiter`, `Max: 10, Expiration: 1*time.Minute` (per IP) — stricter than chat since each render is expensive.
- Route-level body cap: a dedicated sub-app/group with `BodyLimit: 2*1024*1024`, or check `len(c.Body())` at the top of the handler returning `413` (simpler; chosen).

## 5. Config & Deploy

- `internal/config`: add `GotenbergURL` (env `GOTENBERG_URL`, default `http://localhost:3000`) and `ExportImageBaseURL` (env `EXPORT_IMAGE_BASE_URL`, default = the backend's public base URL; used to resolve relative `/…` image srcs). In `main.go`, construct `GotenbergClient` + `ExportHandler` only when `GOTENBERG_URL != ""`; otherwise register the route with a `nil` Renderer so it returns `503` (feature visibly unavailable, not a 404).
- `backend/docker-compose.yml`: add a `gotenberg` service (`gotenberg/gotenberg:8`, expose `3000`), and set `GOTENBERG_URL=http://gotenberg:3000` on the backend service.
- `render.yaml`: add a second service (`gotenberg`, runtime docker, image `gotenberg/gotenberg:8`, internal) and set `GOTENBERG_URL` on `carmen-backend` to its internal URL. Note in the file: Render free services cold-start on idle — the first export after idle may be slow.
- The Go runtime image does **not** change (no Chromium added).

## 6. Frontend change (`frontend-react`)

In `src/components/chat/carmen-message.tsx`: remove `handleExportDocx`, the "Export Word"/`export_doc` menu item, and any now-unused `exportLoading === "docx"` state branch. Keep `handleExportPdf` (already pointed at `${API_BASE}/api/export/pdf`). The DOCX endpoint is not built; leaving the button would surface a guaranteed failure.

## 7. Error Handling

- Missing/empty `html` → `400`. Body over cap → `413`. Gotenberg unconfigured → `503`. Image fetch failures are non-fatal (image left as URL / stripped). Gotenberg non-2xx or timeout → `500 {"error":"Export failed"}` (details logged server-side, not leaked). All SSRF rejections are silent strips, never errors to the client.

## 8. Testing

- **Unit (no network):** `ssrf_test.go` ports the TS IP cases — IPv4 loopback/`0.0.0.0`/`10/8`/`127/8`/`169.254/16`/`172.16–31`/`192.168`, IPv6 `::1`/`::`/`fc00::/7`/`fe80::/10`/IPv4-mapped `::ffff:127.0.0.1`, plus public IPs pass; `SafeFetch` rejects redirects and enforces the byte cap (via `httptest`). `images_test.go` injects fake `IsSafe`/`Fetch` + an `httptest` image server: data: kept, unsafe stripped, safe inlined as base64, relative-unresolvable stripped, fetch-error leaves URL. `gotenberg_test.go`: `httptest` server asserts the multipart fields/file and returns fake `%PDF` bytes. `export_handler_test.go`: mock `Renderer` → `400` (no html), `503` (nil renderer), `200` + `Content-Type`/`Content-Disposition` (success), `500` (render error).
- **Integration (gated):** `RUN_GOTENBERG_TESTS=1` against a real Gotenberg (docker compose) renders a known HTML and asserts the response starts with `%PDF-`.
- **Acceptance:** `go build ./...`, `go vet ./...`, `go test ./...` green; with `docker compose up` (backend + gotenberg) a real `POST /api/export/pdf` returns a valid PDF; SPA chat "Export PDF" downloads a styled PDF.

## 9. Risks & Watch-outs

- **Gotenberg cold start** on Render free tier (idle spin-down) → first export slow; acceptable, documented.
- **Gotenberg availability** → endpoint returns `500`/`503` when down; the SPA already swallows export errors (no crash).
- **Margin units**: Gotenberg v8 Chromium margins are inches — verify the mm→inch conversion renders with the intended margins during integration testing.
- **Relative image srcs**: resolved against `EXPORT_IMAGE_BASE_URL`; chat content images are generally absolute, so this mainly matters for backend-served relative paths — verify during integration.
