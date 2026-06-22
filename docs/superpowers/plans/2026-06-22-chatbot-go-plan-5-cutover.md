# Chatbot Go Migration — Plan 5: Rooms/Feedback + Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Implement the remaining proxied `/api/chat/*` endpoints natively (feedback + clear), add the `metrics` column needed for feedback and cost logging, remove the now-dead proxy routes, then perform the final cutover (flip flags, delete Python, remove the proxy) — the cutover gated on dev-DB/LLM validation.

**Architecture:** Small native handlers on the existing `ChatHandler`, behind `CHAT_NATIVE_FEEDBACK`. The frontend only calls `/api/chat/clear/*` and `/api/chat/feedback/*` (verified) — the `/rooms`, `/room-history`, `/history` proxy routes are vestigial and get removed. Chat history is per-request from the frontend's localStorage (no server-side room state), so native `clear` is a no-op acknowledgement. The Python service deletion is the final, separately-gated step.

**Tech Stack:** Go 1.25, Fiber v2, GORM raw SQL, the existing `ChatHistoryService` + `HashUserID` + `services.DailyBudget`.

## Global Constraints

- Go module `github.com/new-carmen/backend`; run from `backend/`.
- **Verified frontend usage:** the Next.js frontend calls ONLY `POST /api/chat/feedback/:message_id` and `DELETE /api/chat/clear/:room_id` (plus `/stream` from Plan 4). `/rooms`, `/room-history`, `/history` are NOT called.
- **Feedback SQL (verbatim from `chat_routes.py`):**
  ```sql
  UPDATE public.chat_history
  SET metrics = jsonb_set(COALESCE(metrics, '{}'), '{feedback}', to_jsonb($1::int))
  WHERE id = $2 AND bu_id = $3 AND user_id = $4
  ```
  `score ∈ {1, -1}`; `bu` is a slug; `user_id` is the HMAC-hashed username (`services.HashUserID(username, PrivacySecret)` — same hashing used at save time, so the WHERE matches the stored row).
- **Feedback request body:** `{ "score": 1|-1, "bu": "<slug>", "username": "<raw>" }`. `message_id` is the path param (the `chat_history.id`).
- Run migrations with `psql`, never `./server migrate` (repo convention).
- Native feedback gated by `config.AppConfig.ChatNative.Feedback`; when off, delegate to `Proxy`. Native `clear` can be unconditional (it's a safe no-op ack) but keep it behind the same flag for symmetry → off delegates to Proxy.
- The cutover (Task 4) MUST NOT run until: (a) `RUN_DB_TESTS=1` golden-set + intent parity pass against the dev DB/LLM, AND (b) the user explicitly approves deleting Python. It is a production-affecting step.

---

### Task 1: `metrics` column migration + optional token logging

**Files:**
- Create: `backend/migrations/0012_chat_history_metrics.sql`
- Modify: `backend/internal/services/chat_history_service.go` (add a `SaveWithMetrics` or extend `SaveWithID` to write a `metrics` JSONB)

**Interfaces:**
- Produces: a `metrics JSONB` column on `public.chat_history`; `(*ChatHistoryService).UpdateFeedback(buID uint, messageID int64, userID string, score int) error` (used by Task 2); optional `SaveWithMetrics(... , metrics map[string]any)` for token/cost logging.

- [ ] **Step 1: Write the migration**

Create `backend/migrations/0012_chat_history_metrics.sql`:

```sql
-- 0012_chat_history_metrics.sql
-- Adds the metrics JSONB column used for feedback (jsonb_set '{feedback}') and
-- for per-message token/cost logging. Idempotent.
ALTER TABLE public.chat_history
  ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}'::jsonb;
```

- [ ] **Step 2: Add `UpdateFeedback` to the history service (TDD)**

Write a test in `chat_history_service_test.go` (DB-gated, skip when `RUN_DB_TESTS != "1"`) that inserts a row, calls `UpdateFeedback`, and reads back `metrics->>'feedback'`. Then implement:

```go
// UpdateFeedback sets metrics.feedback for one message owned by (buID, userID).
func (s *ChatHistoryService) UpdateFeedback(buID uint, messageID int64, userID string, score int) error {
	const q = `UPDATE public.chat_history
SET metrics = jsonb_set(COALESCE(metrics, '{}'), '{feedback}', to_jsonb(?::int))
WHERE id = ? AND bu_id = ? AND user_id = ?`
	res := database.DB.Exec(q, score, messageID, buID, userID)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return fmt.Errorf("no chat_history row for id=%d bu=%d user matched", messageID, buID)
	}
	return nil
}
```

- [ ] **Step 3: Run migration locally / verify build** — `go build ./...`; the DB test skips offline.

- [ ] **Step 4: Commit** `feat(chat): add chat_history.metrics column + UpdateFeedback`.

---

### Task 2: Native feedback endpoint

**Files:**
- Modify: `backend/internal/api/chat_handler.go` (add `Feedback` handler)
- Modify: `backend/internal/router/chat_routes.go` (route `/api/chat/feedback/:message_id` → `chatHandler.Feedback`)
- Create: `backend/internal/api/chat_feedback_test.go`

**Interfaces:**
- Consumes: `ChatHistoryService.UpdateFeedback` + `GetBUIDFromSlug` (existing) + `services.HashUserID`, `config.AppConfig`.
- Produces: `(h *ChatHandler) Feedback(c *fiber.Ctx) error` — flag-gated (off → `Proxy`); parses `message_id` path param (int64) + body `{score,bu,username}`; validates `score ∈ {1,-1}`; resolves `buID` from slug; `userID := services.HashUserID(username, config.AppConfig.Server.PrivacySecret)`; calls `UpdateFeedback`; returns `{"status":"ok"}` or 4xx/5xx.

- [ ] **Step 1: Write failing tests** (no DB needed for the validation paths): flag-off → delegates to Proxy (502 w/o chatbot URL); invalid score (e.g. 5) → 400; non-int message_id → 400. (The success path is DB-gated; assert it via the service test in Task 1.)

- [ ] **Step 2: Implement** the handler:

```go
func (h *ChatHandler) Feedback(c *fiber.Ctx) error {
	if config.AppConfig == nil || !config.AppConfig.ChatNative.Feedback {
		return h.Proxy(c)
	}
	messageID, err := strconv.ParseInt(c.Params("message_id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid message_id"})
	}
	var body struct {
		Score    int    `json:"score"`
		BU       string `json:"bu"`
		Username string `json:"username"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if body.Score != 1 && body.Score != -1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "score must be 1 or -1"})
	}
	buID, err := h.historyService.GetBUIDFromSlug(strings.TrimSpace(body.BU))
	if err != nil || buID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unknown bu"})
	}
	userID := services.HashUserID(body.Username, config.AppConfig.Server.PrivacySecret)
	if err := h.historyService.UpdateFeedback(buID, messageID, userID, body.Score); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "feedback target not found"})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}
```

Add `"strconv"` import. Register the route (replace the Proxy line for feedback).

- [ ] **Step 3: Run tests + build** — `go test ./internal/api/ -run Feedback -v`, `go build ./...`, `go test ./...`.

- [ ] **Step 4: Commit** `feat(chat): add native feedback endpoint behind CHAT_NATIVE_FEEDBACK`.

---

### Task 3: Native clear endpoint + remove dead proxy routes

**Files:**
- Modify: `backend/internal/api/chat_handler.go` (add `ClearRoom` handler)
- Modify: `backend/internal/router/chat_routes.go` (route `clear` → native; REMOVE `/rooms/:bu/:username`, `POST /rooms`, `DELETE /rooms/:room_id`, `/room-history/:room_id`, `DELETE /history` proxy routes)
- Create: `backend/internal/api/chat_clear_test.go`

**Interfaces:**
- Produces: `(h *ChatHandler) ClearRoom(c *fiber.Ctx) error` — chat history is per-request (frontend-owned localStorage); there is no server-side room state to clear, so this returns `{"status":"ok","room_id":<param>}`. Flag-gated like feedback (off → Proxy) so behavior is identical to Python until cutover.

- [ ] **Step 1: Write failing test** — flag-on → `DELETE /api/chat/clear/r1` returns 200 `{"status":"ok","room_id":"r1"}`; flag-off → Proxy (502 w/o chatbot URL).
- [ ] **Step 2: Implement** `ClearRoom` (gated on `ChatNative.Feedback` or a dedicated flag — reuse `Feedback` flag for simplicity, or add `ChatNative.Rooms`; the plan reuses `ChatNative.Feedback` to avoid a new flag). Register the route.
- [ ] **Step 3: Remove the vestigial proxy routes** (`/rooms*`, `/room-history/*`, `DELETE /history`) from `chat_routes.go` — the frontend never calls them; once Python is gone they would be dead 502s.
- [ ] **Step 4: Run tests + build** — `go test ./internal/api/ -run Clear -v`, `go build ./...`, `go test ./...`.
- [ ] **Step 5: Commit** `feat(chat): native clear endpoint + remove vestigial proxy routes`.

---

### Task 4: Cutover — flip flags, delete Python, remove proxy (GATED)

> **DO NOT execute this task until:** (a) `RUN_DB_TESTS=1` golden-set retrieval + intent parity pass against the dev DB/LLM, AND (b) the user explicitly approves deleting the Python service. This is production-affecting and irreversible-ish (Python is recoverable from git, but the running deployment changes).

**Files:**
- Modify: `backend/internal/api/chat_handler.go` — remove `Proxy` + the `Image` proxy fallback if unused; remove `embedLLM`/etc only if dead.
- Modify: `backend/internal/router/chat_routes.go` — all `/api/chat/*` native; no Proxy.
- Modify: `backend/internal/config/config.go` — remove `Server.ChatbotURL` (`PYTHON_CHATBOT_URL`); default `ChatNative.{Stream,Feedback}` to `true`.
- Delete: `carmen-chatbot/` (entire directory).
- Modify: `docker-compose.yml`, `.env*`, `CLAUDE.md`, `.github/workflows/*` — remove the Python chatbot service, its env, and references.

- [ ] **Step 1:** With native validated, flip `CHAT_NATIVE_STREAM=true` + `CHAT_NATIVE_FEEDBACK=true` in the deploy env; soak; confirm the frontend chat + feedback work end-to-end.
- [ ] **Step 2:** Change the Go defaults to native-on; remove `Proxy`, `ChatbotURL`/`PYTHON_CHATBOT_URL`, and the proxy import.
- [ ] **Step 3:** `git rm -r carmen-chatbot/`; update `docker-compose.yml` (drop the chatbot service), `.env*`, `.github/workflows/auto-provision-sync-reindex.yml` (if it references the chatbot), and `CLAUDE.md` (architecture section: now two services — Go backend + Next.js frontend).
- [ ] **Step 4:** Full regression — `go build ./...`, `go test ./...`, `docker compose up --build` smoke, manual frontend chat + feedback. Commit `feat(chat): complete cutover — remove Python chatbot + proxy`.

---

## Self-Review

**Spec coverage:** native feedback (the one DB-backed proxied endpoint the frontend uses) → Task 2; native clear (the other frontend-used endpoint) → Task 3; `metrics` column (blocks feedback) + cost-logging hook (#6 carryover) → Task 1; removal of vestigial routes → Task 3; flag flips + Python deletion + docs → Task 4 (gated).

**Placeholder scan:** No TBD/TODO. Task 4 is intentionally gated with explicit preconditions, not a placeholder.

**Type consistency:** `UpdateFeedback(buID uint, messageID int64, userID string, score int)`, `Feedback`/`ClearRoom` handlers, `HashUserID`, `GetBUIDFromSlug`, `config.AppConfig.ChatNative.Feedback` consistent across tasks. Feedback SQL matches `chat_routes.py` verbatim.

**Carryovers addressed:** #6 (token columns) → Task 1 metrics column + optional SaveWithMetrics; #5 (zero-results apology wording) → fold into Task 4 product sign-off, or adjust `noInfoApology` to reuse the `out_of_scope` canned text from `intents.yaml` when the product confirms.

**Known executor checks:** confirm the live `chat_history` already lacks `metrics` (migration is `IF NOT EXISTS`, safe either way); confirm `HashUserID`'s default-secret fallback matches what Plan-4 save used so the feedback WHERE matches stored rows; verify no other caller depends on the removed proxy routes before deleting them.
```

