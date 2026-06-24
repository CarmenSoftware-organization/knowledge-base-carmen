# Design: Standard Response Envelope + Typed Structs

**Date:** 2026-06-25
**Status:** Approved (ready for implementation plan)
**Scope:** Backend (Go Fiber) + both frontends (React SPA, Next.js)

## 1. Context & Goal

Today every backend handler returns an ad-hoc JSON shape built inline with
`fiber.Map`:

- success lists: `{ "items": [...] }`, sometimes `{ "items", "total", "limit", "offset" }`
- other success: `{ "categories": [...] }`, `{ "category", "items" }`, raw payload objects,
  `{ "ok": true, "message": ... }`, `{ "status": "ok" }`
- errors: `{ "error": "<string>" }` (every error site)

There is almost no typed model layer (`models/public_api.go` holds only
`SystemStatusResponse`), and Swagger annotations all use
`map[string]interface{}` — so the OpenAPI spec exposes no real schema.

**Goal — do both at once:**

1. Wrap every JSON app endpoint in one consistent **response envelope**.
2. Replace inline `fiber.Map` with **typed structs** in `models/`, so the
   handlers are type-safe and Swagger renders real schemas.

## 2. Envelope Contract

Chosen shape: `success + data + error + meta`, with `error` as an object
(`{code, message}`) and domain-specific error codes.

Success and error are **separate structs** (cleaner than one struct with
nullable fields):

```go
// package internal/api/response

type Meta struct {
    Total  *int `json:"total,omitempty"`
    Limit  *int `json:"limit,omitempty"`
    Offset *int `json:"offset,omitempty"`
}

// Success — { "success": true, "data": <T>, "meta"?: {...} }
type Envelope[T any] struct {
    Success bool  `json:"success"` // always true
    Data    T     `json:"data"`    // lists must render [] not null (handlers already guard nil)
    Meta    *Meta `json:"meta,omitempty"`
}

// Error — { "success": false, "error": { "code", "message" } }
type ErrorBody struct {
    Code    string `json:"code"`
    Message string `json:"message"`
}
type ErrorResponse struct {
    Success bool      `json:"success"` // always false
    Error   ErrorBody `json:"error"`
}
```

**Wire examples**

```jsonc
// success (object)
{ "success": true, "data": { "id": "...", "title": "..." } }

// success (list + pagination)
{ "success": true, "data": [ {...} ], "meta": { "total": 42, "limit": 20, "offset": 0 } }

// error
{ "success": false, "error": { "code": "INVALID_BU", "message": "invalid bu parameter" } }
```

Rules:
- On success the `error` key is **absent**; on error the `data` key is **absent**.
- `meta` is present only for paginated list endpoints.
- HTTP status codes are preserved (200/202/400/401/404/409/500). The envelope
  duplicates success/failure in the body via `success` for client convenience.
- Empty lists serialize as `[]`, never `null` (handlers already do `if x == nil { x = []T{} }`).

### Helpers

```go
func OK[T any](c *fiber.Ctx, data T) error                       // 200 success
func OKStatus[T any](c *fiber.Ctx, status int, data T) error     // non-200 success (e.g. 202 reindex)
func List[T any](c *fiber.Ctx, data T, meta *Meta) error         // 200 success + meta
func Fail(c *fiber.Ctx, status int, code, message string) error  // error envelope
```

### Custom Fiber `ErrorHandler`

Set on app creation (`fiber.New(fiber.Config{ErrorHandler: response.ErrorHandler})`)
as a safety net: any returned `error`, `*fiber.Error`, unmatched route (404), or
panic recovery is rendered as `ErrorResponse`. Mapping:

- `*fiber.Error` → status from the error, `code` derived from status, `message` from the error text.
- other `error` → 500 `INTERNAL`.

Handlers still call `response.Fail(...)` explicitly for known errors (minimal
control-flow change vs. today's `return c.Status().JSON()`); the ErrorHandler only
catches the unhandled tail.

## 3. Error Code Catalog

`internal/api/response/codes.go` — constants. Codes are domain-specific where a
caller might branch on them, falling back to a status-derived code otherwise.

| Code | HTTP | Used by (current message) |
|---|---|---|
| `INVALID_BU` | 400 | documents (`invalid bu parameter`), chat history (`invalid bu`, `invalid bu: <slug>`) |
| `BU_NOT_FOUND` | 400 | chat feedback (`unknown bu`) |
| `INVALID_SLUG` | 400 | bu provision/deprovision (`invalid slug`) |
| `CANNOT_DEPROVISION_DEFAULT` | 400 | bu deprovision (`cannot deprovision default bu`) |
| `INVALID_BODY` | 400 | bu, chat feedback, chat record-history, route-test (`invalid JSON body` / `invalid body` / `invalid request body`) |
| `MISSING_PARAM` | 400 | faq (`module/sub/category/id is required`), wiki (`slug/path is required`), chat (`message is required`, `question is required`, `bu, question, answer required`) |
| `INVALID_ID` | 400 | faq entry (`invalid id`) |
| `INVALID_MESSAGE_ID` | 400 | chat feedback (`invalid message_id`) |
| `INVALID_SCORE` | 400 | chat feedback (`score must be 1 or -1`) |
| `NOT_FOUND` | 404 | wiki content (`not found`) |
| `FEEDBACK_TARGET_NOT_FOUND` | 404 | chat feedback (`feedback target not found`) |
| `REINDEX_RUNNING` | 409 | index rebuild (`reindex is already running for this bu`) |
| `EMBEDDING_FAILED` | 500 | chat record-history (`embedding failed: ...`) |
| `INTERNAL` | 500 | every generic `err.Error()` 500 site (DB scan, service errors, tx errors, save failures, generate-answer) |

`message` keeps the existing human-readable text (Thai/English as-is). Internal
DB error strings continue to be passed through in `message` for now (no change to
current information exposure); revisit later if we want to mask them.

## 4. Endpoint → Payload Mapping

In scope = JSON endpoints the frontends consume. For each, `data` is the typed
payload; new model types are added to `models/` (many reuse existing service
types). Excluded endpoints are listed in §5.

| Method / Route | `data` type | `meta` | Notes |
|---|---|---|---|
| GET `/api/system/status` | `models.SystemStatusResponse` | – | already typed |
| GET `/api/business-units` | `[]models.BusinessUnit` | – | |
| POST `/api/business-units/provision` | `models.ProvisionResult{Slug,Name,Description}` | – | drop `ok`/`message` (envelope conveys success) |
| POST `/api/business-units/deprovision` | `models.DeprovisionResult{Slug}` | – | |
| GET `/api/wiki/list` | `[]services.WikiEntry` | – | |
| GET `/api/wiki/categories` | `[]services.CategoryEntry` | – | |
| GET `/api/wiki/sidebar` | `[]services.SidebarCategory` | – | top key was `categories` |
| GET `/api/wiki/category/:slug` | `models.WikiCategoryPayload{Category,Items}` | – | composite shape preserved inside `data` |
| GET `/api/wiki/content/*` | content type (service) | – | already a typed object |
| GET `/api/wiki/search` | `[]services.SearchResult` | – | empty query → `data: []` |
| POST `/api/wiki/sync` | `models.SyncResult{Message,Audit?,AuditError?}` | – | drop `ok` |
| GET `/api/wiki/sync/audit` | `models.SyncAuditResult{Audit}` | – | |
| GET `/api/faq/modules` | faq module list type | – | |
| GET `/api/faq/:module` | module-with-children type | – | |
| GET `/api/faq/:module/:sub/:category` | category listing type | – | |
| GET `/api/faq/entry/:id` | faq entry type | – | |
| GET `/api/documents` | `[]models.DocumentSummary` | – | move `documentRow` → `models.DocumentSummary` (exported) |
| GET `/api/activity/list` | `[]models.ActivityLog` | `{total,limit,offset}` | |
| GET `/api/activity/summary` | `models.ActivitySummary{Period,Items}` | – | `period` moves into `data` |
| POST `/api/index/rebuild` | `models.ActionResult{Message}` | – | **202** via `OKStatus` |
| POST `/api/index/rebuild/one` | `models.ReindexOneResult{BU,Path,Message}` | – | |
| GET `/api/index/rebuild/status` | `models.ReindexStatus{BU,Running,StartedAt,RunningForSec}` | – | |
| POST `/api/index/rebuild/unlock` | `models.ReindexUnlock{BU,WasRunning,Message}` | – | |
| POST `/api/chat/ask` | `models.ChatAskResponse` | – | already typed; error path → `ErrorResponse` |
| POST `/api/chat/feedback/:message_id` | `models.ActionResult{Status:"ok"}` | – | |
| DELETE `/api/chat/clear/:room_id` | `models.ClearResult{Status,RoomID}` | – | |
| POST `/api/chat/record-history` | `models.RecordHistoryResult{ID?,Skipped?}` | – | history-disabled → `{skipped:"history disabled"}` |
| GET `/api/chat/history/list` | `[]models.ChatHistoryEntry` | `{total,limit,offset}` | |
| POST `/api/chat/intent-test` | `models.IntentTestResult{...6 fields}` | – | admin/debug |
| POST `/api/chat/route-test` | router result type | – | admin/debug |

New model structs live in `models/` (or reuse the service package type when one
already exists and is JSON-tagged). `documentRow` is promoted from the `api`
package to `models.DocumentSummary` so Swagger can reference it.

## 5. Out of Scope (not wrapped)

- `POST /api/chat/stream` — NDJSON; each line already has its own event shape (unchanged).
- `GET /api/chat/images/*` and `/wiki-assets/*` — binary file responses (`SendFile`).
- `POST /webhook/github` — consumed by GitHub, not the frontends (GitHub ignores the body).
- `GET /health` — liveness probe; UptimeRobot + keepalive cron check `status:"ok"` directly. Wrapping it would break those monitors. **Leave as-is.**
- Static/docs: `/`, `/swagger`, `/swagger/*`, `/openapi.json`, `/scalar`.

## 6. Backend Implementation

New package `internal/api/response`:
- `response.go` — `Meta`, `Envelope[T]`, `ErrorBody`, `ErrorResponse`, helpers `OK`/`OKStatus`/`List`/`Fail`.
- `codes.go` — error-code constants (§3) + `codeForStatus(status int) string` used by the ErrorHandler.
- `errorhandler.go` — `ErrorHandler(c *fiber.Ctx, err error) error`.

Wire-up:
- `fiber.New(...)` (in `cmd/server/main.go` / app bootstrap) gains `ErrorHandler: response.ErrorHandler`.
- Each handler: replace `c.JSON(fiber.Map{...})` with `response.OK/List/OKStatus`,
  and `c.Status(...).JSON(fiber.Map{"error": ...})` with `response.Fail(c, status, code, msg)`.
- New payload structs added to `models/`.

Convert handler-by-handler (one group per commit): system → business-units →
wiki → faq → documents → activity → indexing → chat (ask/feedback/clear) →
chat-history (record/list/route).

## 7. Swagger / OpenAPI

- Every `@Success` annotation in `internal/apidoc/swagger_routes.go` changes from
  `map[string]interface{}` to `response.Envelope[<payload type>]`.
- Add `@Failure` annotations referencing `response.ErrorResponse`.
- swag **v1.16.6** supports generic types, so `response.Envelope[models.WikiCategoryPayload]`
  renders a proper schema.
- Regenerate:
  ```
  cd backend && go run github.com/swaggo/swag/cmd/swag@v1.16.6 init \
    -g main.go -o docs -d ./cmd/server,./internal/apidoc,./internal/models
  ```
- Verify generated `docs/swagger.json` shows instantiated generic schemas; Scalar
  renders at `/swagger`.

## 8. Frontend (React SPA + Next.js — near-identical diffs, applied twice)

Add a central unwrap helper in `lib/fetch-utils.ts` (both projects):

```ts
export class ApiError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export async function apiJson<T>(url: string, init?: RequestInit): Promise<{ data: T; meta?: Meta }> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  // tolerant during rollout: accept enveloped OR legacy flat shape
  if (body && body.success === false) {
    throw new ApiError(body.error?.code ?? "UNKNOWN", body.error?.message ?? `HTTP ${res.status}`);
  }
  if (body && typeof body.success === "boolean") {
    return { data: body.data as T, meta: body.meta };
  }
  // legacy fallback (pre-envelope backend) — remove after rollout settles
  return { data: body as T };
}
```

Call-site updates (both frontends):
- `lib/wiki-api.ts`: `data.items` / `json.categories` → use the unwrapped `data`;
  business-units, sidebar, search, faq lists, documents, activity all go through `apiJson`.
- chat/ask error parsing (`data.error || ...`) → `err` from `apiJson` is an
  `ApiError` carrying `code` + `message`.
- `use-carmen-api.ts`, `faq-cache.ts`, route loaders (`home.tsx`, `faq/*`),
  components (`bu-switcher.tsx`, `activity-log-table.tsx`) updated to the helper.
- `use-chat-stream.ts` (NDJSON) **unchanged** — stream is out of scope.

The tolerant unwrap (`body.success` boolean check, legacy fallback) lets old and
new shapes coexist, shrinking the deploy window risk (§10). The legacy branch is
removed in a follow-up once all services run the new backend.

## 9. Testing

**Backend (TDD — adjust/author tests before changing handlers):**
- New unit tests for `response` package: `OK`/`List`/`Fail`/`OKStatus` shapes,
  `ErrorHandler` mapping (fiber.Error, plain error, 404), `codeForStatus`.
- Update existing handler/integration tests to assert the envelope
  (`success`, `data.*`, `error.code`) — affected: `bu_handler_test.go`,
  `chat_feedback_test.go`, `chat_clear_test.go`, `chat_ask_*_test.go`,
  `chat_stream_*` (only where they touch non-stream JSON), activity/wiki tests.
- `go build ./... && go vet ./... && go test ./...` green.

**Frontend:**
- Update fetch mocks in tests to return the enveloped shape.
- React SPA: `bun run test` (isolate mode) must stay **40/0** — do **not** add
  `afterEach(cleanup)` (known regression). Never rely on plain `bun test`.
- Next.js: `bun test` green, `npm run build` succeeds.

**Docs:** regenerate OpenAPI and eyeball `/swagger` for typed schemas.

## 10. Rollout & Deploy Ordering

Single coordinated change set. Implementation order:
1. Backend `response` package + helpers + ErrorHandler + tests.
2. New `models/` payload structs.
3. Convert handlers group-by-group (build/test after each).
4. Swagger annotations + regen.
5. Frontend `apiJson` helper + call sites (React, then Next).
6. Frontend tests + builds.
7. Deploy in this order: both frontends (Vercel, manual `vercel --prod`) **first**,
   then backend (Render).

**Window risk:** the two Vercel frontends deploy independently and have no Git
connection, so backend and frontends cannot flip atomically. The **tolerant
unwrap** (§8) makes the new frontend accept *both* shapes, so deploying the
frontends first is safe — they keep working against the still-legacy backend via
the fallback branch — and then deploying the backend flips them onto the envelope
branch with no break. Browser tabs already loaded on the *old* frontend bundle
will break on envelope responses until refreshed — acceptable per the "update
everything together" decision. Deploy during low traffic.

## 11. Decisions Log

- Envelope shape: `success + data + error + meta` (error as `{code,message}`).
- `error.code`: **domain-specific** codes (§3), not status-only.
- Frontend: **update backend + both frontends together** (no permanent versioned API).
- Excluded: chat/stream, chat images / wiki-assets, GitHub webhook, `/health`.
- Implementation: **generic `Envelope[T]` + helpers** (Approach A) — type-safe,
  clean Swagger via swag v1.16 generics, minimal boilerplate.

## 12. File Change Summary

**Backend**
- new `internal/api/response/{response,codes,errorhandler}.go` (+ tests)
- new model structs in `internal/models/` (public_api.go or new files)
- promote `documentRow` → `models.DocumentSummary`
- edit every in-scope handler in `internal/api/*.go`
- set `ErrorHandler` in app bootstrap (`cmd/server/main.go`)
- rewrite `@Success`/`@Failure` in `internal/apidoc/swagger_routes.go`; regen `docs/`
- update affected `internal/api/*_test.go`

**Frontend (×2: `frontend-react/src`, `frontend-next`)**
- `lib/fetch-utils.ts`: add `apiJson` + `ApiError`
- `lib/wiki-api.ts`, `lib/faq-cache.ts`, `hooks/use-carmen-api.ts`, route loaders, components: route through `apiJson`, unwrap `data`
- update fetch mocks in tests
