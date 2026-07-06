# Admin Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single admin console page at `frontend-react` `/admin` that runs the backend's `X-Admin-Key`-guarded maintenance operations (indexing, wiki sync, BU provision/deprovision, chat debug, reset, activity log) from the browser.

**Architecture:** The console is one gated React route. The operator types the admin key into a lock screen; it lives in `sessionStorage` and is attached as `X-Admin-Key` on every request via a small `adminApiJson` wrapper over the existing `apiJson`. Backend work is limited to two new admin-guarded reset endpoints (`POST /api/index/reset`, `POST /api/system/reset`) that wrap existing/near-existing DB functions. Every other operation reuses an endpoint that already exists.

**Tech Stack:** Go Fiber + GORM (backend); React 19 + React Router 7 + Vite + shadcn/ui + Tailwind (frontend); `bun test` + `@testing-library/react` (frontend tests); Go `testing` + `fiber.App.Test` (backend tests).

## Global Constraints

- Target frontend is **`frontend-react`** (Vite SPA), **not** `frontend-next`.
- Admin key is **session-scoped**: stored only in `sessionStorage["carmen_admin_key"]`, never `localStorage`, never baked into the bundle. Cleared on tab close, explicit lock, and any `401`.
- Every backend write/admin endpoint keeps `middleware.RequireAdminKey`. The key is validated client-side against the harmless GET `GET /api/index/rebuild/status?bu=carmen`.
- Default BU is `"carmen"` (`DEFAULT_BU` in `frontend-react/src/lib/config.ts`; `constants.DefaultBU` in Go).
- Reset confirm tokens (server + client typed-confirmation must match exactly): index-BU → the BU slug; index-ALL → `ALL`; chat+logs → `RESET-CHAT-LOGS`.
- API responses use the standard envelope `{ success, data, meta, error:{code,message} }`; frontend unwraps via `apiJson`/`ApiError` from `src/lib/fetch-utils.ts`.
- Backend DB-gated tests run only under `RUN_DB_TESTS=1`; the destructive system-reset DB test additionally requires `RUN_DESTRUCTIVE_TESTS=1`.
- Frontend UI uses existing shadcn components under `frontend-react/src/components/ui/*`; helper `cn` from `@/lib/utils`.
- Reset UX must state, per scope, exactly what is deleted **and what is not**, and require a typed confirmation before the button arms.

---

## Task 1: Backend — `POST /api/index/reset` (RAG index)

**Files:**
- Modify: `backend/internal/api/indexing_handler.go` (add `Reset` method + `resetRequest` type)
- Modify: `backend/internal/router/indexing_routes.go` (register route)
- Test: `backend/internal/api/indexing_handler_test.go` (create)

**Interfaces:**
- Consumes: `middleware.GetBU(c)`, `database.TruncateBUTables(bu string) error`, `database.TruncateAllBUIndexTables() error`, `response.OK/Fail`, `models.MessageResult`.
- Produces: `POST /api/index/reset?bu=<slug>|all` guarded by `RequireAdminKey`. Body `{"confirm": string}`. Returns `200 {message}`, `400` on bad body/confirm, `401` without key.

- [ ] **Step 1: Write the failing test**

Create `backend/internal/api/indexing_handler_test.go`:

```go
package api

import (
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func indexResetApp(t *testing.T) *fiber.App {
	t.Helper()
	if err := config.Load(); err != nil {
		t.Skipf("config load failed: %v", err)
	}
	config.AppConfig.Server.AdminAPIKey = "test-admin-key"
	app := fiber.New()
	app.Use(middleware.BUContext())
	h := NewIndexingHandler()
	app.Post("/api/index/reset", middleware.RequireAdminKey, h.Reset)
	return app
}

func TestIndexReset_AuthAndConfirm(t *testing.T) {
	app := indexResetApp(t)

	// 401 without admin key
	r1 := httptest.NewRequest("POST", "/api/index/reset?bu=carmen", strings.NewReader(`{"confirm":"carmen"}`))
	r1.Header.Set("Content-Type", "application/json")
	resp1, err := app.Test(r1, -1)
	if err != nil {
		t.Fatalf("req: %v", err)
	}
	if resp1.StatusCode != 401 {
		t.Fatalf("no key: status = %d, want 401", resp1.StatusCode)
	}

	// 400 on confirm mismatch (with key)
	r2 := httptest.NewRequest("POST", "/api/index/reset?bu=carmen", strings.NewReader(`{"confirm":"nope"}`))
	r2.Header.Set("Content-Type", "application/json")
	r2.Header.Set("X-Admin-Key", "test-admin-key")
	resp2, err := app.Test(r2, -1)
	if err != nil {
		t.Fatalf("req: %v", err)
	}
	if resp2.StatusCode != 400 {
		t.Fatalf("bad confirm: status = %d, want 400", resp2.StatusCode)
	}

	// 400 for bu=all when confirm != "ALL"
	r3 := httptest.NewRequest("POST", "/api/index/reset?bu=all", strings.NewReader(`{"confirm":"all"}`))
	r3.Header.Set("Content-Type", "application/json")
	r3.Header.Set("X-Admin-Key", "test-admin-key")
	resp3, err := app.Test(r3, -1)
	if err != nil {
		t.Fatalf("req: %v", err)
	}
	if resp3.StatusCode != 400 {
		t.Fatalf("bu=all wrong confirm: status = %d, want 400", resp3.StatusCode)
	}
}

func TestIndexReset_DBGated(t *testing.T) {
	if os.Getenv("RUN_DB_TESTS") != "1" {
		t.Skip("set RUN_DB_TESTS=1 to run DB-backed tests")
	}
	app := indexResetApp(t)
	if err := database.Connect(); err != nil {
		t.Skipf("DB unreachable: %v", err)
	}
	const slug = "reset_test_bu"
	t.Cleanup(func() { database.DB.Exec(`DELETE FROM public.business_units WHERE slug = ?`, slug) })
	database.DB.Exec(`INSERT INTO public.business_units (slug, name) VALUES (?, 'Reset Test') ON CONFLICT (slug) DO NOTHING`, slug)
	var buID uuid.UUID
	if err := database.DB.Raw(`SELECT id FROM public.business_units WHERE slug = ?`, slug).Row().Scan(&buID); err != nil {
		t.Fatalf("bu_id: %v", err)
	}
	database.DB.Exec(`INSERT INTO public.documents (bu_id, path, title) VALUES (?, 'd.md', 'D')`, buID)

	req := httptest.NewRequest("POST", "/api/index/reset?bu="+slug, strings.NewReader(`{"confirm":"`+slug+`"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Key", "test-admin-key")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("req: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("reset: status = %d, want 200", resp.StatusCode)
	}

	var docs int
	database.DB.Raw(`SELECT count(*) FROM public.documents WHERE bu_id = ?`, buID).Scan(&docs)
	if docs != 0 {
		t.Fatalf("documents should be gone, got %d", docs)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/api/ -run TestIndexReset -v`
Expected: FAIL — compile error `h.Reset undefined (type *IndexingHandler has no field or method Reset)`.

- [ ] **Step 3: Add the `Reset` method**

In `backend/internal/api/indexing_handler.go`, add `"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"` to the import block, then append:

```go
// resetRequest is the body for index/system reset; confirm must match a scope-specific token.
type resetRequest struct {
	Confirm string `json:"confirm"`
}

// Reset truncates the RAG index for one BU (?bu=<slug>) or every BU (?bu=all).
// Body {confirm} must equal the bu slug, or "ALL" when bu=all. Guarded by RequireAdminKey.
func (h *IndexingHandler) Reset(c *fiber.Ctx) error {
	bu := middleware.GetBU(c) // lower-cased + slug-validated by BUContext; "all" is allowed
	var req resetRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, "invalid JSON body")
	}
	confirm := strings.TrimSpace(req.Confirm)

	if strings.EqualFold(bu, "all") {
		if confirm != "ALL" {
			return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, `confirm must equal "ALL"`)
		}
		if err := database.TruncateAllBUIndexTables(); err != nil {
			return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
		}
		return response.OK(c, models.MessageResult{Message: "index reset for all BUs; run reindex to rebuild"})
	}

	if confirm != bu {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, "confirm must equal the bu slug")
	}
	if err := database.TruncateBUTables(bu); err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, models.MessageResult{Message: "index reset for " + bu + "; run reindex to rebuild"})
}
```

Then register the route in `backend/internal/router/indexing_routes.go` — add this line inside `RegisterIndexing`, after the existing `rebuild/unlock` line:

```go
	app.Post("/api/index/reset", middleware.RequireAdminKey, indexingHandler.Reset)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/api/ -run TestIndexReset -v`
Expected: PASS (`TestIndexReset_AuthAndConfirm` PASS; `TestIndexReset_DBGated` SKIP without `RUN_DB_TESTS`). Also run `go build ./...` to confirm the router change compiles.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/api/indexing_handler.go backend/internal/api/indexing_handler_test.go backend/internal/router/indexing_routes.go
git commit -m "feat(backend): POST /api/index/reset (admin-guarded RAG index reset)"
```

---

## Task 2: Backend — `POST /api/system/reset` (chat history + activity logs)

**Files:**
- Modify: `backend/internal/database/database.go` (add `ClearChatAndActivityTables`)
- Create: `backend/internal/api/system_handler.go`
- Create: `backend/internal/router/system_routes.go`
- Modify: `backend/internal/router/routes.go` (call `RegisterSystem`)
- Test: `backend/internal/api/system_handler_test.go` (create)

**Interfaces:**
- Consumes: `database.ClearChatAndActivityTables() error`, `response.OK/Fail`, `models.MessageResult`.
- Produces: `NewSystemHandler() *SystemHandler`, `(*SystemHandler).Reset`, `RegisterSystem(app *fiber.App)`. Endpoint `POST /api/system/reset`, body `{"confirm":"RESET-CHAT-LOGS"}`.

- [ ] **Step 1: Write the failing test**

Create `backend/internal/api/system_handler_test.go`:

```go
package api

import (
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/middleware"
	"github.com/gofiber/fiber/v2"
)

func systemResetApp(t *testing.T) *fiber.App {
	t.Helper()
	if err := config.Load(); err != nil {
		t.Skipf("config load failed: %v", err)
	}
	config.AppConfig.Server.AdminAPIKey = "test-admin-key"
	app := fiber.New()
	h := NewSystemHandler()
	app.Post("/api/system/reset", middleware.RequireAdminKey, h.Reset)
	return app
}

func TestSystemReset_AuthAndConfirm(t *testing.T) {
	app := systemResetApp(t)

	// 401 without key
	r1 := httptest.NewRequest("POST", "/api/system/reset", strings.NewReader(`{"confirm":"RESET-CHAT-LOGS"}`))
	r1.Header.Set("Content-Type", "application/json")
	resp1, err := app.Test(r1, -1)
	if err != nil {
		t.Fatalf("req: %v", err)
	}
	if resp1.StatusCode != 401 {
		t.Fatalf("no key: status = %d, want 401", resp1.StatusCode)
	}

	// 400 wrong confirm
	r2 := httptest.NewRequest("POST", "/api/system/reset", strings.NewReader(`{"confirm":"nope"}`))
	r2.Header.Set("Content-Type", "application/json")
	r2.Header.Set("X-Admin-Key", "test-admin-key")
	resp2, err := app.Test(r2, -1)
	if err != nil {
		t.Fatalf("req: %v", err)
	}
	if resp2.StatusCode != 400 {
		t.Fatalf("wrong confirm: status = %d, want 400", resp2.StatusCode)
	}
}

// TestSystemReset_DBGated TRUNCATEs chat_history + activity_logs for ALL BUs.
// Double-gated so it can never fire against a shared/real DB by accident.
func TestSystemReset_DBGated(t *testing.T) {
	if os.Getenv("RUN_DB_TESTS") != "1" || os.Getenv("RUN_DESTRUCTIVE_TESTS") != "1" {
		t.Skip("set RUN_DB_TESTS=1 AND RUN_DESTRUCTIVE_TESTS=1 — this wipes chat_history + activity_logs")
	}
	app := systemResetApp(t)
	if err := database.Connect(); err != nil {
		t.Skipf("DB unreachable: %v", err)
	}
	database.DB.Exec(`INSERT INTO public.activity_logs (action, category) VALUES ('t', 'test')`)

	req := httptest.NewRequest("POST", "/api/system/reset", strings.NewReader(`{"confirm":"RESET-CHAT-LOGS"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Key", "test-admin-key")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("req: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("reset: status = %d, want 200", resp.StatusCode)
	}

	var n int
	database.DB.Raw(`SELECT count(*) FROM public.activity_logs`).Scan(&n)
	if n != 0 {
		t.Fatalf("activity_logs should be empty, got %d", n)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/api/ -run TestSystemReset -v`
Expected: FAIL — compile error `undefined: NewSystemHandler`.

- [ ] **Step 3: Add the DB function, handler, route, and wiring**

In `backend/internal/database/database.go`, add after `ClearPublicTables`:

```go
// ClearChatAndActivityTables truncates only chat history and activity logs for
// all BUs. Unlike ClearPublicTables it leaves documents/chunks/business_units/
// faq intact — this backs the HTTP POST /api/system/reset endpoint.
func ClearChatAndActivityTables() error {
	return DB.Exec(`TRUNCATE TABLE public.chat_history, public.activity_logs RESTART IDENTITY`).Error
}
```

Create `backend/internal/api/system_handler.go`:

```go
package api

import (
	"strings"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/models"
	"github.com/gofiber/fiber/v2"
)

// SystemHandler owns admin-only system maintenance endpoints.
type SystemHandler struct{}

// NewSystemHandler constructs a SystemHandler.
func NewSystemHandler() *SystemHandler { return &SystemHandler{} }

type systemResetRequest struct {
	Confirm string `json:"confirm"`
}

// Reset truncates public.chat_history + public.activity_logs (all BUs). Body
// {confirm} must equal "RESET-CHAT-LOGS". Guarded by RequireAdminKey. It does
// NOT touch documents/chunks/business_units/faq.
func (h *SystemHandler) Reset(c *fiber.Ctx) error {
	var req systemResetRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, "invalid JSON body")
	}
	if strings.TrimSpace(req.Confirm) != "RESET-CHAT-LOGS" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, `confirm must equal "RESET-CHAT-LOGS"`)
	}
	if err := database.ClearChatAndActivityTables(); err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, models.MessageResult{Message: "chat history + activity logs cleared"})
}
```

Create `backend/internal/router/system_routes.go`:

```go
package router

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/middleware"
	"github.com/gofiber/fiber/v2"
)

// RegisterSystem wires the admin-only POST /api/system/reset route (clears
// chat history + activity logs).
func RegisterSystem(app *fiber.App) {
	h := api.NewSystemHandler()
	app.Post("/api/system/reset", middleware.RequireAdminKey, h.Reset)
}
```

In `backend/internal/router/routes.go`, add `RegisterSystem(app)` inside `SetupRoutes`, right after `RegisterBusinessUnits(app)`:

```go
	RegisterBusinessUnits(app)
	RegisterSystem(app)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/api/ -run TestSystemReset -v`
Expected: PASS (`TestSystemReset_AuthAndConfirm` PASS; `TestSystemReset_DBGated` SKIP). Then `cd backend && go build ./...` — must compile.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/database/database.go backend/internal/api/system_handler.go backend/internal/api/system_handler_test.go backend/internal/router/system_routes.go backend/internal/router/routes.go
git commit -m "feat(backend): POST /api/system/reset (clear chat history + activity logs)"
```

---

## Task 3: Frontend — `admin-auth.ts` (session key storage)

**Files:**
- Create: `frontend-react/src/lib/admin-auth.ts`
- Test: `frontend-react/src/lib/admin-auth.test.ts` (create)

**Interfaces:**
- Produces: `getAdminKey(): string | null`, `setAdminKey(k: string): void`, `clearAdminKey(): void`. `clearAdminKey` also dispatches a `window` `"admin-key-cleared"` event.

- [ ] **Step 1: Write the failing test**

Create `frontend-react/src/lib/admin-auth.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "bun:test";
import { getAdminKey, setAdminKey, clearAdminKey } from "./admin-auth";

describe("admin-auth", () => {
  beforeEach(() => sessionStorage.clear());

  it("round-trips the key through sessionStorage", () => {
    expect(getAdminKey()).toBeNull();
    setAdminKey("abc");
    expect(getAdminKey()).toBe("abc");
    clearAdminKey();
    expect(getAdminKey()).toBeNull();
  });

  it("dispatches admin-key-cleared on clear", () => {
    let fired = false;
    const handler = () => { fired = true; };
    window.addEventListener("admin-key-cleared", handler);
    setAdminKey("abc");
    clearAdminKey();
    window.removeEventListener("admin-key-cleared", handler);
    expect(fired).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && bun test src/lib/admin-auth.test.ts`
Expected: FAIL — cannot resolve `./admin-auth`.

- [ ] **Step 3: Write the implementation**

Create `frontend-react/src/lib/admin-auth.ts`:

```ts
/**
 * Session-scoped admin key store. The key lives only in sessionStorage (gone
 * when the tab closes) and is attached as X-Admin-Key by admin-fetch. It is
 * never written to localStorage or the bundle.
 */
const STORAGE_KEY = "carmen_admin_key";

export function getAdminKey(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminKey(key: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function clearAdminKey(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("admin-key-cleared"));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && bun test src/lib/admin-auth.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/lib/admin-auth.ts frontend-react/src/lib/admin-auth.test.ts
git commit -m "feat(frontend): admin-auth session key store"
```

---

## Task 4: Frontend — `admin-fetch.ts` (X-Admin-Key wrapper)

**Files:**
- Create: `frontend-react/src/lib/admin-fetch.ts`
- Test: `frontend-react/src/lib/admin-fetch.test.ts` (create)

**Interfaces:**
- Consumes: `API_BASE` (config), `apiJson`, `ApiError`, `Meta` (fetch-utils), `getAdminKey`, `clearAdminKey` (admin-auth).
- Produces: `adminApiJson<T>(path: string, init?: RequestInit): Promise<{ data: T; meta?: Meta }>`. Injects `X-Admin-Key`; on `401` clears the key then rethrows the `ApiError`.

- [ ] **Step 1: Write the failing test**

Create `frontend-react/src/lib/admin-fetch.test.ts`:

```ts
import { describe, it, expect, jest, beforeEach } from "bun:test";
import { adminApiJson } from "./admin-fetch";
import { getAdminKey, setAdminKey } from "./admin-auth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("adminApiJson", () => {
  beforeEach(() => sessionStorage.clear());

  it("injects the X-Admin-Key header from sessionStorage", async () => {
    setAdminKey("my-key");
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ success: true, data: { ok: 1 } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await adminApiJson("/api/x");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Admin-Key"]).toBe("my-key");
  });

  it("clears the key and throws on 401", async () => {
    setAdminKey("my-key");
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ success: false, error: { code: "UNAUTHORIZED", message: "no" } }, 401)) as unknown as typeof fetch;

    await expect(adminApiJson("/api/x")).rejects.toThrow();
    expect(getAdminKey()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && bun test src/lib/admin-fetch.test.ts`
Expected: FAIL — cannot resolve `./admin-fetch`.

- [ ] **Step 3: Write the implementation**

Create `frontend-react/src/lib/admin-fetch.ts`:

```ts
import { API_BASE } from "@/lib/config";
import { apiJson, ApiError, type Meta } from "@/lib/fetch-utils";
import { getAdminKey, clearAdminKey } from "@/lib/admin-auth";

/**
 * apiJson variant for admin-guarded endpoints: prepends API_BASE, attaches the
 * session admin key as X-Admin-Key, and JSON content-type. On 401 it clears the
 * stored key (which re-locks the console) then rethrows the ApiError.
 */
export async function adminApiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T; meta?: Meta }> {
  const key = getAdminKey();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (key) headers["X-Admin-Key"] = key;

  try {
    return await apiJson<T>(`${API_BASE}${path}`, { ...init, headers });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      clearAdminKey();
    }
    throw err;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && bun test src/lib/admin-fetch.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/lib/admin-fetch.ts frontend-react/src/lib/admin-fetch.test.ts
git commit -m "feat(frontend): adminApiJson wrapper (X-Admin-Key + 401 re-lock)"
```

---

## Task 5: Frontend — shared primitives (OutputLog, useAdminAction, useBusinessUnits)

**Files:**
- Create: `frontend-react/src/components/admin/output-log.tsx`
- Create: `frontend-react/src/hooks/use-admin-action.ts`
- Create: `frontend-react/src/hooks/use-business-units.ts`
- Test: `frontend-react/src/hooks/use-admin-action.test.tsx` (create)

**Interfaces:**
- Produces:
  - `type LogEntry = { ts: string; ok: boolean; title: string; body?: unknown }` and `OutputLog({ entries }: { entries: LogEntry[] })`.
  - `useAdminAction()` → `{ entries: LogEntry[]; busy: boolean; run(title: string, fn: () => Promise<unknown>): Promise<unknown> }`. `run` pushes a success entry (newest first, capped 20) or, on throw, an error entry, then rethrows.
  - `type BusinessUnit = { id: string; slug: string; name?: string }` and `useBusinessUnits(): BusinessUnit[]` (fetches `GET /api/business-units` on mount).

- [ ] **Step 1: Write the failing test**

Create `frontend-react/src/hooks/use-admin-action.test.tsx`:

```tsx
import { describe, it, expect } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/fetch-utils";
import { useAdminAction } from "./use-admin-action";

function Harness() {
  const { entries, run } = useAdminAction();
  return (
    <div>
      <button onClick={() => run("ok-title", async () => ({ ok: 1 }))}>go-ok</button>
      <button
        onClick={() => run("err-title", async () => {
          throw new ApiError("X", "boom", 500);
        }).catch(() => {})}
      >
        go-err
      </button>
      <ul>
        {entries.map((e, i) => (
          <li key={i}>{e.ok ? "OK" : "ERR"}:{e.title}</li>
        ))}
      </ul>
    </div>
  );
}

describe("useAdminAction", () => {
  it("records a success entry", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("go-ok"));
    expect(await screen.findByText("OK:ok-title")).toBeInTheDocument();
  });

  it("records an error entry when the action throws", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("go-err"));
    await waitFor(() => expect(screen.getByText("ERR:err-title")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && bun test src/hooks/use-admin-action.test.tsx`
Expected: FAIL — cannot resolve `./use-admin-action`.

- [ ] **Step 3: Write the implementations**

Create `frontend-react/src/components/admin/output-log.tsx`:

```tsx
import { cn } from "@/lib/utils";

export type LogEntry = { ts: string; ok: boolean; title: string; body?: unknown };

export function OutputLog({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        ยังไม่มีผลลัพธ์ — กดปุ่มด้านบนเพื่อรันคำสั่ง
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {entries.map((e, i) => (
        <div
          key={i}
          className={cn(
            "rounded-md border p-3 text-sm",
            e.ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5",
          )}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-medium">{e.title}</span>
            <span className="text-xs text-muted-foreground">{e.ts}</span>
          </div>
          {e.body != null && (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
              {typeof e.body === "string" ? e.body : JSON.stringify(e.body, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
```

Create `frontend-react/src/hooks/use-admin-action.ts`:

```ts
import { useCallback, useState } from "react";
import { ApiError } from "@/lib/fetch-utils";
import type { LogEntry } from "@/components/admin/output-log";

/**
 * Runs an admin action, capturing its result (or error) into a capped, newest-
 * first log the panels render via <OutputLog>. `run` rethrows so callers can
 * chain follow-ups (e.g. status polling) but the log entry is recorded either way.
 */
export function useAdminAction() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (title: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    const ts = new Date().toLocaleTimeString("th-TH");
    try {
      const data = await fn();
      setEntries((prev) => [{ ts, ok: true, title, body: data }, ...prev].slice(0, 20));
      return data;
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? `[${e.status} ${e.code}] ${e.message}`
          : e instanceof Error
            ? e.message
            : String(e);
      setEntries((prev) => [{ ts, ok: false, title, body: msg }, ...prev].slice(0, 20));
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  return { entries, busy, run };
}
```

Create `frontend-react/src/hooks/use-business-units.ts`:

```ts
import { useEffect, useState } from "react";
import { adminApiJson } from "@/lib/admin-fetch";

export type BusinessUnit = { id: string; slug: string; name?: string };

/** Loads the BU list once on mount for dropdowns. Returns [] on error. */
export function useBusinessUnits(): BusinessUnit[] {
  const [bus, setBus] = useState<BusinessUnit[]>([]);
  useEffect(() => {
    let alive = true;
    adminApiJson<BusinessUnit[]>("/api/business-units")
      .then(({ data }) => {
        if (alive) setBus(data ?? []);
      })
      .catch(() => {
        if (alive) setBus([]);
      });
    return () => {
      alive = false;
    };
  }, []);
  return bus;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && bun test src/hooks/use-admin-action.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/admin/output-log.tsx frontend-react/src/hooks/use-admin-action.ts frontend-react/src/hooks/use-admin-action.test.tsx frontend-react/src/hooks/use-business-units.ts
git commit -m "feat(frontend): admin primitives (OutputLog, useAdminAction, useBusinessUnits)"
```

---

## Task 6: Frontend — Indexing panel

**Files:**
- Create: `frontend-react/src/components/admin/indexing-panel.tsx`
- Test: `frontend-react/src/components/admin/indexing-panel.test.tsx` (create)

**Interfaces:**
- Consumes: `adminApiJson`, `useAdminAction`, `useBusinessUnits`, `OutputLog`, `DEFAULT_BU`, shadcn `Button`/`Input`/`Label`/`Card`/`Select*`.
- Produces: `IndexingPanel()` (named export).

- [ ] **Step 1: Write the failing test**

Create `frontend-react/src/components/admin/indexing-panel.test.tsx`:

```tsx
import { describe, it, expect, mock, jest, beforeEach } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const adminApiJson = jest.fn();
mock.module("@/lib/admin-fetch", () => ({ adminApiJson }));
mock.module("@/hooks/use-business-units", () => ({
  useBusinessUnits: () => [{ id: "1", slug: "carmen" }],
}));

const { IndexingPanel } = await import("./indexing-panel");

describe("IndexingPanel", () => {
  beforeEach(() => adminApiJson.mockReset());

  it("calls the status endpoint and logs the result", async () => {
    adminApiJson.mockResolvedValue({ data: { bu: "carmen", running: false } });
    render(<IndexingPanel />);
    fireEvent.click(screen.getByRole("button", { name: /Check Status/i }));
    await waitFor(() =>
      expect(adminApiJson).toHaveBeenCalledWith("/api/index/rebuild/status?bu=carmen"),
    );
    expect(await screen.findByText(/running/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && bun test src/components/admin/indexing-panel.test.tsx`
Expected: FAIL — cannot resolve `./indexing-panel`.

- [ ] **Step 3: Write the implementation**

Create `frontend-react/src/components/admin/indexing-panel.tsx`:

```tsx
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_BU } from "@/lib/config";
import { adminApiJson } from "@/lib/admin-fetch";
import { OutputLog } from "@/components/admin/output-log";
import { useAdminAction } from "@/hooks/use-admin-action";
import { useBusinessUnits } from "@/hooks/use-business-units";

export function IndexingPanel() {
  const bus = useBusinessUnits();
  const [bu, setBu] = useState(DEFAULT_BU);
  const [path, setPath] = useState("");
  const { entries, busy, run } = useAdminAction();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [polling, setPolling] = useState(false);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  }

  async function rebuild() {
    await run(`rebuild ${bu}`, () =>
      adminApiJson(`/api/index/rebuild?bu=${encodeURIComponent(bu)}`, { method: "POST" }).then((r) => r.data),
    );
    stopPolling();
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await adminApiJson<{ running: boolean; running_for_sec?: number }>(
          `/api/index/rebuild/status?bu=${encodeURIComponent(bu)}`,
        );
        if (!data.running) {
          stopPolling();
          await run(`status ${bu}`, async () => data);
        }
      } catch {
        stopPolling();
      }
    }, 3000);
  }

  const options = bus.length ? bus.map((b) => b.slug) : [DEFAULT_BU];

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold">Indexing / Reindex</h2>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Business Unit</Label>
          <Select value={bu} onValueChange={setBu}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((slug) => (
                <SelectItem key={slug} value={slug}>
                  {slug}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={rebuild} disabled={busy || polling}>
          Rebuild
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() =>
            run(`status ${bu}`, () =>
              adminApiJson(`/api/index/rebuild/status?bu=${encodeURIComponent(bu)}`).then((r) => r.data),
            )
          }
        >
          Check Status
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() =>
            run(`unlock ${bu}`, () =>
              adminApiJson(`/api/index/rebuild/unlock?bu=${encodeURIComponent(bu)}`, { method: "POST" }).then(
                (r) => r.data,
              ),
            )
          }
        >
          Force Unlock
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Rebuild one file (path)</Label>
          <Input
            className="w-72"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="wiki/....md"
          />
        </div>
        <Button
          variant="secondary"
          disabled={busy || !path.trim()}
          onClick={() =>
            run(`rebuild one ${path.trim()}`, () =>
              adminApiJson(
                `/api/index/rebuild/one?bu=${encodeURIComponent(bu)}&path=${encodeURIComponent(path.trim())}`,
                { method: "POST" },
              ).then((r) => r.data),
            )
          }
        >
          Rebuild One
        </Button>
      </div>

      {polling && (
        <p className="mb-3 text-sm text-muted-foreground">กำลัง reindex… (poll สถานะทุก 3 วินาที)</p>
      )}
      <OutputLog entries={entries} />
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && bun test src/components/admin/indexing-panel.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/admin/indexing-panel.tsx frontend-react/src/components/admin/indexing-panel.test.tsx
git commit -m "feat(frontend): admin Indexing panel"
```

---

## Task 7: Frontend — Wiki Sync panel

**Files:**
- Create: `frontend-react/src/components/admin/wiki-sync-panel.tsx`

**Interfaces:**
- Consumes: `adminApiJson`, `useAdminAction`, `OutputLog`, shadcn `Button`/`Card`.
- Produces: `WikiSyncPanel()` (named export).

No dedicated unit test — thin wrapper over `adminApiJson`; the button→endpoint→OutputLog pattern is already verified in Task 6. Verify manually in Task 12 (in-app).

- [ ] **Step 1: Write the implementation**

Create `frontend-react/src/components/admin/wiki-sync-panel.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { adminApiJson } from "@/lib/admin-fetch";
import { OutputLog } from "@/components/admin/output-log";
import { useAdminAction } from "@/hooks/use-admin-action";

export function WikiSyncPanel() {
  const { entries, busy, run } = useAdminAction();
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold">Wiki Sync</h2>
      <div className="mb-4 flex flex-wrap gap-3">
        <Button
          disabled={busy}
          onClick={() =>
            run("wiki sync", () => adminApiJson("/api/wiki/sync", { method: "POST" }).then((r) => r.data))
          }
        >
          Sync now
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => run("wiki sync audit", () => adminApiJson("/api/wiki/sync/audit").then((r) => r.data))}
        >
          View Audit
        </Button>
      </div>
      <OutputLog entries={entries} />
    </Card>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend-react && bun run lint`
Expected: no errors for the new file.

- [ ] **Step 3: Commit**

```bash
git add frontend-react/src/components/admin/wiki-sync-panel.tsx
git commit -m "feat(frontend): admin Wiki Sync panel"
```

---

## Task 8: Frontend — Business Units panel

**Files:**
- Create: `frontend-react/src/components/admin/business-units-panel.tsx`

**Interfaces:**
- Consumes: `adminApiJson`, `useAdminAction`, `useBusinessUnits`/`BusinessUnit`, `OutputLog`, shadcn `Button`/`Input`/`Label`/`Card`/`AlertDialog*`.
- Produces: `BusinessUnitsPanel()` (named export).

No dedicated unit test — provision/deprovision are `adminApiJson` calls; deprovision is gated behind an `AlertDialog` + an existing-slug check. Verify manually in Task 12.

- [ ] **Step 1: Write the implementation**

Create `frontend-react/src/components/admin/business-units-panel.tsx`:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { adminApiJson } from "@/lib/admin-fetch";
import { OutputLog } from "@/components/admin/output-log";
import { useAdminAction } from "@/hooks/use-admin-action";
import { useBusinessUnits, type BusinessUnit } from "@/hooks/use-business-units";

export function BusinessUnitsPanel() {
  const bus = useBusinessUnits();
  const { entries, busy, run } = useAdminAction();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [deprovSlug, setDeprovSlug] = useState("");

  const deprovValid = !!deprovSlug.trim() && bus.some((b) => b.slug === deprovSlug.trim());

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold">Business Units</h2>

      <Button
        variant="secondary"
        className="mb-4"
        disabled={busy}
        onClick={() =>
          run("list BUs", () => adminApiJson<BusinessUnit[]>("/api/business-units").then((r) => r.data))
        }
      >
        List business units
      </Button>

      <div className="mb-5 rounded-md border p-4">
        <h3 className="mb-3 text-sm font-medium">Provision</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my_bu" />
          </div>
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
        </div>
        <Button
          className="mt-3"
          disabled={busy || !slug.trim()}
          onClick={() =>
            run(`provision ${slug.trim()}`, () =>
              adminApiJson("/api/business-units/provision", {
                method: "POST",
                body: JSON.stringify({ slug: slug.trim(), name: name.trim(), description: desc.trim() }),
              }).then((r) => r.data),
            )
          }
        >
          Provision
        </Button>
      </div>

      <div className="mb-4 rounded-md border border-red-500/40 p-4">
        <h3 className="mb-1 text-sm font-medium text-red-600 dark:text-red-400">
          Deprovision (ลบ BU + ข้อมูลทั้งหมดแบบ cascade)
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          พิมพ์ slug ให้ตรงกับ BU ที่มีอยู่ ปุ่มจะเปิดใช้งานเมื่อ slug ตรงเท่านั้น
        </p>
        <div className="space-y-1">
          <Label>Slug ที่จะลบ</Label>
          <Input
            className="w-60"
            value={deprovSlug}
            onChange={(e) => setDeprovSlug(e.target.value)}
            placeholder="เช่น carmen"
          />
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-3" disabled={busy || !deprovValid}>
              Deprovision
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ลบ BU &quot;{deprovSlug}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                เอกสาร / แชท / FAQ ของ BU นี้จะถูกลบแบบ cascade — ย้อนกลับไม่ได้
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() =>
                  run(`deprovision ${deprovSlug.trim()}`, () =>
                    adminApiJson("/api/business-units/deprovision", {
                      method: "POST",
                      body: JSON.stringify({ slug: deprovSlug.trim() }),
                    }).then((r) => r.data),
                  )
                }
              >
                ยืนยันลบ
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <OutputLog entries={entries} />
    </Card>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend-react && bun run lint`
Expected: no errors for the new file.

- [ ] **Step 3: Commit**

```bash
git add frontend-react/src/components/admin/business-units-panel.tsx
git commit -m "feat(frontend): admin Business Units panel (provision/deprovision)"
```

---

## Task 9: Frontend — Chat Debug panel

**Files:**
- Create: `frontend-react/src/components/admin/chat-debug-panel.tsx`

**Interfaces:**
- Consumes: `adminApiJson`, `useAdminAction`, `OutputLog`, shadcn `Button`/`Input`/`Label`/`Card`.
- Produces: `ChatDebugPanel()` (named export). Route/intent test bodies use `{ message }` (matches the Go handler's `req.Message`).

No dedicated unit test — same button→endpoint→OutputLog pattern as Task 6.

- [ ] **Step 1: Write the implementation**

Create `frontend-react/src/components/admin/chat-debug-panel.tsx`:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { adminApiJson } from "@/lib/admin-fetch";
import { OutputLog } from "@/components/admin/output-log";
import { useAdminAction } from "@/hooks/use-admin-action";

export function ChatDebugPanel() {
  const { entries, busy, run } = useAdminAction();
  const [q, setQ] = useState("");

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold">Chat Debug</h2>
      <div className="mb-3 space-y-1">
        <Label>Query</Label>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์คำถามเพื่อทดสอบ routing" />
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Button
          disabled={busy || !q.trim()}
          onClick={() =>
            run("route-test", () =>
              adminApiJson("/api/chat/route-test", {
                method: "POST",
                body: JSON.stringify({ message: q.trim() }),
              }).then((r) => r.data),
            )
          }
        >
          Route Test
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !q.trim()}
          onClick={() =>
            run("intent-test", () =>
              adminApiJson("/api/chat/intent-test", {
                method: "POST",
                body: JSON.stringify({ message: q.trim() }),
              }).then((r) => r.data),
            )
          }
        >
          Intent Test
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() =>
            run("history list", () =>
              adminApiJson("/api/chat/history/list?bu=carmen&limit=20").then((r) => r.data),
            )
          }
        >
          History list
        </Button>
      </div>
      <OutputLog entries={entries} />
    </Card>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend-react && bun run lint`
Expected: no errors for the new file.

- [ ] **Step 3: Commit**

```bash
git add frontend-react/src/components/admin/chat-debug-panel.tsx
git commit -m "feat(frontend): admin Chat Debug panel"
```

---

## Task 10: Frontend — Reset panel (UX-critical)

**Files:**
- Create: `frontend-react/src/components/admin/reset-panel.tsx`
- Test: `frontend-react/src/components/admin/reset-panel.test.tsx` (create)

**Interfaces:**
- Consumes: `adminApiJson`, `useAdminAction`, `useBusinessUnits`, `OutputLog`, `DEFAULT_BU`, shadcn `Button`/`Input`/`Label`/`Card`/`RadioGroup*`/`Select*`/`AlertDialog*`.
- Produces: `ResetPanel()` (named export). Three scopes: `index-bu` → `POST /api/index/reset?bu=<slug>` confirm=slug; `index-all` → `POST /api/index/reset?bu=all` confirm=`ALL`; `chat-logs` → `POST /api/system/reset` confirm=`RESET-CHAT-LOGS`. **Run reset** stays disabled until the typed confirmation equals the scope token, then opens an `AlertDialog` for a final confirm.

**UX requirements (must be met):** each scope shows a distinct label, a warning stating exactly what is deleted AND what is not (RAG index vs chat history are never confused), the required token displayed inline, a typed-confirmation input, and a two-step arm (type token → dialog confirm).

- [ ] **Step 1: Write the failing test**

Create `frontend-react/src/components/admin/reset-panel.test.tsx`:

```tsx
import { describe, it, expect, mock, jest, beforeEach } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const adminApiJson = jest.fn();
mock.module("@/lib/admin-fetch", () => ({ adminApiJson }));
mock.module("@/hooks/use-business-units", () => ({
  useBusinessUnits: () => [{ id: "1", slug: "carmen" }],
}));

const { ResetPanel } = await import("./reset-panel");

describe("ResetPanel", () => {
  beforeEach(() => adminApiJson.mockReset());

  it("keeps Run reset disabled until the confirm token matches", () => {
    render(<ResetPanel />);
    const btn = screen.getByRole("button", { name: /Run reset/i });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/เพื่อยืนยัน/), { target: { value: "carmen" } });
    expect(btn).not.toBeDisabled();
  });

  it("posts to /api/index/reset with confirm=slug for the BU scope", async () => {
    adminApiJson.mockResolvedValue({ data: { message: "ok" } });
    render(<ResetPanel />);
    fireEvent.change(screen.getByLabelText(/เพื่อยืนยัน/), { target: { value: "carmen" } });
    fireEvent.click(screen.getByRole("button", { name: /Run reset/i })); // open dialog
    fireEvent.click(await screen.findByRole("button", { name: /ยืนยัน reset/i })); // confirm
    await waitFor(() =>
      expect(adminApiJson).toHaveBeenCalledWith(
        "/api/index/reset?bu=carmen",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ confirm: "carmen" }) }),
      ),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && bun test src/components/admin/reset-panel.test.tsx`
Expected: FAIL — cannot resolve `./reset-panel`.

- [ ] **Step 3: Write the implementation**

Create `frontend-react/src/components/admin/reset-panel.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DEFAULT_BU } from "@/lib/config";
import { adminApiJson } from "@/lib/admin-fetch";
import { OutputLog } from "@/components/admin/output-log";
import { useAdminAction } from "@/hooks/use-admin-action";
import { useBusinessUnits } from "@/hooks/use-business-units";

type Scope = "index-bu" | "index-all" | "chat-logs";

export function ResetPanel() {
  const bus = useBusinessUnits();
  const [scope, setScope] = useState<Scope>("index-bu");
  const [bu, setBu] = useState(DEFAULT_BU);
  const [confirmText, setConfirmText] = useState("");
  const { entries, busy, run } = useAdminAction();

  const spec = useMemo(() => {
    if (scope === "index-bu") {
      return {
        token: bu,
        warn: `ลบ RAG index (documents + chunks) ของ BU "${bu}" ทั้งหมด — ต้องสั่ง Reindex ใหม่หลังทำ. ไม่กระทบประวัติแชท`,
        request: () =>
          adminApiJson(`/api/index/reset?bu=${encodeURIComponent(bu)}`, {
            method: "POST",
            body: JSON.stringify({ confirm: bu }),
          }),
      };
    }
    if (scope === "index-all") {
      return {
        token: "ALL",
        warn: "ลบ RAG index ของ ทุก BU — ต้องสั่ง Reindex ใหม่ทั้งหมด. ไม่กระทบประวัติแชท",
        request: () =>
          adminApiJson(`/api/index/reset?bu=all`, {
            method: "POST",
            body: JSON.stringify({ confirm: "ALL" }),
          }),
      };
    }
    return {
      token: "RESET-CHAT-LOGS",
      warn: "ลบ ประวัติแชท + activity log ของ ทุก BU. ไม่กระทบ RAG index / เอกสาร",
      request: () =>
        adminApiJson(`/api/system/reset`, {
          method: "POST",
          body: JSON.stringify({ confirm: "RESET-CHAT-LOGS" }),
        }),
    };
  }, [scope, bu]);

  const armed = confirmText.trim() === spec.token && !busy;

  async function doReset() {
    try {
      await run(`reset ${scope}`, () => spec.request().then((r) => r.data));
    } catch {
      /* error already logged by useAdminAction */
    }
    setConfirmText("");
  }

  const options = bus.length ? bus.map((b) => b.slug) : [DEFAULT_BU];

  return (
    <Card className="border-red-500/40 p-5">
      <h2 className="mb-1 text-lg font-semibold text-red-600 dark:text-red-400">Reset (อันตราย)</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        การ reset ลบข้อมูลถาวรและย้อนกลับไม่ได้ — อ่านคำเตือนของแต่ละแบบให้ดีก่อนทำ
      </p>

      <RadioGroup
        value={scope}
        onValueChange={(v) => {
          setScope(v as Scope);
          setConfirmText("");
        }}
        className="mb-4 space-y-2"
      >
        <label className="flex items-start gap-2">
          <RadioGroupItem value="index-bu" id="s-bu" className="mt-1" />
          <span>
            <span className="font-medium">Reset RAG index — BU เดียว</span>
            <br />
            <span className="text-xs text-muted-foreground">ลบ index ของ BU ที่เลือก · ต้อง reindex ใหม่</span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <RadioGroupItem value="index-all" id="s-all" className="mt-1" />
          <span>
            <span className="font-medium">Reset RAG index — ทุก BU</span>
            <br />
            <span className="text-xs text-muted-foreground">ลบ index ของทุก BU · ต้อง reindex ใหม่ทั้งหมด</span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <RadioGroupItem value="chat-logs" id="s-chat" className="mt-1" />
          <span>
            <span className="font-medium">Reset ประวัติแชท + activity log</span>
            <br />
            <span className="text-xs text-muted-foreground">ลบแชท/ล็อกของทุก BU · ไม่กระทบ index</span>
          </span>
        </label>
      </RadioGroup>

      {scope === "index-bu" && (
        <div className="mb-4 space-y-1">
          <Label>Business Unit</Label>
          <Select
            value={bu}
            onValueChange={(v) => {
              setBu(v);
              setConfirmText("");
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">
        ⚠️ {spec.warn}
      </div>

      <div className="mb-4 space-y-1">
        <Label htmlFor="reset-confirm">
          พิมพ์ <code className="rounded bg-muted px-1">{spec.token}</code> เพื่อยืนยัน
        </Label>
        <Input
          id="reset-confirm"
          className="w-72"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={spec.token}
          autoComplete="off"
        />
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={!armed}>
            Run reset
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการ reset?</AlertDialogTitle>
            <AlertDialogDescription>{spec.warn} — ย้อนกลับไม่ได้</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={doReset} className="bg-red-600 hover:bg-red-700">
              ยืนยัน reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-4">
        <OutputLog entries={entries} />
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && bun test src/components/admin/reset-panel.test.tsx`
Expected: PASS (2 tests). If the Radix `AlertDialog` portal is not found by `findByRole` in the test env, assert the request via the dialog's action button as written; the two tests above are the acceptance bar.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/admin/reset-panel.tsx frontend-react/src/components/admin/reset-panel.test.tsx
git commit -m "feat(frontend): admin Reset panel (scoped, typed-confirm, dialog)"
```

---

## Task 11: Frontend — Activity panel (migrated from `admin/activity`)

**Files:**
- Create: `frontend-react/src/components/admin/activity-panel.tsx`

**Interfaces:**
- Consumes: `adminApiJson`, `Meta` (fetch-utils), shadcn `Card`.
- Produces: `ActivityPanel()` (named export). Fetches `GET /api/activity/list?bu=carmen&limit=50&offset=0&source=all` on mount; renders the log table.

- [ ] **Step 1: Write the implementation**

Create `frontend-react/src/components/admin/activity-panel.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { adminApiJson } from "@/lib/admin-fetch";
import type { Meta } from "@/lib/fetch-utils";

type ActivityLog = {
  id: string;
  user_id: string;
  action: string;
  category: string;
  timestamp: string;
};

export function ActivityPanel() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let alive = true;
    adminApiJson<ActivityLog[]>("/api/activity/list?bu=carmen&limit=50&offset=0&source=all")
      .then(({ data, meta }: { data: ActivityLog[]; meta?: Meta }) => {
        if (alive) {
          setLogs(data ?? []);
          setTotal(meta?.total ?? 0);
        }
      })
      .catch(() => {
        if (alive) {
          setLogs([]);
          setTotal(0);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-lg font-semibold">Activity Log</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        ประวัติการซิงค์ Wiki, Re-indexing และกิจกรรมระบบ (BU carmen) — รวม {total} รายการแรก
      </p>
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">ยังไม่มีกิจกรรมที่บันทึกไว้</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-3 py-2 text-left font-medium">เวลา</th>
                <th className="px-3 py-2 text-left font-medium">Action</th>
                <th className="px-3 py-2 text-left font-medium">หมวด</th>
                <th className="px-3 py-2 text-left font-medium">User</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-border/60 hover:bg-muted/40">
                  <td className="px-3 py-2 align-top whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString("th-TH")}
                  </td>
                  <td className="px-3 py-2 align-top font-medium">{log.action}</td>
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">{log.category || "system"}</td>
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">{log.user_id || "system"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend-react && bun run lint`
Expected: no errors for the new file.

- [ ] **Step 3: Commit**

```bash
git add frontend-react/src/components/admin/activity-panel.tsx
git commit -m "feat(frontend): admin Activity Log panel"
```

---

## Task 12: Frontend — shell (AdminGate + sidebar + `/admin` route + redirect)

**Files:**
- Create: `frontend-react/src/components/admin/admin-gate.tsx`
- Create: `frontend-react/src/components/admin/admin-sidebar.tsx`
- Create: `frontend-react/src/routes/admin.tsx`
- Modify: `frontend-react/src/router.tsx` (add `/admin`, redirect `/admin/activity`, drop old loader import)
- Delete: `frontend-react/src/routes/admin-activity.tsx`
- Test: `frontend-react/src/components/admin/admin-gate.test.tsx` (create)

**Interfaces:**
- Consumes: all panels from Tasks 6–11, `getAdminKey`, `setAdminKey`, `clearAdminKey`, `adminApiJson`, `ApiError`, shadcn `Button`/`Input`/`Label`/`Card`.
- Produces: `AdminGate({ onUnlocked })`, `AdminSidebar({ active, onSelect })` + `type AdminSection`, default-export `Admin()` page.

- [ ] **Step 1: Write the failing test**

Create `frontend-react/src/components/admin/admin-gate.test.tsx`:

```tsx
import { describe, it, expect, mock, jest, beforeEach } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/fetch-utils";

const adminApiJson = jest.fn();
mock.module("@/lib/admin-fetch", () => ({ adminApiJson }));

const { AdminGate } = await import("./admin-gate");

describe("AdminGate", () => {
  beforeEach(() => {
    adminApiJson.mockReset();
    sessionStorage.clear();
  });

  it("unlocks on a valid key", async () => {
    adminApiJson.mockResolvedValue({ data: {} });
    const onUnlocked = jest.fn();
    render(<AdminGate onUnlocked={onUnlocked} />);
    fireEvent.change(screen.getByLabelText(/Admin key/i), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /Unlock/i }));
    await waitFor(() => expect(onUnlocked).toHaveBeenCalled());
  });

  it("shows an error and stays locked on 401", async () => {
    adminApiJson.mockRejectedValue(new ApiError("UNAUTHORIZED", "no", 401));
    const onUnlocked = jest.fn();
    render(<AdminGate onUnlocked={onUnlocked} />);
    fireEvent.change(screen.getByLabelText(/Admin key/i), { target: { value: "bad" } });
    fireEvent.click(screen.getByRole("button", { name: /Unlock/i }));
    expect(await screen.findByText(/ไม่ถูกต้อง/)).toBeInTheDocument();
    expect(onUnlocked).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && bun test src/components/admin/admin-gate.test.tsx`
Expected: FAIL — cannot resolve `./admin-gate`.

- [ ] **Step 3: Write gate + sidebar + page, then wire the router**

Create `frontend-react/src/components/admin/admin-gate.tsx`:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { setAdminKey, clearAdminKey } from "@/lib/admin-auth";
import { adminApiJson } from "@/lib/admin-fetch";
import { ApiError } from "@/lib/fetch-utils";

export function AdminGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const key = value.trim();
    if (!key) return;
    setBusy(true);
    setError(null);
    setAdminKey(key); // temporarily store so adminApiJson attaches it
    try {
      // Validate with a harmless admin-guarded GET (no side effects).
      await adminApiJson("/api/index/rebuild/status?bu=carmen");
      onUnlocked();
    } catch (err) {
      clearAdminKey();
      if (err instanceof ApiError && err.status === 401) {
        setError("Admin key ไม่ถูกต้อง");
      } else {
        setError("เชื่อมต่อ backend ไม่ได้ ลองใหม่อีกครั้ง");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm items-center px-4">
      <Card className="w-full p-6">
        <h1 className="mb-1 text-lg font-semibold">Admin Console</h1>
        <p className="mb-4 text-sm text-muted-foreground">กรอก admin key เพื่อเข้าใช้งาน</p>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="admin-key">Admin key</Label>
            <Input
              id="admin-key"
              type="password"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={busy}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || !value.trim()}>
            {busy ? "กำลังตรวจสอบ…" : "Unlock"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

Create `frontend-react/src/components/admin/admin-sidebar.tsx`:

```tsx
import { cn } from "@/lib/utils";

export type AdminSection = "indexing" | "wiki" | "bu" | "chat" | "reset" | "activity";

const ITEMS: { key: AdminSection; label: string; danger?: boolean }[] = [
  { key: "indexing", label: "Indexing / Reindex" },
  { key: "wiki", label: "Wiki Sync" },
  { key: "bu", label: "Business Units" },
  { key: "chat", label: "Chat Debug" },
  { key: "reset", label: "Reset", danger: true },
  { key: "activity", label: "Activity Log" },
];

export function AdminSidebar({
  active,
  onSelect,
}: {
  active: AdminSection;
  onSelect: (s: AdminSection) => void;
}) {
  return (
    <nav className="flex gap-1 overflow-x-auto md:w-52 md:flex-col md:overflow-visible">
      {ITEMS.map((it) => (
        <button
          key={it.key}
          onClick={() => onSelect(it.key)}
          className={cn(
            "whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition-colors",
            active === it.key ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50",
            it.danger && "text-red-600 dark:text-red-400",
          )}
        >
          {it.label}
        </button>
      ))}
    </nav>
  );
}

export const ADMIN_SECTIONS: AdminSection[] = ["indexing", "wiki", "bu", "chat", "reset", "activity"];
```

Create `frontend-react/src/routes/admin.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAdminKey } from "@/lib/admin-auth";
import { AdminGate } from "@/components/admin/admin-gate";
import { AdminSidebar, ADMIN_SECTIONS, type AdminSection } from "@/components/admin/admin-sidebar";
import { IndexingPanel } from "@/components/admin/indexing-panel";
import { WikiSyncPanel } from "@/components/admin/wiki-sync-panel";
import { BusinessUnitsPanel } from "@/components/admin/business-units-panel";
import { ChatDebugPanel } from "@/components/admin/chat-debug-panel";
import { ResetPanel } from "@/components/admin/reset-panel";
import { ActivityPanel } from "@/components/admin/activity-panel";

export default function Admin() {
  const [unlocked, setUnlocked] = useState<boolean>(() => getAdminKey() != null);
  const [params] = useSearchParams();
  const initial = params.get("section");
  const [section, setSection] = useState<AdminSection>(
    ADMIN_SECTIONS.includes(initial as AdminSection) ? (initial as AdminSection) : "indexing",
  );

  useEffect(() => {
    const onCleared = () => setUnlocked(false);
    window.addEventListener("admin-key-cleared", onCleared);
    return () => window.removeEventListener("admin-key-cleared", onCleared);
  }, []);

  if (!unlocked) {
    return <AdminGate onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
      <AdminSidebar active={section} onSelect={setSection} />
      <main className="min-w-0 flex-1">
        {section === "indexing" && <IndexingPanel />}
        {section === "wiki" && <WikiSyncPanel />}
        {section === "bu" && <BusinessUnitsPanel />}
        {section === "chat" && <ChatDebugPanel />}
        {section === "reset" && <ResetPanel />}
        {section === "activity" && <ActivityPanel />}
      </main>
    </div>
  );
}
```

Edit `frontend-react/src/router.tsx`:

1. Add `Navigate` to the `react-router-dom` import:
```tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
```
2. Replace the line `import AdminActivity, { adminActivityLoader } from "@/routes/admin-activity";` with:
```tsx
import Admin from "@/routes/admin";
```
3. Replace the route object `{ path: "admin/activity", element: <AdminActivity />, loader: adminActivityLoader },` with these two entries:
```tsx
      { path: "admin", element: <Admin /> },
      { path: "admin/activity", element: <Navigate to="/admin?section=activity" replace /> },
```

Delete the old page:
```bash
git rm frontend-react/src/routes/admin-activity.tsx
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend-react && bun test src/components/admin/admin-gate.test.tsx && bun test src/router.test.tsx`
Expected: `admin-gate` PASS (2 tests); `router.test.tsx` still PASS (route table still valid). Then `bun run lint` — no errors.

- [ ] **Step 5: Full build + suite**

Run: `cd frontend-react && bun run build && bun test`
Expected: build succeeds; whole test suite green.

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/components/admin/admin-gate.tsx frontend-react/src/components/admin/admin-gate.test.tsx frontend-react/src/components/admin/admin-sidebar.tsx frontend-react/src/routes/admin.tsx frontend-react/src/router.tsx
git rm frontend-react/src/routes/admin-activity.tsx
git commit -m "feat(frontend): admin console shell, /admin route, /admin/activity redirect"
```

---

## Task 13: Manual end-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Start backend + frontend**

```bash
# terminal 1
cd backend && make run
# terminal 2
cd frontend-react && bun run dev
```

Ensure `frontend-react/.env` has `VITE_API_BASE=http://localhost:8080` (and `VITE_USE_REMOTE_API=true` only if pointing at the remote backend).

- [ ] **Step 2: Gate**

Visit `http://localhost:5173/admin`. Confirm the lock screen appears. Enter a wrong key → "Admin key ไม่ถูกต้อง". Enter the real `ADMIN_API_KEY` → console loads.

- [ ] **Step 3: Each section**

- Indexing: pick `carmen`, Check Status (200), Rebuild (202 → "กำลัง reindex…" then a status entry when done), Force Unlock.
- Wiki Sync: Sync now, View Audit.
- Business Units: List; provision a throwaway slug (e.g. `tmp_bu`); confirm it appears on re-List.
- Chat Debug: type a query, Route Test + Intent Test show JSON; History list returns rows.
- Reset: select "Reset RAG index — BU เดียว"; confirm **Run reset** is disabled; type `carmen`; it arms; open dialog; cancel. Switch to "Reset ประวัติแชท + activity log"; confirm token becomes `RESET-CHAT-LOGS` and the warning changes to say it does NOT touch the index. (Only actually run a reset against a disposable DB.)
- Activity Log: table renders. Visit `/admin/activity` → redirects to `/admin` on the Activity section.

- [ ] **Step 4: 401 re-lock**

In devtools, run `sessionStorage.setItem('carmen_admin_key','wrong')`, then trigger any action → it should drop back to the lock screen (401 clears the key).

- [ ] **Step 5: Commit (if any doc/notes changes)**

No code changes expected. If verification surfaces fixes, address them in their owning task and re-run that task's tests.

---

## Self-Review

**1. Spec coverage**
- Auth model (session key, lock screen, X-Admin-Key, status-probe validation) → Tasks 3, 4, 12. ✅
- New `POST /api/index/reset` → Task 1. ✅
- New `POST /api/system/reset` (narrow chat+logs via `ClearChatAndActivityTables`) → Task 2. ✅
- Sidebar sub-nav layout → Task 12 (`AdminSidebar` + `admin.tsx`). ✅
- Sections Indexing/Wiki/BU/Chat/Reset/Activity → Tasks 6, 7, 8, 9, 10, 11. ✅
- Shared OutputLog + centralized error handling (401 re-lock, envelope error surfacing) → Tasks 4, 5. ✅
- Fold `admin/activity` + redirect + remove loader → Tasks 11, 12. ✅
- Reset UX (per-scope wording, typed confirm, dialog) → Task 10. ✅
- Testing plan (admin-auth, admin-fetch, gate, reset, indexing, backend index+system) → Tasks 1, 2, 3, 4, 5, 6, 10, 12. ✅

**2. Placeholder scan:** No TBD/TODO; every code step is complete; endpoint bodies, confirm tokens, and JSON tags are copied from the codebase (`ReindexStatus.running`, chat `message`, `MessageResult.message`).

**3. Type consistency:** `adminApiJson<T>(path, init?) → {data, meta?}` used identically everywhere; `LogEntry`/`OutputLog`/`useAdminAction` signatures match across Tasks 5–11; `AdminSection` + `ADMIN_SECTIONS` defined in Task 12's sidebar and consumed by `admin.tsx`; `BusinessUnit` defined in Task 5 and reused in Tasks 6/8/10; backend `resetRequest`/`systemResetRequest` local to their handlers (no collision — different files, `resetRequest` only in `indexing_handler.go`).
