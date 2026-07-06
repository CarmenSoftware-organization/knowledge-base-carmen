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
| Reset | **Two** separate new endpoints — `POST /api/index/reset` (RAG index) and `POST /api/system/reset` (operational tables) | The two operations truncate different tables with different consequences: index reset ⇒ you **must reindex** afterwards; system reset ⇒ **wipes logs + chat history**. Keeping them separate makes each endpoint's blast radius explicit, and lets `/index/reset` live next to the other `/api/index/*` routes. |
| Activity | Fold existing `admin/activity` into the console as a read-only section | Consolidates all admin surfaces in one place. |

## 3. Backend change — two separate reset endpoints

The **only** Go changes. Each wraps existing DB functions that today are
reachable only via the CLI (`cmd/server/main.go` `reset …`). They are kept
**separate** because they truncate different tables with different consequences.
Both are guarded by `middleware.RequireAdminKey` and require a matching
`confirm` in the body (rejected with **400** on mismatch, mirroring the existing
response-envelope `Fail` pattern).

### 3.1 `POST /api/index/reset` — RAG index data

Lives next to the other `/api/index/*` routes; truncates
`documents` / `document_chunks`. **After running it you must reindex.**

```
POST /api/index/reset?bu=<slug>|all       (middleware.RequireAdminKey)
Content-Type: application/json
{ "confirm": "<must match>" }
```

| bu | action | `confirm` must equal |
|---|---|---|
| `<slug>` | `database.TruncateBUTables(slug)` | the `<slug>` |
| `all` | `database.TruncateAllBUIndexTables()` | `ALL` |

- `slug` validated with `security.ValidateSchema` (same as CLI); invalid slug or
  missing `bu` → 400 `CodeInvalidSlug`.
- Success → `response.OK` with `{ bu, message }` (e.g. `"index reset for carmen;
  run reindex to rebuild"`).

### 3.2 `POST /api/system/reset` — chat history + activity logs

Truncates **only** the two operational tables `chat_history` and
`activity_logs`. **Wipes chat history and activity logs for all BUs** (nothing
else). It does **not** touch `documents` / `document_chunks` / `business_units` /
`faq_*`.

> **Safety correction (from codebase review):** the existing
> `database.ClearPublicTables()` — the CLI's `reset all` — truncates **every**
> table in the `public` schema (documents, chunks, business_units, faq, chat,
> logs — a full factory wipe), which does **not** match "reset chat history".
> So this endpoint uses a **new, narrow** `database.ClearChatAndActivityTables()`
> instead. `ClearPublicTables()` is deliberately **not** exposed over HTTP in v1
> (stays CLI-only) to avoid a mislabelled nuke button.

```
POST /api/system/reset                    (middleware.RequireAdminKey)
Content-Type: application/json
{ "confirm": "RESET-CHAT-LOGS" }
```

- `confirm` must equal `RESET-CHAT-LOGS`, else 400 `CodeInvalidBody`.
- Success → `response.OK` with `{ message }` e.g. `"chat history + activity logs
  cleared"`.
- New DB function `database.ClearChatAndActivityTables()`:
  `TRUNCATE TABLE public.chat_history, public.activity_logs RESTART IDENTITY`.

The `confirm` gate is defence-in-depth against a mis-fired request; the frontend
also gates with a typed-confirmation field (§4.5).

### 3.3 Wiring & files

- **Index reset:** add a `Reset` method to the existing `IndexingHandler`
  (`backend/internal/api/indexing_handler.go`); register in
  `indexing_routes.go`:
  `app.Post("/api/index/reset", middleware.RequireAdminKey, indexingHandler.Reset)`.
- **System reset:** new `SystemHandler.Reset` in
  `backend/internal/api/system_handler.go` + `RegisterSystem(app)` in a new
  `backend/internal/router/system_routes.go` (called from `SetupRoutes`), or
  attach to an existing system handler if one already fits — decided at
  implementation time.

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
| **Reset** | scope radio: **Reset RAG index (this BU)** / **Reset RAG index (ALL BUs)** / **Reset chat history + activity logs** · BU dropdown (index-BU only) · per-scope warning copy + **typed confirmation** field · red **Run reset** button → `POST /api/index/reset?bu=` for the two index scopes, `POST /api/system/reset` for chat+logs (§3). Each scope shows exactly what it wipes and (for index) that a reindex is required next. |
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
  fires the right endpoint for the selected scope (`POST /api/index/reset?bu=` or
  `POST /api/system/reset`) with the right body when it does.
- One representative panel (Indexing) wires a button to the right URL with a
  mocked response landing in OutputLog.

Backend (Go — index reset covered in `indexing_handler_test.go`, system reset in
`system_handler_test.go`, both following `bu_handler_test.go`):

- 401 without `X-Admin-Key` (both endpoints).
- 400 on `confirm` mismatch (both) and on invalid/missing `bu` slug (index reset).
- DB-gated (`RUN_DB_TESTS=1`): `/index/reset?bu=<slug>` deletes seeded index rows
  for that BU; `/system/reset` clears seeded activity/chat rows.

## 7. Security considerations

- Key is **session-scoped** in the browser, never persisted to `localStorage` or
  the bundle; cleared on tab close, on explicit lock, and on any 401.
- No new **unauthenticated** surface: every new/used write endpoint keeps
  `RequireAdminKey`. Both new reset endpoints (`/api/index/reset`,
  `/api/system/reset`) are guarded identically.
- Both reset endpoints have a **double gate**: server-side `confirm` string + the
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

None — auth model, scope, layout, the two separate reset endpoints
(`/api/index/reset` + `/api/system/reset`), and folding `admin/activity` are all
resolved.
