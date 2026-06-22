# Chatbot Python→Go Migration — Master Plan Outline

> **For agentic workers:** This is an INDEX of 5 sequenced implementation plans, not an executable plan itself. Each plan below will be expanded into a full bite-sized TDD plan (`docs/superpowers/plans/2026-06-22-chatbot-go-plan-N-<name>.md`) before execution. Implement plans in order; each ends with working, independently testable software.

**Spec:** `docs/superpowers/specs/2026-06-22-chatbot-python-to-go-migration-design.md`
**Branch:** `feat/chatbot-go-migration`
**Goal:** Reimplement the Python `carmen-chatbot` RAG service natively in the Go Fiber `backend/`, parity-first, then retire Python.

## Architecture

Strangler migration: every Python-only `/api/chat/*` endpoint gets a native Go implementation behind a feature flag (`CHAT_NATIVE_<endpoint>`, default `proxy`). The existing `chat_handler.Proxy` stays as fallback until each native endpoint passes a golden-set parity check, then the flag flips. When all flags are native and stable, Python + proxy + `PYTHON_CHATBOT_URL` are deleted.

## Tech Stack

Go 1.25, Fiber v2.52, GORM (raw SQL via `database.DB.Raw`), pgvector, Postgres FTS (`to_tsvector('simple', …)`), OpenAI-compatible LLM via `pkg/openrouter`, YAML config via `gopkg.in/yaml.v3` (add dependency).

## Global Constants (verbatim from Python `tuning.yaml` — all Go code reads these from YAML, never hardcodes)

```
intent.default_threshold      = 0.90
intent.soft_zone_min          = 0.75
intent.soft_zone_votes        = 2
intent.mtime_check_interval   = 30
intent.category_thresholds    = {greeting:0.90, thanks:0.90, company_info:0.82,
                                  capabilities:0.88, out_of_scope:0.88, confusion:0.92}
retrieval.top_k               = 4
retrieval.max_distance        = 0.45
retrieval.fetch_k             = 20
retrieval.rrf_k               = 60
retrieval.path_boost_rrf      = 0.02
history.context_limit         = 4
history.memory_limit          = 20
llm.temperature               = 0.82
```

LLM model env vars (defaults from Python `config.py`):
```
LLM_API_BASE     = https://openrouter.ai/api/v1
LLM_CHAT_MODEL   = stepfun/step-3.5-flash:free
LLM_INTENT_MODEL = google/gemini-2.5-flash-lite
LLM_EMBED_MODEL  = qwen/qwen3-embedding-8b
LLM_FALLBACK_MODEL (optional)
MAX_PROMPT_TOKENS = 6000
VECTOR_DIMENSION  = 1536   (NOTE: Go util default is 2000 — reconcile in Plan 1)
DAILY_REQUEST_LIMIT = 1000 (0 = unlimited)
RATE_LIMIT_PER_MINUTE = 20/minute
PRIVACY_HMAC_SECRET (required, ≥32 chars)
```

## NDJSON Streaming Protocol (target parity — emitted by Plan 4)

Order: `status`("กำลังวิเคราะห์คำถาม...") → `status`("กำลังค้นหาและคัดกรองข้อมูล...") → `sources`([{source,title,score}]) → `status`("กำลังเรียบเรียงคำตอบ...") → `chunk`*(text) → `suggestions`([q1,q2,q3]) → `done`(log_id string). Each line is `json.dumps({"type":…,"data":…}) + "\n"`. Quick-reply path: `chunk` + `done`. Budget-exceeded: `chunk`(apology) + `done`(0).

---

## Plan 1 — Foundation & Config (low risk; pure libraries, no endpoint change)

**Goal:** Add the reusable primitives every later plan depends on, each fully unit-tested.

**Files:**
- Create `backend/internal/chatconfig/loader.go` — structs + loader for `tuning.yaml`, `intents.yaml`, `path_rules.yaml`, `prompts.yaml` (copied into `backend/config/`).
- Create `backend/config/{tuning,intents,path_rules,prompts}.yaml` — copied from `carmen-chatbot/backend/config/`.
- Modify `backend/pkg/openrouter/client.go` — add `StreamAnswer(ctx, model string, messages []Message, onChunk func(delta string)) (finishReason string, usage Usage, err error)` reading SSE `data:` lines; add `Usage` struct; add a configurable-model `Generate` variant + intent/chat model fields.
- Create `backend/internal/utils/lang.go` — `ThaiRatio(s string) float64` and `IsThai(s string) bool` (≥0.15).
- Create `backend/internal/utils/rrf.go` — `type Ranked struct{ Key string; Rank int }`; `FuseRRF(lists [][]Ranked, k int) map[string]float64`.
- Modify `backend/internal/utils/vector.go` — reconcile embedding dim with Python `VECTOR_DIMENSION=1536` (decide single source of truth).
- Modify `backend/internal/config/config.go` — add `LLMConfig.IntentModel`, `FallbackModel`, `MaxPromptTokens`; add `ChatConfig` budget/rate fields; add `CHAT_NATIVE_*` flag fields.
- Add dependency `gopkg.in/yaml.v3` to `go.mod`.

**Task list:**
1. Add `yaml.v3` dep; copy the 4 YAML files into `backend/config/`.
2. `chatconfig` structs + `Load()` with table-driven tests against the copied YAML (assert exact constant values above).
3. `utils/lang.go` ThaiRatio/IsThai with tests (pure Thai, pure English, 15% boundary, mixed).
4. `utils/rrf.go` FuseRRF with tests (single list, two lists, dedup by key, `1/(k+rank)` math for k=60).
5. `openrouter.StreamAnswer` + `Usage` — test with an httptest SSE server emitting `data: {...}\n\n` chunks and `data: [DONE]`; assert onChunk deltas, finishReason, multi-byte Thai split across chunks.
6. Config additions + reconcile embedding dim; test env parsing.

**Exit criteria:** `go test ./...` green; no behavior change to live endpoints; `StreamAnswer` proven against a fake SSE server.

---

## Plan 2 — Hybrid Retrieval Service (medium risk)

**Goal:** Replace the vector-only retrieval in `chat_ask_flow.go` with hybrid pgvector + FTS + RRF + path boost, matching Python.

**Files:**
- Create `backend/internal/services/retrieval_service.go` — `Retrieve(bu, question string, emb []float32, cfg RetrievalCfg) (RetrieveResult, error)`.
- Create `backend/migrations/0011_fts_gin_index.sql` — `CREATE INDEX … USING gin (to_tsvector('simple', content))` per BU schema (perf only).
- Create `backend/internal/services/retrieval_service_test.go`.
- Modify `backend/internal/api/chat_ask_flow.go` — call retrieval service instead of `queryVectorRows`.
- Create `backend/tests/parity/golden_set.json` + `backend/tests/parity/harness_test.go` — parity harness scaffold.

**Key SQL (verbatim parity):**
- Vector: `… (dc.embedding <=> CAST($1 AS vector)) AS distance … WHERE distance < $2 AND d.path NOT LIKE '%index.md' ORDER BY distance LIMIT $3` (cosine `<=>`, **not** the current `<->`).
- FTS: `… ts_rank_cd(to_tsvector('simple', dc.content), plainto_tsquery('simple', $1)) AS kw_score … WHERE to_tsvector('simple', dc.content) @@ plainto_tsquery('simple', $1) ORDER BY kw_score DESC LIMIT $2`.
- Skip FTS entirely when `IsThai(question)`.
- RRF: 1-indexed ranks, key = content hash, `path_boost_rrf` added when `path_rules.yaml` matches; sort by `effective_rrf` desc; take `top_k`.

**Task list:**
1. `RetrievalCfg`/`RetrieveResult` types + vector-only query test (uses `<=>`, `NOT LIKE '%index.md'`).
2. FTS query + Thai-skip branch test.
3. RRF fusion + path boost wiring (reuse `utils.FuseRRF`) with a deterministic fixture test.
4. Wire into `chat_ask_flow.go`; assert `/api/chat/ask` still returns sources.
5. Golden-set harness: load questions, run Go retrieval, assert top-k overlap ≥ threshold vs recorded Python baseline.

**Exit criteria:** retrieval unit tests green; `/api/chat/ask` uses hybrid retrieval; golden-set overlap meets the agreed bar.

---

## Plan 3 — Intent Router (medium risk)

**Goal:** Replace the 19-LOC stub `QuestionRouterService` with the 3-tier router (regex → vector → LLM) reading `intents.yaml`.

**Files:**
- Create `backend/internal/services/intent_router_service.go` — `Classify(question string, hasHistory bool) (IntentResult, error)` returning `{Type, CannedResponse, Tokens, EmbedTokens}`.
- Create `backend/internal/services/intent_examples.go` — embed-and-cache intent examples (batch embed on init; in-memory matrix; mtime throttle 30s).
- Create `backend/internal/services/intent_router_service_test.go`.
- Modify `backend/internal/api/chat_handler.go` — `RouteOnly` uses the new service; expand `route-test` response.

**Behavior to port (verbatim):**
- Regex DIRECT_MATCHES for greeting/thanks/capabilities/confusion (Thai+English, optional politeness particles) → (0,0) tokens.
- Vector: L2-normalize query, cosine vs example matrix, top-`min(5,n)`; hard match if `best ≥ category_threshold`; soft-zone if `best ≥ soft_zone_min` and `votes[topCat] ≥ soft_zone_votes` and `topCat != confusion`.
- Confusion + hasHistory → fall through to LLM.
- LLM fallback: one-word classification with the documented category prompt, using `LLM_INTENT_MODEL`.
- Quick-reply intents `{greeting, thanks, out_of_scope, company_info, capabilities}` return canned response from `intents.yaml[type].responses[lang]`.

**Task list:**
1. Regex tier + tests (each category, politeness particles, non-match falls through).
2. Example embedding cache (batch) + cosine match tier with fixture vectors; hard-match + soft-zone-vote tests.
3. LLM fallback tier with a fake intent LLM; one-word extraction test.
4. Canned-response lookup per lang; quick-reply set test.
5. Wire `route-test` endpoint; parity check on a labeled intent set.

**Exit criteria:** intent unit tests green; `route-test` returns correct intent+tokens; labeled-set accuracy matches Python within agreed tolerance.

---

## Plan 4 — Streaming Endpoint `/api/chat/stream` (highest risk)

**Goal:** Native NDJSON streaming with full orchestration, behind `CHAT_NATIVE_STREAM`; flip flag after golden set passes.

**Files:**
- Create `backend/internal/api/chat_stream_flow.go` — orchestration + NDJSON writer using `c.SendStreamWriter`.
- Create `backend/internal/services/prompt_service.go` — system+human prompt assembly from `prompts.yaml`, locale prefaces, `[SUGGESTIONS]` extraction, truncation/empty notices.
- Create `backend/internal/services/rewrite_service.go` — query rewrite (history) + translate (non-Thai) via LLM.
- Modify `backend/internal/api/chat_handler.go` — add `Stream(c)` dispatching native vs `Proxy` by flag; parse `ChatRequest` (text/bu/username/room_id/model/history/db_schema/lang/referrer_page).
- Modify `backend/internal/router/chat_routes.go` — `POST /api/chat/stream` → `chatHandler.Stream`.
- Create `backend/internal/api/chat_stream_flow_test.go`.

**Task list:**
1. `ChatRequest` parse + validation (1–2000 chars text, slug bu) test.
2. NDJSON writer helper (`{"type","data"}\n` + flush) test against `app.Test` capturing the streamed body.
3. Prompt assembly + `[SUGGESTIONS]` extraction + truncation/empty notices tests.
4. Rewrite/translate services with fake LLM tests (history triggers rewrite; non-Thai triggers translate).
5. Quick-reply branch (intent → canned → `chunk`+`done`) end-to-end test.
6. Full RAG branch: status×3 → sources → chunk* → suggestions → done order test (fake retrieval + fake stream LLM).
7. Budget gate (`DAILY_REQUEST_LIMIT`) + PII mask on logged query tests.
8. Flag dispatch test (proxy when `CHAT_NATIVE_STREAM` off).

**Exit criteria:** streamed event order/format matches protocol byte-for-line; frontend chat works end-to-end against native; golden-set answer parity acceptable; flag flip documented.

---

## Plan 5 — Rooms / History / Feedback CRUD + Final Cutover (medium risk)

**Goal:** Native implementations for the remaining proxied CRUD endpoints, then delete Python.

**Files:**
- Modify `backend/internal/services/chat_history_service.go` — add rooms list/create, room-history, clear, feedback update.
- Modify `backend/internal/api/chat_handler.go` — native `Rooms`, `RoomHistory`, `ClearRoom`, `Feedback`, `DeleteHistory` (flag-gated).
- Modify `backend/internal/api/chat_history_handler.go` as needed.
- Modify `backend/internal/router/chat_routes.go` — point CRUD routes at native handlers.
- Delete (final step): `carmen-chatbot/`, `chat_handler.Proxy`, `Server.ChatbotURL`, proxy routes.
- Modify `docker-compose.yml`, `.env*`, `CLAUDE.md` — remove the Python service.

**Feedback SQL (verbatim):** `UPDATE public.chat_history SET metrics = jsonb_set(COALESCE(metrics,'{}'), '{feedback}', to_jsonb($1)) WHERE id=$2 AND bu_id=$3 AND user_id=$4` (score ∈ {1,-1}).

**Task list:**
1. Feedback update method + handler + flag flip; test score validation + ownership filter.
2. Rooms list/create + room-history + clear methods + handlers; tests.
3. Flip all `CHAT_NATIVE_*` flags to native; soak.
4. Remove proxy, `PYTHON_CHATBOT_URL`, delete `carmen-chatbot/`, update compose/env/CLAUDE.md.
5. Full regression: `make test` + manual frontend pass; commit.

**Exit criteria:** all `/api/chat/*` served natively; Python removed; full test suite + manual frontend pass green.

---

## Cross-Plan Risks (carried from spec)

| Risk | Where handled |
|---|---|
| SSE multi-byte / partial-line parsing | Plan 1 (StreamAnswer tests) |
| Retrieval mismatch (`<=>` vs `<->`, FTS ranking) | Plan 2 (golden set) |
| Hidden intent-router logic | Plan 3 (rule-by-rule + labeled set) |
| Fiber streaming flush/buffering | Plan 4 (end-to-end frontend test) |
| Embedding dim mismatch (Go 2000 vs Python 1536) | Plan 1 (reconcile) — **decide before Plan 2** |

## Open Decisions (resolve before expanding each plan)

1. **Golden-set source** — capture from real Python logs vs hand-write ~30–50 questions. (affects Plan 2/3/4)
2. **Embedding dimension** — confirm the live `VECTOR_DIMENSION` in production so Go util default is corrected. (Plan 1, blocks Plan 2)
3. **Parity tolerance** — exact pass bar for top-k overlap and intent accuracy. (Plan 2/3)
