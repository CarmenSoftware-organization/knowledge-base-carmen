# Response Envelope + Typed Structs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap every in-scope JSON endpoint in a standard `{ success, data, error, meta }` envelope backed by typed Go structs, and update both frontends to unwrap it.

**Architecture:** A new `internal/api/response` package provides a generic `Envelope[T]` plus `OK`/`List`/`OKStatus`/`Fail` helpers and a global Fiber `ErrorHandler`. Handlers stop building `fiber.Map` inline and return typed payloads (new structs in `models/` for pure data, in `services/` where they compose service types). Both frontends gain an `apiJson<T>()` helper that unwraps `data`/`meta` and throws `ApiError` on `success:false`; each `wiki-api.ts` function keeps its existing return shape so components are untouched.

**Tech Stack:** Go 1.x + Fiber v2, swaggo/swag v1.16.6 (generic OpenAPI), React (Vite) + Next.js (App Router), Bun test runner.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-06-25-response-envelope-design.md` — authoritative.
- **Envelope:** success = `{ "success": true, "data": <T>, "meta"?: {...} }` (no `error` key); error = `{ "success": false, "error": { "code", "message" } }` (no `data` key). HTTP status codes preserved.
- **Out of scope (do NOT wrap):** `POST /api/chat/stream`, `GET /api/chat/images/*`, `/wiki-assets/*`, `POST /webhook/github`, `GET /health`, and static docs (`/`, `/swagger`, `/openapi.json`, `/scalar`).
- **Error codes:** domain-specific constants (see Task 2). `message` keeps the existing human-readable text verbatim.
- **Empty lists** serialize as `[]`, never `null` (handlers already guard `if x == nil { x = []T{} }`).
- **Module path:** `github.com/CarmenSoftware-organization/knowledge-base-carmen/backend`.
- **Commit message footer (every commit):**
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
- **Branch:** `feat/response-envelope` (already created; spec already committed there).
- **Backend test gate:** `cd backend && go build ./... && go vet ./... && go test ./...`.
- **React test gate:** `cd frontend-react && bun run test` must stay **40/0** (isolate mode). Never use plain `bun test`. Do NOT add `afterEach(cleanup)`.
- **Next test gate:** `cd frontend-next && bun test` green + `npm run build` (or `bun run build`) succeeds.

---

## File Structure

**Backend — new**
- `backend/internal/api/response/response.go` — `Meta`, `Envelope[T]`, `ErrorBody`, `ErrorResponse`, `OK`/`OKStatus`/`List`/`Fail`, `IntPtr`.
- `backend/internal/api/response/codes.go` — error-code constants + `codeForStatus`.
- `backend/internal/api/response/errorhandler.go` — global `ErrorHandler`.
- `backend/internal/api/response/{response,errorhandler}_test.go`.
- `backend/internal/models/api_payloads.go` — pure payload structs.

**Backend — modified**
- `backend/internal/services/payloads.go` (new, package `services`) — composite payloads referencing service types.
- `backend/cmd/server/main.go` — set `ErrorHandler` in `fiber.Config`.
- every in-scope handler in `backend/internal/api/*.go`.
- `backend/internal/api/chat_clear_test.go` — body assertions.
- `backend/tests/parity/harness_test.go` — unwrap chat/ask body (gated).
- `backend/internal/apidoc/swagger_routes.go` + regenerated `backend/docs/*`.

**Frontend — modified/new**
- `frontend-react/src/lib/fetch-utils.ts` — add `apiJson`, `ApiError`, `Meta`.
- `frontend-react/src/lib/wiki-api.ts` — internal unwrap (return shapes unchanged).
- `frontend-react/src/routes/admin-activity.tsx` — loader unwrap.
- `frontend-next/lib/fetch-utils.ts` (create if absent) — same helper.
- `frontend-next/lib/wiki-api.ts` + any Next direct consumers.
- frontend test mocks in both apps.

---

## Task 1: `response` package — envelope + helpers

**Files:**
- Create: `backend/internal/api/response/response.go`
- Test: `backend/internal/api/response/response_test.go`

**Interfaces:**
- Produces: `Meta{Total,Limit,Offset *int}`, `Envelope[T]{Success bool; Data T; Meta *Meta}`, `ErrorBody{Code,Message string}`, `ErrorResponse{Success bool; Error ErrorBody}`, and funcs `OK[T any](c,data) error`, `OKStatus[T any](c,status,data) error`, `List[T any](c,data,*Meta) error`, `Fail(c,status int,code,message string) error`, `IntPtr(int) *int`.

- [ ] **Step 1: Write the failing test**

```go
// backend/internal/api/response/response_test.go
package response

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func decode(t *testing.T, app *fiber.App, method, path string) (int, map[string]any) {
	t.Helper()
	resp, err := app.Test(httptest.NewRequest(method, path, nil), -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()
	var body map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return resp.StatusCode, body
}

func TestOK_WrapsDataSuccessTrueNoError(t *testing.T) {
	app := fiber.New()
	app.Get("/t", func(c *fiber.Ctx) error { return OK(c, fiber.Map{"x": 1}) })
	status, body := decode(t, app, "GET", "/t")
	if status != 200 {
		t.Fatalf("status %d", status)
	}
	if body["success"] != true {
		t.Errorf("success=%v", body["success"])
	}
	if _, ok := body["data"]; !ok {
		t.Errorf("data missing")
	}
	if _, ok := body["error"]; ok {
		t.Errorf("error must be absent on success")
	}
}

func TestList_IncludesMeta(t *testing.T) {
	app := fiber.New()
	app.Get("/t", func(c *fiber.Ctx) error {
		return List(c, []int{1, 2}, &Meta{Total: IntPtr(2), Limit: IntPtr(20), Offset: IntPtr(0)})
	})
	_, body := decode(t, app, "GET", "/t")
	meta, ok := body["meta"].(map[string]any)
	if !ok {
		t.Fatalf("meta missing: %v", body)
	}
	if meta["total"].(float64) != 2 {
		t.Errorf("total=%v", meta["total"])
	}
}

func TestOKStatus_SetsStatus(t *testing.T) {
	app := fiber.New()
	app.Get("/t", func(c *fiber.Ctx) error { return OKStatus(c, 202, fiber.Map{"m": "go"}) })
	status, body := decode(t, app, "GET", "/t")
	if status != 202 {
		t.Fatalf("status %d", status)
	}
	if body["success"] != true {
		t.Errorf("success=%v", body["success"])
	}
}

func TestFail_WrapsErrorSuccessFalseNoData(t *testing.T) {
	app := fiber.New()
	app.Get("/t", func(c *fiber.Ctx) error {
		return Fail(c, fiber.StatusBadRequest, "INVALID_BU", "invalid bu")
	})
	status, body := decode(t, app, "GET", "/t")
	if status != 400 {
		t.Fatalf("status %d", status)
	}
	if body["success"] != false {
		t.Errorf("success=%v", body["success"])
	}
	e, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("error missing")
	}
	if e["code"] != "INVALID_BU" || e["message"] != "invalid bu" {
		t.Errorf("error=%v", e)
	}
	if _, ok := body["data"]; ok {
		t.Errorf("data must be absent on error")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/api/response/ -v`
Expected: FAIL — package/identifiers `OK`, `List`, `Fail`, `Meta`, `IntPtr` undefined.

- [ ] **Step 3: Write minimal implementation**

```go
// backend/internal/api/response/response.go
package response

import "github.com/gofiber/fiber/v2"

// Meta carries pagination info for list endpoints.
type Meta struct {
	Total  *int `json:"total,omitempty"`
	Limit  *int `json:"limit,omitempty"`
	Offset *int `json:"offset,omitempty"`
}

// Envelope is the standard success response: {"success":true,"data":<T>,"meta"?:{...}}.
type Envelope[T any] struct {
	Success bool  `json:"success"`
	Data    T     `json:"data"`
	Meta    *Meta `json:"meta,omitempty"`
}

// ErrorBody is the error payload carried by ErrorResponse.
type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ErrorResponse is the standard error response: {"success":false,"error":{...}}.
type ErrorResponse struct {
	Success bool      `json:"success"`
	Error   ErrorBody `json:"error"`
}

// OK writes a 200 success envelope.
func OK[T any](c *fiber.Ctx, data T) error {
	return c.JSON(Envelope[T]{Success: true, Data: data})
}

// OKStatus writes a success envelope with a custom HTTP status (e.g. 202).
func OKStatus[T any](c *fiber.Ctx, status int, data T) error {
	return c.Status(status).JSON(Envelope[T]{Success: true, Data: data})
}

// List writes a 200 success envelope with pagination meta.
func List[T any](c *fiber.Ctx, data T, meta *Meta) error {
	return c.JSON(Envelope[T]{Success: true, Data: data, Meta: meta})
}

// Fail writes an error envelope with the given HTTP status, code and message.
func Fail(c *fiber.Ctx, status int, code, message string) error {
	return c.Status(status).JSON(ErrorResponse{Success: false, Error: ErrorBody{Code: code, Message: message}})
}

// IntPtr returns a pointer to v (for building Meta).
func IntPtr(v int) *int { return &v }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/api/response/ -v`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/internal/api/response/response.go backend/internal/api/response/response_test.go
git commit -m "$(cat <<'EOF'
feat(backend): add response envelope package (Envelope[T] + helpers)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Error codes + global ErrorHandler

**Files:**
- Create: `backend/internal/api/response/codes.go`
- Create: `backend/internal/api/response/errorhandler.go`
- Test: `backend/internal/api/response/errorhandler_test.go`
- Modify: `backend/cmd/server/main.go:128` (add `ErrorHandler` to `fiber.Config`)

**Interfaces:**
- Consumes: `ErrorResponse`, `ErrorBody` (Task 1).
- Produces: error-code constants `CodeInvalidBU`, `CodeBUNotFound`, `CodeInvalidSlug`, `CodeCannotDeprovisionDefault`, `CodeInvalidBody`, `CodeMissingParam`, `CodeInvalidID`, `CodeInvalidMessageID`, `CodeInvalidScore`, `CodeNotFound`, `CodeFeedbackTargetNotFound`, `CodeReindexRunning`, `CodeEmbeddingFailed`, `CodeInternal`, `CodeBadRequest`, `CodeUnauthorized`, `CodeForbidden`, `CodeConflict`; func `codeForStatus(int) string`; func `ErrorHandler(c *fiber.Ctx, err error) error`.

- [ ] **Step 1: Write the failing test**

```go
// backend/internal/api/response/errorhandler_test.go
package response

import (
	"encoding/json"
	"errors"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func runEH(t *testing.T, h fiber.Handler) (int, map[string]any) {
	t.Helper()
	app := fiber.New(fiber.Config{ErrorHandler: ErrorHandler})
	app.Get("/t", h)
	resp, err := app.Test(httptest.NewRequest("GET", "/t", nil), -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()
	var body map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&body)
	return resp.StatusCode, body
}

func TestErrorHandler_FiberErrorMapsStatusAndCode(t *testing.T) {
	status, body := runEH(t, func(c *fiber.Ctx) error {
		return fiber.NewError(fiber.StatusNotFound, "nope")
	})
	if status != 404 {
		t.Fatalf("status %d", status)
	}
	if body["success"] != false {
		t.Errorf("success=%v", body["success"])
	}
	e := body["error"].(map[string]any)
	if e["code"] != "NOT_FOUND" {
		t.Errorf("code=%v", e["code"])
	}
}

func TestErrorHandler_PlainErrorIs500Internal(t *testing.T) {
	status, body := runEH(t, func(c *fiber.Ctx) error { return errors.New("boom") })
	if status != 500 {
		t.Fatalf("status %d", status)
	}
	e := body["error"].(map[string]any)
	if e["code"] != "INTERNAL" {
		t.Errorf("code=%v", e["code"])
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/api/response/ -run TestErrorHandler -v`
Expected: FAIL — `ErrorHandler` undefined.

- [ ] **Step 3: Write minimal implementation**

```go
// backend/internal/api/response/codes.go
package response

import "github.com/gofiber/fiber/v2"

// Domain error codes — stable strings clients may branch on.
const (
	CodeInvalidBU                = "INVALID_BU"
	CodeBUNotFound               = "BU_NOT_FOUND"
	CodeInvalidSlug              = "INVALID_SLUG"
	CodeCannotDeprovisionDefault = "CANNOT_DEPROVISION_DEFAULT"
	CodeInvalidBody              = "INVALID_BODY"
	CodeMissingParam             = "MISSING_PARAM"
	CodeInvalidID                = "INVALID_ID"
	CodeInvalidMessageID         = "INVALID_MESSAGE_ID"
	CodeInvalidScore             = "INVALID_SCORE"
	CodeNotFound                 = "NOT_FOUND"
	CodeFeedbackTargetNotFound   = "FEEDBACK_TARGET_NOT_FOUND"
	CodeReindexRunning           = "REINDEX_RUNNING"
	CodeEmbeddingFailed          = "EMBEDDING_FAILED"
	CodeInternal                 = "INTERNAL"
	CodeBadRequest               = "BAD_REQUEST"
	CodeUnauthorized             = "UNAUTHORIZED"
	CodeForbidden                = "FORBIDDEN"
	CodeConflict                 = "CONFLICT"
)

// codeForStatus maps an HTTP status to a default code for errors that did not go
// through response.Fail (used by ErrorHandler).
func codeForStatus(status int) string {
	switch status {
	case fiber.StatusBadRequest:
		return CodeBadRequest
	case fiber.StatusUnauthorized:
		return CodeUnauthorized
	case fiber.StatusForbidden:
		return CodeForbidden
	case fiber.StatusNotFound:
		return CodeNotFound
	case fiber.StatusConflict:
		return CodeConflict
	default:
		return CodeInternal
	}
}
```

```go
// backend/internal/api/response/errorhandler.go
package response

import (
	"errors"

	"github.com/gofiber/fiber/v2"
)

// ErrorHandler is the global Fiber error handler. It renders any error returned
// from a handler (or an unmatched route / recovered panic) as an ErrorResponse
// envelope. Handlers that call response.Fail already wrote their body and return
// nil, so this only catches the unhandled tail.
func ErrorHandler(c *fiber.Ctx, err error) error {
	status := fiber.StatusInternalServerError
	var fe *fiber.Error
	if errors.As(err, &fe) {
		status = fe.Code
	}
	return c.Status(status).JSON(ErrorResponse{
		Success: false,
		Error:   ErrorBody{Code: codeForStatus(status), Message: err.Error()},
	})
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/api/response/ -v`
Expected: PASS (all tests).

- [ ] **Step 5: Wire ErrorHandler into the app**

In `backend/cmd/server/main.go`, add the import (with the other internal imports):
```go
"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"
```
Change the `fiber.New(...)` call (currently at ~line 128) from:
```go
	app := fiber.New(fiber.Config{
		AppName:       "New Carmen Backend",
		BodyLimit:     4 * 1024 * 1024,
		CaseSensitive: true,
	})
```
to:
```go
	app := fiber.New(fiber.Config{
		AppName:       "New Carmen Backend",
		BodyLimit:     4 * 1024 * 1024,
		CaseSensitive: true,
		ErrorHandler:  response.ErrorHandler,
	})
```

- [ ] **Step 6: Verify build**

Run: `cd backend && go build ./... && go test ./internal/api/response/`
Expected: build OK, tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/api/response/codes.go backend/internal/api/response/errorhandler.go backend/internal/api/response/errorhandler_test.go backend/cmd/server/main.go
git commit -m "$(cat <<'EOF'
feat(backend): add error codes + global Fiber ErrorHandler envelope

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Typed payload structs

`models` cannot import `services` (services already imports models — cycle). So
**pure** payloads go in `models/`; payloads that reference service types go in a
new file in package `services`.

**Files:**
- Create: `backend/internal/models/api_payloads.go`
- Create: `backend/internal/services/payloads.go`

**Interfaces:**
- Produces (models): `DocumentSummary`, `ProvisionResult`, `DeprovisionResult`, `ActivitySummary`, `StatusResult`, `ClearResult`, `MessageResult`, `ReindexOneResult`, `ReindexStatus`, `ReindexUnlock`, `RecordHistoryResult`, `IntentTestResult`.
- Produces (services): `WikiCategoryPayload{Category string; Items []CategoryItem}`, `SyncResult{Message string; Audit *SyncAuditReport; AuditError string}`, `SyncAuditResult{Audit *SyncAuditReport}`.

- [ ] **Step 1: Create the models payloads**

```go
// backend/internal/models/api_payloads.go
package models

import "github.com/google/uuid"

// DocumentSummary is one row of GET /api/documents (promoted from the api package).
type DocumentSummary struct {
	ID         uuid.UUID `json:"id"`
	Path       string    `json:"path"`
	Title      string    `json:"title"`
	Source     string    `json:"source"`
	ChunkCount *int64    `json:"chunk_count,omitempty"`
	CreatedAt  *string   `json:"created_at,omitempty"`
	UpdatedAt  *string   `json:"updated_at,omitempty"`
}

// ProvisionResult is the data for POST /api/business-units/provision.
type ProvisionResult struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// DeprovisionResult is the data for POST /api/business-units/deprovision.
type DeprovisionResult struct {
	Slug string `json:"slug"`
}

// ActivitySummary is the data for GET /api/activity/summary.
type ActivitySummary struct {
	Period string      `json:"period"`
	Items  interface{} `json:"items"`
}

// StatusResult is a simple {status} acknowledgement (chat feedback).
type StatusResult struct {
	Status string `json:"status"`
}

// ClearResult is the data for DELETE /api/chat/clear/:room_id.
type ClearResult struct {
	Status string `json:"status"`
	RoomID string `json:"room_id"`
}

// MessageResult is a simple {message} acknowledgement (index rebuild start).
type MessageResult struct {
	Message string `json:"message"`
}

// ReindexOneResult is the data for POST /api/index/rebuild/one.
type ReindexOneResult struct {
	BU      string `json:"bu"`
	Path    string `json:"path"`
	Message string `json:"message"`
}

// ReindexStatus is the data for GET /api/index/rebuild/status.
type ReindexStatus struct {
	BU            string `json:"bu"`
	Running       bool   `json:"running"`
	StartedAt     string `json:"started_at"`
	RunningForSec int64  `json:"running_for_sec"`
}

// ReindexUnlock is the data for POST /api/index/rebuild/unlock.
type ReindexUnlock struct {
	BU         string `json:"bu"`
	WasRunning bool   `json:"was_running"`
	Message    string `json:"message"`
}

// RecordHistoryResult is the data for POST /api/chat/record-history.
type RecordHistoryResult struct {
	ID      string `json:"id,omitempty"`
	Skipped string `json:"skipped,omitempty"`
}

// IntentTestResult is the data for POST /api/chat/intent-test.
type IntentTestResult struct {
	Type            string `json:"type"`
	Source          string `json:"source"`
	CannedResponse  string `json:"canned_response"`
	EmbedTokens     int    `json:"embed_tokens"`
	LLMInputTokens  int    `json:"llm_input_tokens"`
	LLMOutputTokens int    `json:"llm_output_tokens"`
}
```

- [ ] **Step 2: Create the services payloads**

```go
// backend/internal/services/payloads.go
package services

// WikiCategoryPayload is the data for GET /api/wiki/category/:slug.
type WikiCategoryPayload struct {
	Category string         `json:"category"`
	Items    []CategoryItem `json:"items"`
}

// SyncResult is the data for POST /api/wiki/sync.
type SyncResult struct {
	Message    string           `json:"message"`
	Audit      *SyncAuditReport `json:"audit,omitempty"`
	AuditError string           `json:"audit_error,omitempty"`
}

// SyncAuditResult is the data for GET /api/wiki/sync/audit.
type SyncAuditResult struct {
	Audit *SyncAuditReport `json:"audit,omitempty"`
}
```

- [ ] **Step 3: Verify build**

Run: `cd backend && go build ./...`
Expected: builds (no import cycle).

- [ ] **Step 4: Commit**

```bash
git add backend/internal/models/api_payloads.go backend/internal/services/payloads.go
git commit -m "$(cat <<'EOF'
feat(backend): add typed response payload structs (models + services)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Convert system + business-units handlers

**Files:**
- Modify: `backend/internal/api/system_handler.go`
- Modify: `backend/internal/api/bu_handler.go`

**Interfaces:**
- Consumes: `response.OK/Fail`, codes; `models.ProvisionResult`, `models.DeprovisionResult`, `models.SystemStatusResponse`, `models.BusinessUnit`.

- [ ] **Step 1: Update `system_handler.go` Status**

Replace the body of `Status` so it wraps the existing struct:
```go
func (h *SystemHandler) Status(c *fiber.Ctx) error {
	return response.OK(c, models.SystemStatusResponse{Status: "ok", Message: ""})
}
```
Add import `"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"`.

- [ ] **Step 2: Update `bu_handler.go` — add response import, rewrite the three handlers**

Add import `"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"`.

`List`:
```go
func (h *BusinessUnitHandler) List(c *fiber.Ctx) error {
	var bus []models.BusinessUnit
	if err := database.DB.Table("public.business_units").Find(&bus).Error; err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, "failed to fetch business units: "+err.Error())
	}
	if bus == nil {
		bus = []models.BusinessUnit{}
	}
	return response.OK(c, bus)
}
```

`Provision` — replace each `c.Status(...).JSON(fiber.Map{"error": ...})` and the final success:
```go
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, "invalid JSON body")
	}
	// ...
	if !security.ValidateSchema(slug) {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidSlug, "invalid slug")
	}
	// ...
	if tx.Error != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, tx.Error.Error())
	}
	// ... upsert:
		tx.Rollback()
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, "upsert business unit: "+err.Error())
	// ... commit:
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	// success:
	return response.OK(c, models.ProvisionResult{Slug: slug, Name: name, Description: description})
```

`Deprovision`:
```go
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, "invalid JSON body")
	}
	// ...
	if !security.ValidateSchema(slug) {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidSlug, "invalid slug")
	}
	if slug == constants.DefaultBU {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeCannotDeprovisionDefault, "cannot deprovision default bu")
	}
	if tx.Error != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, tx.Error.Error())
	}
		tx.Rollback()
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, "delete business unit: "+err.Error())
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	// success:
	return response.OK(c, models.DeprovisionResult{Slug: slug})
```

- [ ] **Step 3: Build + run existing handler tests**

Run: `cd backend && go build ./... && go test ./internal/api/ -run 'TestBusinessUnit|TestProvision|TestDeprovision|System' -v`
Expected: PASS (`bu_handler_test.go` asserts status codes, which are unchanged). If a test asserts a body key, fix it to read `data` (see mapping in Task 10 Step 4).

- [ ] **Step 4: Commit**

```bash
git add backend/internal/api/system_handler.go backend/internal/api/bu_handler.go
git commit -m "$(cat <<'EOF'
feat(backend): envelope system + business-units handlers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Convert documents handler

**Files:**
- Modify: `backend/internal/api/documents_handler.go`

**Interfaces:**
- Consumes: `response.OK/Fail`, codes, `models.DocumentSummary`.
- Removes: local `documentRow` type (replaced by `models.DocumentSummary`).

- [ ] **Step 1: Rewrite the handler**

```go
package api

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/middleware"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/models"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/security"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type DocumentsHandler struct{}

// NewDocumentsHandler constructs a DocumentsHandler.
func NewDocumentsHandler() *DocumentsHandler {
	return &DocumentsHandler{}
}

// List handles GET /api/documents — returns the request BU's documents with their
// chunk counts, ordered by path.
func (h *DocumentsHandler) List(c *fiber.Ctx) error {
	bu := middleware.GetBU(c)
	if !security.ValidateSchema(bu) {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBU, "invalid bu parameter")
	}
	buID, err := database.BUIDForSlug(bu)
	if err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBU, err.Error())
	}
	if buID == uuid.Nil {
		return response.OK(c, []models.DocumentSummary{})
	}
	var rows []models.DocumentSummary
	sql := `
		SELECT d.id, d.path, d.title, d.source, d.created_at, d.updated_at,
			(SELECT COUNT(*) FROM public.document_chunks c WHERE c.doc_id = d.id) AS chunk_count
		FROM public.documents d
		WHERE d.bu_id = ?
		ORDER BY d.path ASC, d.id ASC
	`
	if err := database.DB.Raw(sql, buID).Scan(&rows).Error; err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	if rows == nil {
		rows = []models.DocumentSummary{}
	}
	return response.OK(c, rows)
}
```

- [ ] **Step 2: Build + test**

Run: `cd backend && go build ./... && go test ./internal/api/ -run Documents`
Expected: build OK; tests PASS (or none for documents).

- [ ] **Step 3: Commit**

```bash
git add backend/internal/api/documents_handler.go
git commit -m "$(cat <<'EOF'
feat(backend): envelope documents handler, promote row to models.DocumentSummary

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Convert wiki handler

**Files:**
- Modify: `backend/internal/api/wiki_handler.go`

**Interfaces:**
- Consumes: `response.OK/Fail`, codes; `services.WikiCategoryPayload`, `services.SyncResult`, `services.SyncAuditResult`.

- [ ] **Step 1: Add response import + rewrite each handler's returns**

Add import `"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"`.

`List`:
```go
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	if entries == nil {
		entries = []services.WikiEntry{}
	}
	return response.OK(c, entries)
```

`ListCategories`:
```go
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	if items == nil {
		items = []services.CategoryEntry{}
	}
	return response.OK(c, items)
```

`Sidebar`:
```go
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	if categories == nil {
		categories = []services.SidebarCategory{}
	}
	return response.OK(c, categories)
```

`GetCategory`:
```go
	if slug == "" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeMissingParam, "slug is required")
	}
	// ...
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	if items == nil {
		items = []services.CategoryItem{}
	}
	return response.OK(c, services.WikiCategoryPayload{Category: category, Items: items})
```

`GetContent`:
```go
	if pathParam == "" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeMissingParam, "path is required")
	}
	// ... in the GetContent error block:
		if errors.Is(err, os.ErrNotExist) {
			return response.Fail(c, fiber.StatusNotFound, response.CodeNotFound, "not found")
		}
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	// ... success (after logging):
	return response.OK(c, content)
```

`Search`:
```go
	if query == "" {
		return response.OK(c, []services.SearchResult{})
	}
	// ... fallback branch:
		if kwErr != nil {
			return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
		}
		// ... log ...
		return response.OK(c, keywordResults)
	// ... final:
	return response.OK(c, merged)
```
(`keywordResults` and `merged` are `[]services.SearchResult` — guard nil if needed: `if merged == nil { merged = []services.SearchResult{} }`.)

`Sync`:
```go
	if err := h.syncService.Sync(); err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	// ...
	if !includeAudit {
		return response.OK(c, services.SyncResult{Message: "synced"})
	}
	report, err := h.syncService.BuildAuditReport()
	if err != nil {
		return response.OK(c, services.SyncResult{Message: "synced (audit failed)", AuditError: err.Error()})
	}
	return response.OK(c, services.SyncResult{Message: "synced", Audit: report})
```

`SyncAudit`:
```go
	report, err := h.syncService.BuildAuditReport()
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, services.SyncAuditResult{Audit: report})
```

- [ ] **Step 2: Build + test**

Run: `cd backend && go build ./... && go test ./internal/api/ -run Wiki -v`
Expected: build OK; wiki tests PASS (assert status codes / structure that still holds). If any assert a removed top-level key, fix per Task 10 Step 4 mapping.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/api/wiki_handler.go
git commit -m "$(cat <<'EOF'
feat(backend): envelope wiki handler (list/category/content/search/sync)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Convert faq handler

**Files:**
- Modify: `backend/internal/api/faq_handler.go`

**Interfaces:**
- Consumes: `response.OK/Fail`, codes.

- [ ] **Step 1: Add response import + rewrite returns**

Add import `"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"`.

```go
// ListModules
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, mods)

// GetModuleDetail
	if moduleSlug == "" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeMissingParam, "module is required")
	}
	// ...
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, data)

// ListByCategory
	if moduleSlug == "" || subSlug == "" || catSlug == "" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeMissingParam, "module, sub, category are required")
	}
	// ...
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, resp)

// GetEntry
	if id == "" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeMissingParam, "id is required")
	}
	if _, err := uuid.Parse(id); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidID, "invalid id")
	}
	// ...
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, entry)
```

- [ ] **Step 2: Build + test**

Run: `cd backend && go build ./... && go test ./internal/api/ -run FAQ -v`
Expected: build OK; PASS (or no faq tests).

- [ ] **Step 3: Commit**

```bash
git add backend/internal/api/faq_handler.go
git commit -m "$(cat <<'EOF'
feat(backend): envelope faq handler

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Convert activity handler

**Files:**
- Modify: `backend/internal/api/activity_handler.go`

**Interfaces:**
- Consumes: `response.List/OK/Fail`, `response.Meta`, `response.IntPtr`, `models.ActivitySummary`.

- [ ] **Step 1: Add response import + rewrite both handlers**

Add import `"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"`.

`List`:
```go
	logs, total, err := h.service.GetLogsWithFilter(buSlug, source, limit, offset)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.List(c, logs, &response.Meta{
		Total:  response.IntPtr(int(total)),
		Limit:  response.IntPtr(limit),
		Offset: response.IntPtr(offset),
	})
```
(If `logs` can be nil, guard: `if logs == nil { logs = []models.ActivityLog{} }` before `List`. Confirm the slice element type matches `GetLogsWithFilter`'s return.)

`Summary`:
```go
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, models.ActivitySummary{Period: period, Items: results})
```
Add the `models` import if not present.

- [ ] **Step 2: Build + test**

Run: `cd backend && go build ./... && go test ./internal/api/ -run Activity -v`
Expected: build OK; PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/api/activity_handler.go
git commit -m "$(cat <<'EOF'
feat(backend): envelope activity handler (list uses meta pagination)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Convert indexing handler

**Files:**
- Modify: `backend/internal/api/indexing_handler.go`

**Interfaces:**
- Consumes: `response.OK/OKStatus/Fail`, codes; `models.MessageResult`, `models.ReindexOneResult`, `models.ReindexStatus`, `models.ReindexUnlock`.

- [ ] **Step 1: Add imports + rewrite returns**

Add imports:
```go
"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"
"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/models"
```

`Rebuild`:
```go
		} else {
			h.mu.Unlock()
			return response.Fail(c, fiber.StatusConflict, response.CodeReindexRunning, "reindex is already running for this bu")
		}
	// ... at the end:
	return response.OKStatus(c, fiber.StatusAccepted, models.MessageResult{Message: "reindex started (running in background)"})
```

`ForceUnlock`:
```go
	return response.OK(c, models.ReindexUnlock{BU: bu, WasRunning: wasRunning, Message: "reindex lock cleared"})
```

`Status`:
```go
	return response.OK(c, models.ReindexStatus{
		BU:            bu,
		Running:       running,
		StartedAt:     startedAt,
		RunningForSec: runningForSec,
	})
```

`RebuildOne`:
```go
	if path == "" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeMissingParam, "path is required")
	}
	// ...
	if err := h.indexingService.IndexPath(ctx, bu, path); err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, models.ReindexOneResult{BU: bu, Path: path, Message: "reindex single file completed"})
```

- [ ] **Step 2: Build + test**

Run: `cd backend && go build ./... && go test ./internal/api/ -run Index -v`
Expected: build OK; PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/api/indexing_handler.go
git commit -m "$(cat <<'EOF'
feat(backend): envelope indexing handler (rebuild/status/unlock/one)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Convert chat handler (ask / feedback / clear) + fix chat_clear_test

**Files:**
- Modify: `backend/internal/api/chat_handler.go`
- Modify: `backend/internal/api/chat_clear_test.go`

**Interfaces:**
- Consumes: `response.OK/Fail`, codes; `models.StatusResult`, `models.ClearResult`, `models.IntentTestResult`.

- [ ] **Step 1: Update `chat_clear_test.go` assertions (failing test first)**

Replace lines 36–45 so they read the envelope:
```go
	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body["success"] != true {
		t.Errorf("expected success true, got %v", body["success"])
	}
	data, ok := body["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %v", body["data"])
	}
	if data["status"] != "ok" {
		t.Errorf(`expected status "ok", got %v`, data["status"])
	}
	if data["room_id"] != "r1" {
		t.Errorf(`expected room_id "r1", got %v`, data["room_id"])
	}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/api/ -run TestClearRoom_ReturnsOK -v`
Expected: FAIL — `body["data"]` is nil (handler still returns flat `{status,room_id}`).

- [ ] **Step 3: Rewrite chat handler returns**

Add import `"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"`.

`Stream` — **unchanged** (NDJSON, out of scope), except the request-parse error:
```go
	req, err := parseStreamRequest(c)
	if err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeBadRequest, err.Error())
	}
```

`Image` — **unchanged** (file response).

`Ask`:
```go
func (h *ChatHandler) Ask(c *fiber.Ctx) error {
	resp, status, err := h.askFlow(c)
	if err != nil {
		code := response.CodeInternal
		if status == fiber.StatusBadRequest {
			code = response.CodeBadRequest
		}
		return response.Fail(c, status, code, err.Error())
	}
	return response.OK(c, resp)
}
```

`Feedback`:
```go
	messageID, err := uuid.Parse(c.Params("message_id"))
	if err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidMessageID, "invalid message_id")
	}
	// ...
	if err := c.BodyParser(&body); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, "invalid body")
	}
	if body.Score != 1 && body.Score != -1 {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidScore, "score must be 1 or -1")
	}
	buID, err := h.historyService.GetBUIDFromSlug(strings.TrimSpace(body.BU))
	if err != nil || buID == uuid.Nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeBUNotFound, "unknown bu")
	}
	// ...
	if err := h.historyService.UpdateFeedback(buID, messageID, userID, body.Score); err != nil {
		return response.Fail(c, fiber.StatusNotFound, response.CodeFeedbackTargetNotFound, "feedback target not found")
	}
	return response.OK(c, models.StatusResult{Status: "ok"})
```

`ClearRoom`:
```go
func (h *ChatHandler) ClearRoom(c *fiber.Ctx) error {
	return response.OK(c, models.ClearResult{Status: "ok", RoomID: c.Params("room_id")})
}
```

`IntentTest`:
```go
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Message) == "" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeMissingParam, "message is required")
	}
	// ...
	r := h.intentRouter.Classify(req.Message, req.Lang, req.HaveHistory)
	return response.OK(c, models.IntentTestResult{
		Type:            r.Type,
		Source:          r.Source,
		CannedResponse:  r.CannedResponse,
		EmbedTokens:     r.EmbedTokens,
		LLMInputTokens:  r.LLMInputTokens,
		LLMOutputTokens: r.LLMOutputTokens,
	})
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd backend && go build ./... && go test ./internal/api/ -run 'TestClearRoom|Feedback|Ask' -v`
Expected: PASS. (Status-code-only assertions in `chat_feedback_test.go` still hold; `chat_clear_test.go` now reads `data`.)

> **Test-assertion migration mapping** (reuse for any handler test that reads the body):
> - success list: `body["items"]` → `body["data"]` (the array is now `data`); pagination: `body["total"]` → `body["meta"].(map[string]interface{})["total"]`.
> - success object/composite (`{category,items}`, `{status,...}`): read fields under `body["data"].(map[string]interface{})`.
> - error: was `body["error"]` (string) → now `body["error"].(map[string]interface{})["code"]` / `["message"]`.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/api/chat_handler.go backend/internal/api/chat_clear_test.go
git commit -m "$(cat <<'EOF'
feat(backend): envelope chat handler (ask/feedback/clear/intent-test)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Convert chat-history handler (record / list / route)

**Files:**
- Modify: `backend/internal/api/chat_history_handler.go`

**Interfaces:**
- Consumes: `response.OK/List/Fail`, `response.Meta`, `response.IntPtr`, codes; `models.RecordHistoryResult`.

- [ ] **Step 1: Add response import + rewrite returns**

Add import `"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"`.

`RecordHistory`:
```go
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, "invalid request body")
	}
	// ...
	if bu == "" || q == "" || a == "" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeMissingParam, "bu, question, answer required")
	}
	if !config.AppConfig.Chat.HistoryEnabled {
		return response.OK(c, models.RecordHistoryResult{Skipped: "history disabled"})
	}
	buID, err := h.historyService.GetBUIDFromSlug(bu)
	if err != nil || buID == uuid.Nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBU, "invalid bu: "+bu)
	}
	emb, err := h.embedLLM.Embedding(q)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeEmbeddingFailed, "embedding failed: "+err.Error())
	}
	// ...
	id, err := h.historyService.SaveWithID(buID, userID, q, a, sources, emb)
	if err != nil {
		log.Printf("[chat] record-history save failed: %v", err)
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, models.RecordHistoryResult{ID: id.String()})
```

`ListHistory`:
```go
	buID, err := h.historyService.GetBUIDFromSlug(bu)
	if err != nil || buID == uuid.Nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBU, "invalid bu")
	}
	// ...
	entries, total, err := h.historyService.List(buID, limit, offset)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	if entries == nil {
		entries = []services.ListEntry{}
	}
	return response.List(c, entries, &response.Meta{
		Total:  response.IntPtr(int(total)),
		Limit:  response.IntPtr(limit),
		Offset: response.IntPtr(offset),
	})
```
(Add the `services` import if not present; confirm `List` returns `[]services.ListEntry`.)

`RouteOnly`:
```go
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, "invalid request body")
	}
	q := strings.TrimSpace(req.Question)
	if q == "" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeMissingParam, "question is required")
	}
	res, err := h.router.RouteQuestion(q)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, res)
```

- [ ] **Step 2: Build + full backend test**

Run: `cd backend && go build ./... && go vet ./... && go test ./...`
Expected: PASS. (Gated parity/DB tests skip without `RUN_DB_TESTS`.)

- [ ] **Step 3: Commit**

```bash
git add backend/internal/api/chat_history_handler.go
git commit -m "$(cat <<'EOF'
feat(backend): envelope chat-history handler (record/list/route)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Update gated parity harness + Swagger annotations + regen

**Files:**
- Modify: `backend/tests/parity/harness_test.go` (chat/ask body unwrap — gated by `RUN_DB_TESTS`)
- Modify: `backend/internal/apidoc/swagger_routes.go`
- Regenerate: `backend/docs/*`

**Interfaces:**
- Consumes: all payload types + `response.Envelope`/`response.ErrorResponse` (for annotations).

- [ ] **Step 1: Update parity harness chat/ask decode**

In `backend/tests/parity/harness_test.go`, wherever the harness decodes a
`/api/chat/ask` response body directly into a `ChatAskResponse`-shaped struct,
change it to decode the envelope first and read `.data`. Concretely, replace a
decode like:
```go
var got ChatAskResponse
json.Unmarshal(bodyBytes, &got)
```
with:
```go
var env struct {
	Success bool             `json:"success"`
	Data    ChatAskResponse  `json:"data"`
	Error   struct{ Code, Message string } `json:"error"`
}
json.Unmarshal(bodyBytes, &env)
got := env.Data
```
(Adjust the local struct/field names to whatever the harness already uses. If the
harness only asserts HTTP status, no change is needed. This file is gated by
`RUN_DB_TESTS=1`; verify with the command in Step 4 if you have a DB+LLM.)

- [ ] **Step 2: Rewrite Swagger annotations**

In `backend/internal/apidoc/swagger_routes.go`, for each in-scope operation,
replace `@Success 200 {object} map[string]interface{}` (or `map[string]string`)
with the envelope type below, and add a `@Failure` line. Leave `OpHealth`
unchanged (health is out of scope).

| Route | `@Success 200 {object} ...` |
|---|---|
| `/api/system/status` | `response.Envelope[models.SystemStatusResponse]` |
| `/api/business-units` | `response.Envelope[[]models.BusinessUnit]` |
| `/api/business-units/provision` | `response.Envelope[models.ProvisionResult]` |
| `/api/business-units/deprovision` | `response.Envelope[models.DeprovisionResult]` |
| `/api/wiki/list` | `response.Envelope[[]services.WikiEntry]` |
| `/api/wiki/categories` | `response.Envelope[[]services.CategoryEntry]` |
| `/api/wiki/sidebar` | `response.Envelope[[]services.SidebarCategory]` |
| `/api/wiki/category/{slug}` | `response.Envelope[services.WikiCategoryPayload]` |
| `/api/wiki/content/{path}` | `response.Envelope[services.WikiContent]` |
| `/api/wiki/search` | `response.Envelope[[]services.SearchResult]` |
| `/api/wiki/sync` | `response.Envelope[services.SyncResult]` |
| `/api/wiki/sync/audit` | `response.Envelope[services.SyncAuditResult]` |
| `/api/faq/modules` | `response.Envelope[[]services.FAQModule]` |
| `/api/faq/{module}` | `response.Envelope[map[string]interface{}]` |
| `/api/faq/{module}/{sub}/{category}` | `response.Envelope[services.FAQCategoryResponse]` |
| `/api/faq/entry/{id}` | `response.Envelope[services.FAQEntryDetail]` |
| `/api/documents` | `response.Envelope[[]models.DocumentSummary]` |
| `/api/activity/list` | `response.Envelope[[]models.ActivityLog]` |
| `/api/activity/summary` | `response.Envelope[models.ActivitySummary]` |
| `/api/index/rebuild` | `response.Envelope[models.MessageResult]` |
| `/api/index/rebuild/one` | `response.Envelope[models.ReindexOneResult]` |
| `/api/index/rebuild/status` | `response.Envelope[models.ReindexStatus]` |
| `/api/index/rebuild/unlock` | `response.Envelope[models.ReindexUnlock]` |
| `/api/chat/ask` | `response.Envelope[models.ChatAskResponse]` |
| `/api/chat/feedback/{message_id}` | `response.Envelope[models.StatusResult]` |
| `/api/chat/clear/{room_id}` | `response.Envelope[models.ClearResult]` |
| `/api/chat/record-history` | `response.Envelope[models.RecordHistoryResult]` |
| `/api/chat/history/list` | `response.Envelope[[]services.ListEntry]` |
| `/api/chat/intent-test` | `response.Envelope[models.IntentTestResult]` |
| `/api/chat/route-test` | `response.Envelope[models.RouteResult]` |

For every operation above, also add (matching the operation's likely failures):
```go
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
```
(Add `404` for `wiki/content`, `chat/feedback`; `409` for `index/rebuild`.)

If an `Op*` function does not yet exist for an in-scope route (e.g. `intent-test`,
`route-test`, `record-history`), add a no-op `Op*` function with full annotations
following the existing file's style (`@Summary`, `@Description`, `@Tags`,
`@Produce json`, `@Param`, `@Success`, `@Failure`, `@Router`).

- [ ] **Step 3: Update the regen command to scan the new type dirs**

The swag `-d` list must include the packages holding `response`, `services`, and
`api` types. Update the regen comment at the top of `swagger_routes.go` to:
```
// Regenerate docs:
// cd backend && go run github.com/swaggo/swag/cmd/swag@v1.16.6 init -g main.go -o docs \
//   -d ./cmd/server,./internal/apidoc,./internal/models,./internal/services,./internal/api/response
```
Also update the same command in `backend/README.md` / `backend/Makefile` if it appears there (grep: `grep -rn "swag.*init" backend`).

- [ ] **Step 4: Regenerate and verify**

Run:
```bash
cd backend && go run github.com/swaggo/swag/cmd/swag@v1.16.6 init -g main.go -o docs \
  -d ./cmd/server,./internal/apidoc,./internal/models,./internal/services,./internal/api/response
```
Expected: `docs/swagger.json`, `docs/swagger.yaml`, `docs/docs.go` regenerated with
no errors. Verify a generic schema rendered:
```bash
grep -c "success" docs/swagger.json   # > 0
grep -c "Envelope" docs/swagger.json  # > 0 (instantiated generic definitions)
```
If swag errors on a specific generic (e.g. `Envelope[map[string]interface{}]`),
fall back to a concrete alias for that one endpoint: define
`type FAQModuleEnvelope struct { Success bool \`json:"success"\`; Data map[string]interface{} \`json:"data"\` }`
in `internal/apidoc/` and reference it in the annotation. Then re-run.

Build + gated parity (only if you have DB+LLM):
```bash
cd backend && go build ./... && go vet ./...
RUN_DB_TESTS=1 go test ./tests/parity/... ./internal/services/...
```

- [ ] **Step 5: Commit**

```bash
git add backend/internal/apidoc/swagger_routes.go backend/docs backend/tests/parity/harness_test.go backend/README.md backend/Makefile
git commit -m "$(cat <<'EOF'
docs(backend): type Swagger responses with envelope generics; regen OpenAPI

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: React frontend — apiJson helper + wiki-api unwrap

**Files:**
- Modify: `frontend-react/src/lib/fetch-utils.ts`
- Modify: `frontend-react/src/lib/wiki-api.ts`
- Modify: `frontend-react/src/routes/admin-activity.tsx`
- Modify: affected test mocks under `frontend-react/src`

**Interfaces:**
- Produces: `apiJson<T>(input, init?, timeoutMs?) => Promise<{ data: T; meta?: Meta }>`, `class ApiError`, `type Meta`.

- [ ] **Step 1: Add the helper to `fetch-utils.ts`**

Append to `frontend-react/src/lib/fetch-utils.ts`:
```ts
export type Meta = { total?: number; limit?: number; offset?: number };

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

type Envelope<T> = {
  success?: boolean;
  data?: T;
  meta?: Meta;
  error?: { code?: string; message?: string };
};

/**
 * Fetch JSON and unwrap the standard response envelope { success, data, meta }.
 * Throws ApiError on { success:false }. Tolerant during rollout: if the body is
 * not enveloped (legacy flat shape), returns it unchanged as `data`.
 */
export async function apiJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 12000,
): Promise<{ data: T; meta?: Meta }> {
  const res = await fetchWithTimeout(input, init, timeoutMs);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const env = body as Envelope<T> | null;
  if (env && typeof env.success === "boolean") {
    if (!env.success) {
      throw new ApiError(
        env.error?.code ?? "UNKNOWN",
        env.error?.message ?? `HTTP ${res.status}`,
        res.status,
      );
    }
    return { data: env.data as T, meta: env.meta };
  }
  // legacy / non-enveloped fallback (pre-rollout backend) — remove after rollout
  if (!res.ok) {
    throw new ApiError("HTTP_ERROR", `HTTP ${res.status}`, res.status);
  }
  return { data: body as T };
}
```

- [ ] **Step 2: Rewrite `wiki-api.ts` consumers to unwrap (return shapes unchanged)**

Add `apiJson` (and `ApiError` where needed) to the import on line 3:
```ts
import { apiJson, fetchWithTimeout } from "./fetch-utils";
```

`getBusinessUnits` (lines 32–44):
```ts
export async function getBusinessUnits(): Promise<{ items: BusinessUnit[] }> {
  const { data } = await apiJson<BusinessUnit[]>(`${API_BASE}/api/business-units`, {
    cache: "no-store",
  });
  const items = (data ?? []).filter((bu) => {
    const desc = (bu.description ?? "").trim().toLowerCase();
    return desc !== "auto provision from contents";
  });
  return { items };
}
```

`getCategories` (lines 79–96):
```ts
export async function getCategories(
  bu?: string,
  fetchOptions?: RequestInit,
): Promise<{ items: { slug: string; title: string }[] }> {
  const selectedBU = bu || getSelectedBUClient();
  const { data } = await apiJson<{ slug: string; title: string }[]>(
    `${API_BASE}/api/wiki/categories?bu=${selectedBU}`,
    { cache: "no-store", ...fetchOptions },
  );
  return { items: data ?? [] };
}
```

`getSidebarTree` (lines 121–134):
```ts
export async function getSidebarTree(bu?: string): Promise<SidebarCategory[]> {
  const selectedBU = bu || getSelectedBUClient();
  const cached = sidebarCache[selectedBU];
  if (cached && Date.now() - cached.ts < SIDEBAR_TTL) return cached.data;

  const { data } = await apiJson<SidebarCategory[]>(
    `${API_BASE}/api/wiki/sidebar?bu=${selectedBU}`,
    { cache: "no-store" },
  );
  const tree = data ?? [];
  sidebarCache[selectedBU] = { data: tree, ts: Date.now() };
  return tree;
}
```

`getCategory` (lines 145–166):
```ts
export async function getCategory(
  slug: string,
  bu?: string,
  fetchOptions?: RequestInit,
): Promise<{
  category: string;
  title?: string;
  items: (WikiListItem & { slug: string })[];
}> {
  const selectedBU = bu || getSelectedBUClient();
  const { data } = await apiJson<{
    category: string;
    title?: string;
    items: (WikiListItem & { slug: string })[];
  }>(`${API_BASE}/api/wiki/category/${slug}?bu=${selectedBU}`, {
    cache: "no-store",
    ...fetchOptions,
  });
  return data;
}
```

`getAllArticles` (lines 181–196):
```ts
export async function getAllArticles(bu?: string): Promise<WikiListItem[]> {
  const selectedBU = bu || getSelectedBUClient();
  if (cachedList[selectedBU]) return cachedList[selectedBU];

  const { data } = await apiJson<WikiListItem[]>(
    `${API_BASE}/api/wiki/list?bu=${selectedBU}`,
    { cache: "no-store" },
  );
  cachedList[selectedBU] = data ?? [];
  return cachedList[selectedBU];
}
```

`getContent` (lines 381–412):
```ts
  const selectedBU = bu || getSelectedBUClient();
  const params = new URLSearchParams({ bu: selectedBU });
  if (locale) params.set("locale", locale);
  const encodedPath = encodeWikiPathForFetch(path);
  const { data } = await apiJson<{
    path: string;
    title: string;
    description?: string;
    published?: boolean;
    date?: string;
    content: string;
    tags?: string[];
    editor?: string;
    dateCreated?: string;
    publishedAt?: string;
  }>(`${API_BASE}/api/wiki/content/${encodedPath}?${params.toString()}`, {
    cache: "no-store",
    ...fetchOptions,
  });
  return data;
```

`askChat` (lines 436–469) — preserve the helpful non-JSON message, unwrap envelope:
```ts
export async function askChat(
  question: string,
  preferredPath?: string,
  bu?: string,
): Promise<ChatAskResponse> {
  const selectedBU = bu || getSelectedBUClient();
  const res = await fetch(`${API_BASE}/api/chat/ask?bu=${selectedBU}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: question.trim(), preferredPath }),
  });

  const raw = await res.text();
  let body: {
    success?: boolean;
    data?: ChatAskResponse;
    error?: { code?: string; message?: string };
  };
  try {
    body = JSON.parse(raw);
  } catch {
    throw new Error(
      `Chat API returned non-JSON (HTTP ${res.status}). Check NEXT_PUBLIC_API_BASE (${API_BASE}) and that the Go backend is running. Body starts with: ${raw.slice(0, 120)}`,
    );
  }
  if (body && body.success === false) {
    throw new Error(body.error?.message || "Failed to get answer");
  }
  if (body && typeof body.success === "boolean") {
    return body.data as ChatAskResponse;
  }
  // legacy fallback
  if (!res.ok) {
    throw new Error((body as unknown as ChatAskResponse)?.error || "Failed to get answer");
  }
  return body as unknown as ChatAskResponse;
}
```

`searchWiki` (lines 487–509):
```ts
  const selectedBU = bu || getSelectedBUClient();
  try {
    const { data } = await apiJson<SearchResultItem[]>(
      `${API_BASE}/api/wiki/search?q=${encodeURIComponent(q)}&bu=${selectedBU}`,
      { cache: "no-store" },
    );
    return data ?? [];
  } catch {
    return [];
  }
```

`getActivityLogs` (lines 528–551):
```ts
export async function getActivityLogs(
  bu?: string,
  limit: number = 20,
  offset: number = 0,
  source: "all" | "user" | "admin" = "all",
): Promise<{ items: ActivityLog[]; total: number; limit: number; offset: number }> {
  const selectedBU = bu || getSelectedBUClient();
  const params = new URLSearchParams({
    bu: selectedBU,
    limit: String(limit),
    offset: String(offset),
    source,
  });
  const { data, meta } = await apiJson<ActivityLog[]>(
    `${API_BASE}/api/activity/list?${params}`,
    { cache: "no-store" },
  );
  return {
    items: data ?? [],
    total: meta?.total ?? 0,
    limit: meta?.limit ?? limit,
    offset: meta?.offset ?? offset,
  };
}
```

`syncWiki` (lines 554–560):
```ts
export async function syncWiki(): Promise<{ ok: boolean; message: string }> {
  const { data } = await apiJson<{ message: string }>(`${API_BASE}/api/wiki/sync`, {
    method: "POST",
  });
  return { ok: true, message: data?.message ?? "" };
}
```

`rebuildIndex` (lines 563–570):
```ts
export async function rebuildIndex(bu?: string): Promise<{ message: string }> {
  const selectedBU = bu || getSelectedBUClient();
  const { data } = await apiJson<{ message: string }>(
    `${API_BASE}/api/index/rebuild?bu=${selectedBU}`,
    { method: "POST" },
  );
  return { message: data?.message ?? "" };
}
```

- [ ] **Step 3: Rewrite `admin-activity.tsx` loader (the one direct consumer)**

In `frontend-react/src/routes/admin-activity.tsx`, replace the `fetch`/`res.json()`
block in `adminActivityLoader` (lines ~22–37) with:
```ts
export const adminActivityLoader: LoaderFunction = async () => {
  try {
    const { data, meta } = await apiJson<ActivityLog[]>(
      `${API_BASE}/api/activity/list?bu=${DEFAULT_BU}&limit=50&offset=0&source=all`,
      { cache: "no-store" },
    );
    return {
      items: data ?? [],
      total: meta?.total ?? 0,
      limit: meta?.limit ?? 50,
      offset: meta?.offset ?? 0,
    } satisfies ActivityResponse;
  } catch {
    return { items: [], total: 0, limit: 50, offset: 0 } satisfies ActivityResponse;
  }
};
```
Add `apiJson` to the imports from `../lib/fetch-utils` at the top of the file.
(`sendFeedback`/`clearHistory` in `use-carmen-api.ts` are fire-and-forget and read
no body — leave them unchanged. `use-chat-stream.ts` is NDJSON — unchanged.)

- [ ] **Step 4: Update test mocks**

Find React tests that mock these endpoints' responses:
```bash
cd frontend-react && grep -rln "items\|categories\|mockResolved\|json:\|new Response" src --include="*.test.ts" --include="*.test.tsx"
```
For each mocked fetch response of an in-scope endpoint, wrap the old body in the
envelope. Example transformation:
```ts
// before
mockFetch.mockResolvedValue(new Response(JSON.stringify({ items: [...] })));
// after
mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true, data: [...] })));
```
For paginated mocks, move `total/limit/offset` into `meta`:
```ts
new Response(JSON.stringify({ success: true, data: [...], meta: { total: 3, limit: 20, offset: 0 } }))
```
(The tolerant fallback in `apiJson` means un-migrated mocks returning the flat
shape still pass, but migrate them so tests document the real contract.)

- [ ] **Step 5: Run test gate + build**

Run:
```bash
cd frontend-react && bun run test
```
Expected: **40/0** (all pass, isolate mode). Then:
```bash
cd frontend-react && bun run build
```
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/lib/fetch-utils.ts frontend-react/src/lib/wiki-api.ts frontend-react/src/routes/admin-activity.tsx frontend-react/src
git commit -m "$(cat <<'EOF'
feat(react): unwrap response envelope via apiJson (return shapes unchanged)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Next.js frontend — apiJson helper + wiki-api unwrap

**Files:**
- Create/Modify: `frontend-next/lib/fetch-utils.ts`
- Modify: `frontend-next/lib/wiki-api.ts`
- Modify: any Next direct consumers found in Step 3
- Modify: affected test mocks under `frontend-next`

**Interfaces:**
- Produces: same `apiJson<T>`, `ApiError`, `Meta` as Task 13.

- [ ] **Step 1: Ensure `fetch-utils.ts` exists and add the helper**

Check: `ls frontend-next/lib/fetch-utils.ts`. If it does **not** exist, create it
with `fetchWithTimeout` plus the helper; if it exists, append only the helper.

```ts
// frontend-next/lib/fetch-utils.ts  (create if missing)
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 12000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export type Meta = { total?: number; limit?: number; offset?: number };

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

type Envelope<T> = {
  success?: boolean;
  data?: T;
  meta?: Meta;
  error?: { code?: string; message?: string };
};

/**
 * Fetch JSON and unwrap the standard response envelope { success, data, meta }.
 * Throws ApiError on { success:false }. Tolerant during rollout: a non-enveloped
 * (legacy flat) body is returned unchanged as `data`.
 */
export async function apiJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 12000,
): Promise<{ data: T; meta?: Meta }> {
  const res = await fetchWithTimeout(input, init, timeoutMs);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const env = body as Envelope<T> | null;
  if (env && typeof env.success === "boolean") {
    if (!env.success) {
      throw new ApiError(
        env.error?.code ?? "UNKNOWN",
        env.error?.message ?? `HTTP ${res.status}`,
        res.status,
      );
    }
    return { data: env.data as T, meta: env.meta };
  }
  if (!res.ok) {
    throw new ApiError("HTTP_ERROR", `HTTP ${res.status}`, res.status);
  }
  return { data: body as T };
}
```

- [ ] **Step 2: Apply the same `wiki-api.ts` unwraps as Task 13**

Open `frontend-next/lib/wiki-api.ts`. It mirrors the React file. For each function
that currently reads `data.items` / `json.categories` / `res.json()` for an
in-scope endpoint, apply the identical unwrap shown in Task 13 Step 2 — keeping
each function's external return type unchanged (`{ items }`, `{ category, items }`,
`{ ok, message }`, `{ message }`, raw content/list arrays, `ChatAskResponse`). Add
`apiJson` to the imports. The transformations are 1:1 with Task 13; for any
function whose Next signature differs, keep its signature and only swap how it
reads the response (`const { data, meta } = await apiJson<...>(url, init); ...`).

- [ ] **Step 3: Find and migrate Next direct consumers**

Run the same discovery used during planning:
```bash
cd frontend-next && grep -rn "res.json()\|\.items\|\.categories\|fetch(\`" \
  --include="*.ts" --include="*.tsx" app lib hooks \
  | grep -v node_modules | grep -v ".next" | grep -v "\.test\."
```
For each hit that fetches an in-scope endpoint directly (not via `wiki-api.ts`),
migrate it with `apiJson` exactly as Task 13 Step 3 migrated `admin-activity.tsx`
(unwrap `data`/`meta`, rebuild the previous shape). Skip `chat/stream` and any
fire-and-forget `await fetch(...)` that ignores the body (e.g. feedback/clear in
`hooks/use-carmen-api.ts`).

- [ ] **Step 4: Update Next test mocks**

```bash
cd frontend-next && grep -rln "items\|categories\|mockResolved\|new Response" \
  --include="*.test.ts" --include="*.test.tsx" .
```
Wrap mocked in-scope responses in the envelope exactly as Task 13 Step 4
(`{ success: true, data: <old>, meta?: {...} }`).

- [ ] **Step 5: Run test gate + build**

Run:
```bash
cd frontend-next && bun test && bun run build
```
Expected: tests pass; build succeeds. (If the project uses npm for build, run
`npm run build` instead.)

- [ ] **Step 6: Commit**

```bash
git add frontend-next/lib/fetch-utils.ts frontend-next/lib/wiki-api.ts frontend-next
git commit -m "$(cat <<'EOF'
feat(next): unwrap response envelope via apiJson (return shapes unchanged)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Backend full gate**

Run:
```bash
cd backend && go build ./... && go vet ./... && go test ./...
```
Expected: all PASS (gated DB/LLM tests skip without `RUN_DB_TESTS`).

- [ ] **Step 2: Verify no stray `fiber.Map` returns remain in in-scope handlers**

Run:
```bash
cd backend && grep -rn 'c.JSON(fiber.Map\|c.Status(.*).JSON(fiber.Map' internal/api/*.go | grep -v _test
```
Expected: **no output** except intentionally-excluded paths (chat `Stream` already
uses `response.Fail`; `Image` uses `SendFile`/`SendStatus`; `github_webhook_handler.go`
is out of scope and may still use `fiber.Map`). Confirm every hit is an excluded endpoint.

- [ ] **Step 3: Frontend gates**

Run:
```bash
cd frontend-react && bun run test && bun run build
cd ../frontend-next && bun test && bun run build
```
Expected: React 40/0 + build OK; Next tests pass + build OK.

- [ ] **Step 4: Spot-check the live shape locally (optional, needs DB)**

```bash
cd backend && make run   # or: go run cmd/server/main.go
# in another shell:
curl -s 'http://localhost:8080/api/business-units?bu=carmen' | head -c 300
# expect: {"success":true,"data":[...]}
curl -s 'http://localhost:8080/api/wiki/category/doesnotexist?bu=carmen' | head -c 300
curl -s 'http://localhost:8080/api/documents?bu=' | head -c 300
# expect an envelope on each; /health stays {"status":"ok"}:
curl -s 'http://localhost:8080/health'
```

- [ ] **Step 5: Push branch + open PR (deploy is manual, see spec §10)**

```bash
git push -u origin feat/response-envelope
gh pr create --title "Standard response envelope + typed structs" \
  --body "$(cat <<'EOF'
Implements docs/superpowers/specs/2026-06-25-response-envelope-design.md.

Backend: all in-scope JSON endpoints now return { success, data, error, meta };
typed payloads in models/ + services/; generic Swagger schemas. Both frontends
unwrap via apiJson (return shapes unchanged → components untouched).

Out of scope (unchanged): chat/stream, chat images, webhook, /health.

Deploy order (per spec §10): backend on Render first, then both Vercel frontends.
The tolerant unwrap only bridges object-returning endpoints; list endpoints would
break against the old backend if frontends deployed first.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage** (against `2026-06-25-response-envelope-design.md`):
- §2 Envelope contract → Task 1. ✓
- §2 ErrorHandler → Task 2. ✓
- §3 Error code catalog → Task 2 (codes.go) + applied in Tasks 4–11. ✓
- §4 Endpoint→payload mapping → Tasks 4–11 (every in-scope route) + Task 3 structs. ✓
- §5 Out of scope → enforced (Stream parse-error only, Image/webhook/health untouched; verified in Task 15 Step 2). ✓
- §6 Backend implementation (package, helpers, wire-up, group-by-group) → Tasks 1–11. ✓
- §7 Swagger generics + regen + `-d` dirs → Task 12. ✓
- §8 Frontend apiJson + call sites + tolerant unwrap (both apps) → Tasks 13–14. ✓
- §9 Testing (response unit tests, chat_clear, parity harness, frontend mocks, regen) → Tasks 1–2, 10, 12, 13–14. ✓
- §10 Rollout/deploy order → Task 15 Step 5 PR body. ✓

**Placeholder scan:** No "TBD"/"handle errors appropriately"/"similar to Task N". The
two discovery steps (Task 12 Step 1 parity harness, Task 14 Step 3 Next consumers)
give concrete grep commands + the exact transformation, with full reference code in
Task 13 — bounded, not open-ended.

**Type consistency:** helper names `OK`/`OKStatus`/`List`/`Fail`/`IntPtr` and types
`Envelope[T]`/`Meta`/`ErrorBody`/`ErrorResponse` used identically across all tasks.
Code constants (`CodeInvalidBU`, …) defined in Task 2 are referenced only in Tasks
4–11 (Task 1's test uses the literal `"INVALID_BU"` to stay self-contained). Payload
struct field names match the JSON keys the handlers/tests assert. `apiJson` return
`{ data, meta }` consumed consistently in Tasks 13–14.
