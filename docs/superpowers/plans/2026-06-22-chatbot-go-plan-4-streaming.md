# Chatbot Go Migration — Plan 4: Streaming Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Implement native NDJSON streaming for `POST /api/chat/stream` (the endpoint the frontend uses), orchestrating intent → rewrite/translate → hybrid retrieval → LLM streaming with the exact event sequence of the Python `chat_service.py`, behind a `CHAT_NATIVE_STREAM` flag (default proxy).

**Architecture:** A `chat_stream_flow.go` orchestrator consumes the already-built Plan 1–3 services (`IntentRouterService.Classify`, `RetrievalService.Retrieve`, `openrouter.StreamAnswer`) plus new pure helpers (NDJSON writer, prompt assembly, suggestions extraction, rewrite/translate). Fiber streams via `c.SendStreamWriter`. The `Stream` handler dispatches native vs the existing `Proxy` by feature flag. Pure pieces are unit-tested; the LLM/DB-dependent flow is exercised with injected fakes + a gated integration check.

**Tech Stack:** Go 1.25, Fiber `SendStreamWriter`, the Plan 1–3 `services`/`openrouter`/`chatconfig`/`utils` packages.

## Global Constraints

- Go module `github.com/new-carmen/backend`; run from `backend/`.
- **NDJSON line format:** each event is `{"type":"<t>","data":<d>} + "\n"` (compact JSON, one per line). Mirrors Python `_format_stream_event`.
- **Event sequence (full RAG path), verbatim from `chat_service.py`:**
  1. (only if `haveHistory`) `status` = locale `status_analyzing`
  2. `status` = locale `status_searching`
  3. `sources` = `[]ChatSource`-shaped debug list (after retrieval, before compose)
  4. `status` = locale `status_composing`
  5. `chunk`* = streamed answer text (the `[SUGGESTIONS]` tag and everything after it are withheld from chunks)
  6. (if suggestions parsed) `suggestions` = `[]string`
  7. (if truncated: finish_reason `length`/`max_tokens`) `chunk` = `TRUNCATION_NOTICE[lang]`
  8. `done` = `<log_id>` string
- **Quick-reply path:** when `intent ∈ {greeting, thanks, out_of_scope, company_info, capabilities}` → `chunk`(canned) → `done`(log_id). No retrieval/LLM.
- **Zero-results path:** retrieval returns no chunks → `chunk`(out_of_scope canned for lang) → `done`(log_id).
- **Budget gate:** before processing, `budget.CheckAndIncrement(DailyRequestLimit)`; if over → `chunk`(apology) + `done`(0). `DailyRequestLimit=0` disables the cap.
- **PII / privacy on logging:** the logged user query is `utils.MaskPII(message)`; the username is `services.HashUserID(username, PrivacySecret)` (already exists). Never log raw PII.
- **Rewrite/translate:** if `haveHistory` → rewrite the query via LLM (history-aware); then if the (rewritten) query is non-Thai (`utils.ThaiRatio < 0.15`) → translate to Thai. Search uses the rewritten/translated query; the LLM answer uses the original message.
- **Prompt assembly (verbatim `build_messages`):** system = `BasePrompt` split on `"data_input:"` (take `[0]`, trimmed), with `"the designated preface phrase"` → `'<locale.preface>'` and `"the requested language"` → `LANG_NAMES[lang]`, then `"\n\nIMPORTANT: " + locale.instruction`. Human message = `"คู่มือ:\n<context>{context}</context>\n\nChat History:\n<chat_history>{history}</chat_history>\n\nQuestion: <user_input>{sanitized_message}</user_input>\n\nAnswer:"`. Locale strings (status/preface/instruction/notices) are verbatim from `prompt_builder.py` LOCALES.
- **Suggestions extraction (verbatim regex):** `\[SUGGESTIONS\]\s*(\{.*\}|\[.*\])` with DOTALL; parse the JSON array/object → `[]string` of question texts; the answer text shown to the user excludes the tag and everything after it.
- `ChatRequest`: `text`(1–2000), `bu`(slug), `username`, `room_id`, `model?`, `history?[]{sender,message}`, `db_schema?`(default "carmen"), `lang?`("th"/"en", default "th"), `referrer_page?`.
- Native streaming is gated by `config.AppConfig.ChatNative.Stream` (Plan 1). When false, `Stream` delegates to the existing `Proxy`.
- LLM/embedding/DB tests skip without `RUN_DB_TESTS=1`; pure/orchestration tests use injected fakes and never hit the network.

## Locale strings (verbatim — used by Task 2)

```
th: status_analyzing="กำลังวิเคราะห์คำถาม..."  status_searching="กำลังค้นหาและคัดกรองข้อมูล..."  status_composing="กำลังเรียบเรียงคำตอบ..."
    preface="จากข้อมูลในคู่มือ"
    instruction="Always respond in Thai language using natural, conversational Thai — as if you're a helpful colleague talking to someone, not reading from a manual. Use polite particles (ค่ะ/ครับ/นะคะ) naturally where they fit, not mechanically at the end of every sentence. Vary your sentence structure and word choices. This includes the [SUGGESTIONS] section — all 3 suggested questions MUST be written in Thai only. Never use Chinese or any other language."
en: status_analyzing="Analyzing your question..."  status_searching="Searching and filtering data..."  status_composing="Composing response..."
    preface="Based on the manual"
    instruction="Always respond in English using natural, conversational language — warm and helpful, like a knowledgeable colleague, not a formal document. Vary your sentence structure and avoid stiff phrasing. If the provided manual (คู่มือ) is in Thai, translate the relevant information into natural, flowing English. Do NOT quote Thai text directly. This includes the [SUGGESTIONS] section — all 3 suggested questions MUST be written in English only."
TRUNCATION_NOTICE th="\n\n_(คำตอบนี้ยาวเกินกว่าที่ระบบจะแสดงได้ในครั้งเดียว หากต้องการข้อมูลเพิ่มเติม ลองถามแยกเป็นหัวข้อย่อย ๆ ได้เลยครับ)_"  en="\n\n_(The response was too long to complete in one reply. Try asking about a specific part of the topic instead.)_"
EMPTY_RESPONSE_NOTICE th="_(AI ไม่สามารถสร้างคำตอบได้ ขีดจำกัด token อาจน้อยเกินไปสำหรับคำถามนี้)_"  en="_(The AI could not generate a response. The token limit may be too small for this question.)_"
LANG_NAMES={th:"Thai", en:"English"}
```

---

### Task 1: NDJSON event writer + ChatRequest parsing (pure)

**Files:**
- Create: `backend/internal/api/chat_stream_event.go`
- Create: `backend/internal/api/chat_stream_event_test.go`

**Interfaces:**
- Produces:
  - `api.streamEvent(eventType string, data any) string` — returns `string(json.Marshal({"type":eventType,"data":data})) + "\n"`.
  - `api.StreamChatRequest` struct (json tags: `text`,`bu`,`username`,`room_id`,`model`,`history`,`db_schema`,`lang`,`referrer_page`) with `History []StreamHistoryItem{Sender,Message string}`.
  - `api.parseStreamRequest(c *fiber.Ctx) (StreamChatRequest, error)` — BodyParser + validation: `text` length 1–2000, `bu` non-empty; defaults `db_schema`="carmen", `lang`="th".

- [ ] **Step 1: Write the failing test**

```go
package api

import (
	"strings"
	"testing"
)

func TestStreamEvent(t *testing.T) {
	got := streamEvent("chunk", "สวัสดี")
	if !strings.HasSuffix(got, "\n") {
		t.Fatal("must end with newline")
	}
	want := `{"type":"chunk","data":"สวัสดี"}` + "\n"
	if got != want {
		t.Errorf("streamEvent = %q, want %q", got, want)
	}
	arr := streamEvent("suggestions", []string{"a", "b"})
	if arr != `{"type":"suggestions","data":["a","b"]}`+"\n" {
		t.Errorf("array event = %q", arr)
	}
}
```

- [ ] **Step 2: Run → fail.** `cd backend && go test ./internal/api/ -run StreamEvent -v` → FAIL (undefined).

- [ ] **Step 3: Implement** `chat_stream_event.go`:

```go
package api

import "encoding/json"

type StreamHistoryItem struct {
	Sender  string `json:"sender"`
	Message string `json:"message"`
}

type StreamChatRequest struct {
	Text         string              `json:"text"`
	BU           string              `json:"bu"`
	Username     string              `json:"username"`
	RoomID       string              `json:"room_id"`
	Model        string              `json:"model"`
	History      []StreamHistoryItem `json:"history"`
	DBSchema     string              `json:"db_schema"`
	Lang         string              `json:"lang"`
	ReferrerPage string              `json:"referrer_page"`
}

// streamEvent encodes one NDJSON stream line (compact JSON + newline).
func streamEvent(eventType string, data any) string {
	b, err := json.Marshal(map[string]any{"type": eventType, "data": data})
	if err != nil {
		// data is always a string or []string in this codebase; fall back safely.
		b, _ = json.Marshal(map[string]any{"type": eventType, "data": ""})
	}
	return string(b) + "\n"
}
```

Add `parseStreamRequest` (in the same file):

```go
import "strings"
import "github.com/gofiber/fiber/v2"
import "fmt"

func parseStreamRequest(c *fiber.Ctx) (StreamChatRequest, error) {
	var req StreamChatRequest
	if err := c.BodyParser(&req); err != nil {
		return req, fmt.Errorf("invalid request body")
	}
	req.Text = strings.TrimSpace(req.Text)
	if n := len([]rune(req.Text)); n < 1 || n > 2000 {
		return req, fmt.Errorf("text must be 1–2000 chars")
	}
	if strings.TrimSpace(req.BU) == "" {
		return req, fmt.Errorf("bu is required")
	}
	if req.DBSchema == "" {
		req.DBSchema = "carmen"
	}
	if req.Lang != "en" {
		req.Lang = "th"
	}
	return req, nil
}
```

> Split the imports correctly into one block; the two snippets above are shown separately only for clarity.

- [ ] **Step 4: Run → pass.** Add a `parseStreamRequest` test using `fiber.New()` + `app.Test` posting JSON (valid → ok; empty text → error; >2000 → error; default db_schema/lang). Run `go test ./internal/api/ -run 'StreamEvent|ParseStreamRequest' -v`.

- [ ] **Step 5: Commit** `feat(chat): add NDJSON stream event writer + request parsing`.

---

### Task 2: Prompt service — message assembly, suggestions, notices (pure)

**Files:**
- Create: `backend/internal/services/prompt_service.go`
- Create: `backend/internal/services/prompt_service_test.go`

**Interfaces:**
- Consumes: `chatconfig.Prompts` (Plan 1, `LoadPrompts`), `utils.SanitizeForPrompt` (Plan 3).
- Produces:
  - `services.Locale` struct + `services.GetLocale(lang string) Locale` (verbatim strings above; default th).
  - `services.SystemMessage(basePrompt, lang string) string` and `services.HumanMessage(context, history, message string) string` (verbatim assembly; SystemMessage splits basePrompt on `"data_input:"`, takes `[0]` trimmed, substitutes preface + lang, appends instruction).
  - `services.BuildChatMessages(prompts chatconfig.Prompts, lang, context, history, message string) []openrouter.ChatMessage` — returns the 2-message system+human list (sanitizing the message).
  - `services.ExtractSuggestions(full string) (clean string, suggestions []string)` — applies the verbatim regex; `clean` is `full` with the tag+remainder removed and trimmed; `suggestions` parsed from the JSON.
  - Exported `services.TruncationNotice(lang) string`, `services.EmptyResponseNotice(lang) string`.

- [ ] **Step 1: Write failing tests** covering: GetLocale th/en/default; SystemMessage substitutes preface+lang+instruction and drops the `data_input:` tail; HumanMessage exact format; BuildChatMessages length 2 + roles system/user; ExtractSuggestions with `"answer text [SUGGESTIONS] [\"q1\",\"q2\",\"q3\"]"` → clean=="answer text", suggestions==[q1,q2,q3]; ExtractSuggestions with no tag → clean==full, nil.

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement** `prompt_service.go` with the verbatim locale map and assembly. ExtractSuggestions uses `regexp.MustCompile(`(?s)\[SUGGESTIONS\]\s*(\{.*\}|\[.*\])`)`; on match, `clean = strings.TrimSpace(full[:loc[0]])`; parse `full[grp...]` — try `json.Unmarshal` into `[]string`; if that fails, into `[]map[string]any` and pull `question`/`title`/`text`; if both fail, suggestions=nil. (Mirror Python `_normalize_sugg` leniency.)

- [ ] **Step 4: Run → pass.** `go test ./internal/services/ -run 'Locale|SystemMessage|HumanMessage|BuildChatMessages|ExtractSuggestions|Notice' -v`.

- [ ] **Step 5: Commit** `feat(chat): add prompt assembly + suggestions extraction service`.

---

### Task 3: Rewrite / translate service (LLM-injected)

**Files:**
- Create: `backend/internal/services/query_rewrite_service.go`
- Create: `backend/internal/services/query_rewrite_service_test.go`

**Interfaces:**
- Consumes: `chatconfig.Prompts` (`RewritePrompt`, `TranslatePrompt`), `utils.ThaiRatio` (Plan 1).
- Produces:
  - `services.QueryRewriteService` with injected `rewriteLLM func(prompt string)(string,int,int,error)` and `translateLLM func(prompt string)(string,int,int,error)` and the two prompt templates.
  - `(s *QueryRewriteService) BuildSearchQuery(message, historyText string, haveHistory bool) (query string, wasRewritten bool, inTok, outTok int)` — if `haveHistory`: rewrite (template `RewritePrompt` with `{message}`/`{history}` substitutions per Python) → `wasRewritten = result != message`; then if `utils.ThaiRatio(query) < 0.15` (non-Thai): translate (`TranslatePrompt` with `{query}`), accumulate tokens. On any LLM error, fall back to the input query (best-effort), log, continue.

- [ ] **Step 1–5:** TDD with injected fake LLMs: (a) no history + Thai → returns message unchanged, wasRewritten false, 0 tokens; (b) history → calls rewriteLLM, wasRewritten true when output differs, tokens summed; (c) non-Thai query → calls translateLLM, tokens accumulate; (d) rewriteLLM error → falls back to message, no panic. Commit `feat(chat): add query rewrite + translate service`.

> Implementer: confirm the exact placeholder tokens in `prompts.yaml` `REWRITE_PROMPT`/`TRANSLATE_PROMPT` (Python uses `.replace("{query}", ...)` for translate and `{message}`/`{history}` for rewrite — open `carmen-chatbot/backend/config/prompts.yaml` and match the placeholder names exactly).

---

### Task 4: Budget + PII utilities

**Files:**
- Create: `backend/internal/services/budget.go` + `budget_test.go`
- Create: `backend/internal/utils/pii.go` + `pii_test.go`

**Interfaces:**
- Produces:
  - `services.DailyBudget` with `CheckAndIncrement(limit int) bool` — process-wide daily counter (resets on UTC date change; `limit<=0` → always true). Mutex-guarded; deterministic via an injectable `now func() time.Time` defaulting to `time.Now` (tests pass a fixed clock — note: scripts can't use Date.now, but Go tests can use time directly).
  - `utils.MaskPII(text string) string` — verbatim Python `pii.py` patterns (email→`[email]`, Thai mobile/generic/international phone→`[phone]`, Thai national id→`[national-id]`, card 16/15→`[card]`), applied in the documented order.

- [ ] **Step 1–5:** TDD: budget allows up to `limit`, blocks after, `limit=0` unlimited, resets on date change (fixed clock). MaskPII: `a@b.com`→`[email]`, `081 234 5678`→`[phone]`, a 13-digit id→`[national-id]`, a 16-digit number→`[card]`, plain text unchanged. Commit `feat(chat): add daily budget + PII masking utils`.

> Implementer: copy the exact regexes from `carmen-chatbot/backend/core/pii.py` and apply them in the same order (order matters — national-id/card before generic digit runs).

---

### Task 5: Stream orchestration flow

**Files:**
- Create: `backend/internal/api/chat_stream_flow.go`
- Create: `backend/internal/api/chat_stream_flow_test.go`

**Interfaces:**
- Consumes: Task 1 (`streamEvent`/`StreamChatRequest`), Task 2 (prompt service), Task 3 (rewrite), Task 4 (budget/PII), `services.IntentRouterService.Classify` (Plan 3), `services.RetrievalService.Retrieve` (Plan 2), `openrouter.Client.StreamAnswer`/`Embedding` (Plan 1), `services.ChatHistoryService` (existing, for save + log_id).
- Produces:
  - `(h *ChatHandler) streamFlow(c *fiber.Ctx, req StreamChatRequest, emit func(string)) error` — runs the full sequence and calls `emit(line)` for each NDJSON line. `emit` is injected so tests capture the lines without a real socket; the handler (Task 6) passes an `emit` that writes to the Fiber stream + flushes.
  - Sequence implemented exactly per Global Constraints: budget gate → intent Classify → quick-reply branch → (history? status_analyzing) → rewrite/translate → status_searching → retrieve → (zero docs? out_of_scope branch) → sources → status_composing → embed+context already from retrieval → StreamAnswer streaming with `[SUGGESTIONS]` withholding → flush remaining → suggestions → truncation notice → save log (MaskPII + HashUserID) → done(log_id).

- [ ] **Step 1: Write failing tests** with injected fakes (no network). Build a `ChatHandler` whose `intentRouter`, `retrieval`, `llm`, `historyService` are fakes/stubs (use small interfaces or function fields — the implementer may need to introduce narrow interfaces on `ChatHandler` to allow injection; do this minimally). Tests:
  - **Quick-reply:** intent stub returns `greeting`+canned → emitted lines are exactly `chunk`(canned) then `done`. No sources/status.
  - **Zero results:** intent tech_support, retrieval returns `[]` → `status_searching` then `chunk`(out_of_scope) then `done` (no `sources`/`composing`).
  - **Full path order:** intent tech_support (no history), retrieval returns 2 chunks, StreamAnswer fake emits `"hello [SUGGESTIONS] [\"q1\"]"` → emitted event TYPES in order: `status`(searching), `sources`, `status`(composing), `chunk`("hello"), `suggestions`(["q1"]), `done`.
  - **History path:** haveHistory true → first event is `status`(analyzing).
  - **Budget exceeded:** budget stub false → `chunk`(apology) + `done`(0).

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement** `chat_stream_flow.go`. Use the prompt service to build messages from the retrieval context; call `h.llm.StreamAnswer(ctx, model, messages, onDelta)` accumulating `full`, and within `onDelta` withhold from the first `[SUGGESTIONS]` occurrence (buffer; only emit `chunk` for text before the tag). After streaming, `ExtractSuggestions(full)` → emit `suggestions` if any; if finish_reason ∈ {length,max_tokens} emit truncation notice; if `full` empty emit `EmptyResponseNotice`. Save the log via the history service (question = `utils.MaskPII(message)`, user = hashed) and emit `done(log_id)`.

> Note: the simplest correct withholding is to accumulate the full text and emit chunk deltas only up to the tag index as text arrives; if the tag may split across deltas, buffer until a delta contains `[` then re-check. Match the test's expectation (single clean "hello" chunk before suggestions).

- [ ] **Step 4: Run → pass.** `go test ./internal/api/ -run StreamFlow -v`. Run `go build ./...` + `go test ./...`.

- [ ] **Step 5: Commit** `feat(chat): add native streaming orchestration flow`.

---

### Task 6: Stream handler dispatch + route wiring

**Files:**
- Modify: `backend/internal/api/chat_handler.go` (add `Stream` handler + any injected fields/interfaces from Task 5 init in `NewChatHandler`; add `budget`, `rewrite`, `promptsConfig` as needed)
- Modify: `backend/internal/router/chat_routes.go` (`POST /api/chat/stream` → `chatHandler.Stream` instead of `Proxy`)
- Create: `backend/internal/api/chat_stream_handler_test.go`

**Interfaces:**
- Produces:
  - `(h *ChatHandler) Stream(c *fiber.Ctx) error` — if `!config.AppConfig.ChatNative.Stream` → `return h.Proxy(c)`. Else parse via `parseStreamRequest`; set headers (`Content-Type: application/x-ndjson`, `Cache-Control: no-cache`, `Connection: keep-alive`); `return c.SendStreamWriter(func(w *bufio.Writer){ h.streamFlow(c, req, func(line string){ w.WriteString(line); w.Flush() }) })`.

- [ ] **Step 1: Write failing test** — with `CHAT_NATIVE_STREAM` off, `Stream` calls Proxy (assert it does not 200 with NDJSON when no chatbot URL — or assert it returns the proxy's bad-gateway when unset). With the flag on + injected fakes, `app.Test` on `POST /api/chat/stream` returns `Content-Type: application/x-ndjson` and a body whose lines parse as the expected event sequence (reuse the Task 5 quick-reply fake).
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** the handler + route swap + `NewChatHandler` wiring (construct budget/rewrite/prompt config; the `intentRouter`/`retrieval` already exist from Plans 2–3). Keep `Proxy` as the fallback.
- [ ] **Step 4: Run → pass.** `go build ./...`, `go vet`, `go test ./...`. With `RUN_DB_TESTS=1` + reachable DB/LLM + `CHAT_NATIVE_STREAM=true`, manually verify the real frontend works end-to-end against native streaming.
- [ ] **Step 5: Commit** `feat(chat): wire native stream handler behind CHAT_NATIVE_STREAM flag`.

---

## Self-Review

**Spec coverage:** NDJSON event sequence → Tasks 1+5; quick-reply/zero-result/truncation branches → Task 5; rewrite+translate → Task 3; prompt assembly + suggestions + notices verbatim → Task 2; budget + PII → Task 4; flag-gated native/proxy dispatch + route → Task 6. Consumes Plan 1 (StreamAnswer), Plan 2 (Retrieve), Plan 3 (Classify).

**Placeholder scan:** No TBD/TODO. Two implementer-verify notes (rewrite/translate placeholder tokens in prompts.yaml; PII regexes from pii.py) are concrete "copy verbatim from this file" checks.

**Type consistency:** `streamEvent`, `StreamChatRequest`, `parseStreamRequest`, `BuildChatMessages`, `ExtractSuggestions`, `GetLocale`, `TruncationNotice`/`EmptyResponseNotice`, `QueryRewriteService.BuildSearchQuery`, `DailyBudget.CheckAndIncrement`, `utils.MaskPII`, `streamFlow`, `Stream` are referenced consistently across tasks. Reuses `openrouter.ChatMessage`/`StreamAnswer` (Plan 1), `services.RetrievedChunk`/`Retrieve` (Plan 2), `IntentResult`/`Classify` (Plan 3), `ChatHistoryService`/`HashUserID` (existing).

**Known executor checks:** introduce narrow interfaces on `ChatHandler` for `intentRouter`/`retrieval`/`llm`/`historyService` so Task 5 tests can inject fakes (minimal, only what the flow calls); confirm `prompts.yaml` placeholder names for rewrite/translate; copy `pii.py` regexes verbatim and in order; confirm Fiber `SendStreamWriter` flush behavior against the real frontend before flipping `CHAT_NATIVE_STREAM` in production.
```

