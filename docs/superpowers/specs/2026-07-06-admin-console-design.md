# Design: Admin Console (frontend-react `/admin`)

**Date:** 2026-07-06
**Status:** Approved (pending spec review)
**Route:** `/admin`
**Target frontend:** `frontend-react` (Vite + React Router 7) — the active/deployed
frontend, **not** `frontend-next`.

## 1. Goal

A single admin console page at `/admin` that lets an internal operator run the
backend's admin-guarded maintenance operations from the browser instead of
`curl`/CLI. It surfaces the existing `X-Admin-Key`-guarded endpoints
(indexing, wiki sync, BU provision/deprovision, chat debug), adds a new
**reset** endpoint (the only new backend work), and folds the existing
read-only `admin/activity` page in as a section.

**In scope (v1):** Indexing, Wiki Sync, Business Units, Chat Debug, Reset,
Activity Log (read-only).

**Non-goals (YAGNI):** no multi-user accounts / roles, no server-side session,
no audit-logging of who clicked what beyond what the backend already records,
no cron/scheduling UI, no editing of tuning YAML from the browser.

## 2. Key decisions (from brainstorming)

| # | Decision | Rationale |
|---|---|---|
| Auth | Operator types the admin key into a lock screen; stored in `sessionStorage` and sent as `X-Admin-Key` on every request | `frontend-react` is a static SPA on Vercel — a secret cannot be safely baked into the bundle. Session-scoped key = no backend/CORS change, key gone when the tab closes. Acceptable for a single trusted internal operator. |
| Layout | Left **sidebar sub-nav**, right = active panel + shared output log | Chosen from mockups; scales to 6 sections and to operations that emit output. |
| Reset | **One** new endpoint `POST /api/admin/reset` with a `scope` discriminator | The three CLI reset variants target different tables but are all "destructive truncate"; one endpoint = one handler, one test, one confirm-guard, and matches the CLI's single `reset` verb. |
| Activity | Fold existing `admin/activity` into the console as a read-only section | Consolidates all admin surfaces in one place. |

## 3. Backend change — new `POST /api/admin/reset`

The **only** Go change. Wraps three existing DB functions
(`database.TruncateBUTables`, `database.TruncateAllBUIndexTables`,
`database.ClearPublicTables`) that today are reachable only via the CLI
(`cmd/server/main.go` `reset …`).

### 3.1 Contract

```
POST /api/admin/reset            (middleware.RequireAdminKey)
Content-Type: application/json

{ "scope": "index" | "public",
  "bu":    "<slug>" | "all",     // required when scope=index; ignored for public
  "confirm": "<must match>" }
```

Dispatch + required `confirm` value (rejected with **400** on mismatch,
mirroring the existing response-envelope `Fail` pattern):

| scope | bu | action | `confirm` must equal |
|---|---|---|---|
| `index` | `<slug>` | `TruncateBUTables(slug)` | the `<slug>` |
| `index` | `all` | `TruncateAllBUIndexTables()` | `ALL` |
| `public` | — | `ClearPublicTables()` | `RESET-PUBLIC` |

- `slug` is validated with `security.ValidateSchema` (same as CLI); invalid slug
  → 400 `CodeInvalidSlug`.
- Unknown `scope` → 400 `CodeInvalidBody`.
- Success → `response.OK` with `{ scope, bu, message }` (e.g. `"index reset for
  carmen; run reindex to rebuild"`).
- The `confirm` gate is defence-in-depth against a mis-fired request; the
  frontend also gates with a typed-confirmation field (§4.5).

### 3.2 Wiring & files

- New handler method on a small `AdminHandler` in
  `backend/internal/api/admin_handler.go` (or add to an existing handler if a
  natural home exists — decided at implementation time; default: new file).
- New `backend/internal/router/admin_routes.go` with
  `RegisterAdmin(app)` → `app.Post("/api/admin/reset", middleware.RequireAdminKey, h.Reset)`,
  called from `SetupRoutes` in `routes.go`.
- Test `backend/internal/api/admin_handler_test.go` following the
  `bu_handler_test.go` pattern: assert 401 without key, 400 on bad
  `confirm`/`scope`, and (DB-gated, `RUN_DB_TESTS=1`) that a seeded row is gone
  after a valid `scope=index` reset.

## 4. Frontend design (`frontend-react`)

### 4.1 New files

```
src/lib/admin-auth.ts        # get/set/clear key in sessionStorage
src/lib/admin-fetch.ts       # adminFetch() — inject X-Admin-Key, handle 401
src/routes/admin.tsx         # <Admin> page: gate + sidebar + panels
src/components/admin/        # AdminGate, AdminSidebar, OutputLog, and one file per section panel
```

Router: add `{ path: "admin", element: <Admin /> }` to `router.tsx`. **No
loader** — loaders would fire admin requests before a key exists; all data is
fetched inside the gated component instead.

### 4.2 `admin-auth.ts`

- `getAdminKey(): string | null`, `setAdminKey(k)`, `clearAdminKey()` over
  `sessionStorage["carmen_admin_key"]`.
- A tiny event/callback so `adminFetch` can signal "key rejected → re-lock" and
  the page re-renders the lock screen (e.g. a `window` event or a small
  subscribe function; React state lives in `<Admin>`).

### 4.3 `admin-fetch.ts`

- `adminFetch(path, opts)` builds `${API_BASE}${path}`, adds
  `X-Admin-Key: getAdminKey()` + `Content-Type: application/json`, delegates to
  the existing `fetch-utils` where practical for envelope parsing.
- On **401**: `clearAdminKey()` + emit the re-lock signal, then throw a typed
  error so panels show "session expired".
- On other non-2xx: throw with `{ status, code, message }` extracted from the
  response envelope for the OutputLog.

### 4.4 `<AdminGate>` (lock screen)

- If `getAdminKey()` is null → render a centered card: password input +
  "Unlock" button.
- On submit: temporarily set the key, **validate** with
  `GET /api/index/rebuild/status?bu=carmen` (an admin-guarded, read-only,
  side-effect-free GET). 200 → keep key, enter console. 401 → `clearAdminKey()`,
  show "invalid admin key". Network error → show a friendly message, don't store.
- A "Lock / sign out" control in the header calls `clearAdminKey()`.

### 4.5 Sections (sidebar → panel), shared OutputLog

Every panel renders its result into a shared **OutputLog** component (status +
pretty-printed JSON + timestamp). `DEFAULT_BU = "carmen"`; BU dropdown is
populated from `GET /api/business-units`.

| Section | Controls → endpoint |
|---|---|
| **Indexing** | BU dropdown · **Rebuild** `POST /api/index/rebuild?bu=` (202 → poll `GET /api/index/rebuild/status?bu=` every ~3s until not running) · **Status** (manual) · **Force Unlock** `POST /api/index/rebuild/unlock?bu=` · **Rebuild One** (`path` input) `POST /api/index/rebuild/one?bu=&path=` |
| **Wiki Sync** | **Sync now** `POST /api/wiki/sync` · **View Audit** `GET /api/wiki/sync/audit` |
| **Business Units** | List `GET /api/business-units` · **Provision** form (`slug` / `name` / `description`) `POST /api/business-units/provision` · **Deprovision** (BU select + typed-confirm) `POST /api/business-units/deprovision` — destructive, needs confirm dialog |
| **Chat Debug** | query input · **Route Test** `POST /api/chat/route-test` · **Intent Test** `POST /api/chat/intent-test` · **History** `GET /api/chat/history/list` |
| **Reset** | scope radio (Index BU / Index All / Public) · BU dropdown (when Index BU) · **typed confirmation** field · red **Run reset** button → `POST /api/admin/reset` (§3) |
| **Activity Log** | read-only table, moved from `admin/activity`: `GET /api/activity/list?bu=carmen&limit=50&offset=0&source=all` |

Destructive actions (Deprovision, Reset) require the operator to type the exact
confirmation string into a field before the button enables — matching the
backend `confirm` gate.

### 4.6 Migrating `admin/activity`

- Move the table markup into `components/admin/ActivityPanel.tsx`; fetch inside
  the component via `adminFetch`/`apiJson` (no loader).
- Keep the `/admin/activity` route as a thin redirect to `/admin` (Activity
  section) so existing links/bookmarks don't 404. Remove `adminActivityLoader`.

## 5. Error handling

- **401** anywhere → clear key, drop back to the lock screen with "session
  expired, re-enter admin key". Centralized in `adminFetch`.
- **4xx/5xx** with envelope → show `status` + `code` + `message` in OutputLog.
- **Network / CORS failure** → friendly "cannot reach backend at `API_BASE`".
- Long-running **Rebuild** (background 202): panel shows a "running…" state
  driven by status polling, with elapsed seconds from the status response, and a
  stop-polling on unmount.

## 6. Testing plan

Frontend (Jest + RTL, matching existing `*.test.tsx`):

- `admin-auth` get/set/clear round-trips `sessionStorage`.
- `adminFetch` injects `X-Admin-Key`; on 401 clears the key and throws the
  re-lock error (mock `fetch`).
- `<AdminGate>`: locked with no key; unlock success (mock 200 status) enters
  console; unlock failure (mock 401) shows error and stays locked.
- Reset panel: **Run reset** stays disabled until the typed confirmation matches;
  fires `POST /api/admin/reset` with the right body when it does.
- One representative panel (Indexing) wires a button to the right URL with a
  mocked response landing in OutputLog.

Backend (Go, `admin_handler_test.go`):

- 401 without `X-Admin-Key`.
- 400 on unknown `scope` and on `confirm` mismatch.
- DB-gated (`RUN_DB_TESTS=1`) happy path deletes seeded index rows for a BU.

## 7. Security considerations

- Key is **session-scoped** in the browser, never persisted to `localStorage` or
  the bundle; cleared on tab close, on explicit lock, and on any 401.
- No new **unauthenticated** surface: every new/used write endpoint keeps
  `RequireAdminKey`. The new `/api/admin/reset` is guarded identically.
- The reset endpoint has a **double gate**: server-side `confirm` string + the
  frontend typed-confirmation field, so a stray click or replayed request can't
  truncate tables.
- `GET /api/index/rebuild/status` is used only as a harmless key-probe; it has no
  side effects.
- The console is reachable only by direct URL + a cross-link from the (already
  admin-oriented) area; it is not advertised in the public sidebar. This is
  obscurity, **not** the security boundary — the boundary is the admin key.

## 8. Out of scope / future

- Multi-user auth, roles, and real login sessions.
- Rate-limiting / IP allow-listing the admin endpoints (backend concern).
- A "reindex all BUs" convenience button (loop client-side over the BU list if
  ever needed).
- Editing tuning/intents/prompts YAML from the browser.

## 9. Open questions

None — auth model, scope, layout, the single merged reset endpoint, and folding
`admin/activity` are all resolved.
