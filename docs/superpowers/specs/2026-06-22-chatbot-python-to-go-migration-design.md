# Chatbot Migration: Python FastAPI → Go (merge into backend)

**Date:** 2026-06-22
**Status:** Design approved — pending implementation plan
**Scope:** Reimplement `carmen-chatbot/` (Python RAG service) natively in the Go Fiber `backend/`, then retire the Python service.

## Goal

Consolidate the two runtime services into one. Reimplement the Python chatbot's RAG pipeline natively in Go inside `backend/`, stop proxying `/api/chat/*` to Python, and eventually delete `carmen-chatbot/` and `PYTHON_CHATBOT_URL`.

### Motivations (all confirmed by user)
- **One service** — eliminate the Python runtime / second Docker image.
- **One language** — Go-only codebase; no Python/Go context switching.
- **Performance / latency** — remove the Go→Python proxy network hop and Python overhead.
- **Reduce complexity** — share DB pool, config, and auth in a single service.

### Strategy decisions (confirmed)
- **Parity-first.** Reproduce Python behavior as closely as possible (reuse the YAML configs, match retrieval/intent results), then refine later. Minimize regression risk.
- **Strangler cutover, endpoint by endpoint.** Feature-flag each endpoint `native ↔ proxy`; the existing proxy stays as fallback until each native endpoint is proven.

### Non-goals
- Behavior improvements / re-tuning the RAG pipeline (later, after parity).
- Changing the public `/api/chat/*` contract or the frontend.
- Schema redesign (FTS is computed at query time — no new columns required).

## Current State (as surveyed)

**Python service** `carmen-chatbot/` (~3,128 LOC):
- `llm/chat_service.py` (601) — orchestration + NDJSON streaming
- `llm/intent_router.py` (448) + `intents.yaml` — LLM-based intent routing
- `llm/retrieval.py` (356) — hybrid retrieval: pgvector (`<=>` cosine) + FTS (`to_tsvector('simple', content)`) + Reciprocal Rank Fusion + path boost
- `llm/chat_history.py` (346) — rooms / history
- `llm/llm_client.py` (249) — `langchain-openai` `ChatOpenAI`, OpenAI-compatible base, streaming via `astream`
- `llm/pricing.py`, `core/budget.py`, `core/pii.py`, `core/rate_limit.py`
- YAML configs: `config/{intents,prompts,tuning,path_rules}.yaml`
- Endpoints: `POST /stream` (NDJSON), `POST /` (invoke), `DELETE /clear/{room_id}`, `POST /feedback/{message_id}`, rooms.

**Go backend** `backend/` already has a partial native chat path:
- `pkg/openrouter/client.go` — OpenAI-compatible LLM client with `Embedding()` and `GenerateAnswer()` (**blocking, no streaming yet**).
- `internal/api/chat_ask_flow.go` — native `POST /api/chat/ask`: `createEmbedding → tryCachedAnswer (semantic cache) → tryRouterAnswer → vector retrieval (ORDER BY embedding <-> vector, L2, vector-only) → buildContext → LLM → saveHistory`.
- Native: `route-test`, `record-history`, `history/list`. `QuestionRouterService` is only 19 LOC (thin).
- **Still proxied to Python** (`chat_handler.Proxy`): `POST /api/chat/stream` (the main streaming endpoint used by the frontend), `feedback`, `rooms/*`, `clear`, `room-history`.

**Key technical findings:**
- FTS uses `to_tsvector('simple', dc.content)` computed at query time — Go can run identical SQL; **no schema migration required** (a GIN index is a perf-only addition).
- RRF is done in app code (`1/(k+rank)` + path boost) — straightforward to port.
- NDJSON protocol: `{"type":"chunk","data":...}` → `{"type":"sources","data":[...]}` → `{"type":"done","data":"<log_id>"}`.

## Target End-State

A single Go Fiber service serving all `/api/chat/*` natively. `carmen-chatbot/` deleted; proxy and `PYTHON_CHATBOT_URL` removed; docker-compose and CLAUDE.md updated.

## Module Mapping (Python → Go)

| Python (`carmen-chatbot/backend`) | Go destination (`backend/internal`) |
|---|---|
| `llm/retrieval.py` (hybrid pgvector+FTS+RRF) | `services/retrieval_service.go` (new; replaces vector-only path) |
| `llm/intent_router.py` (448) + `intents.yaml` | `services/intent_router_service.go` (expand from `question_router_service.go`) |
| `llm/chat_service.py` (orchestration + stream) | `api/chat_stream_flow.go` (new; alongside `chat_ask_flow.go`) |
| `llm/prompt_builder.py` + `prompts.yaml` | `services/prompt_service.go` + keep `prompts.yaml` |
| `llm/llm_client.py` (langchain streaming) | add `StreamAnswer()` to `pkg/openrouter/client.go` |
| `llm/chat_history.py` + rooms | expand `services/chat_history_service.go` (rooms, room-history, clear) |
| `llm/pricing.py`, `core/budget.py` | `services/pricing_service.go`, budget util |
| `core/pii.py`, `core/rate_limit.py` | `utils/pii.go`, `middleware/` (rate-limit pattern exists) |
| `config/{intents,prompts,tuning,path_rules}.yaml` | copy to `backend/config/`, read via Go YAML |
| feedback endpoint | `chat_handler.Feedback` (native) |

### Principles
- **Keep all YAML configs** (tuning/intents/prompts/path_rules) — parity depends on these values; Go just reads them.
- Reuse existing Go pieces (embedder, DB pool, `chat_ask_flow`, history service, openrouter client).
- Every new endpoint behind a feature flag `CHAT_NATIVE_<endpoint>` to switch native ↔ proxy.

## Hard Parts

### 1) Streaming (`POST /api/chat/stream`)
- Add `StreamAnswer(ctx, messages, onChunk func(string))` to `pkg/openrouter/client.go`: POST `/chat/completions` with `"stream": true`, read the body line-by-line (`data: {...}`), parse `choices[].delta.content`, stop at `data: [DONE]`.
- Stream out with Fiber `c.SendStreamWriter` (or `SetBodyStreamWriter`), writing one NDJSON line per event with a flush.
- Event order must match Python exactly: `chunk*` → `sources` → `done` (with `log_id` from `saveHistory`).
- Quick-reply / budget-exceeded cases also emit `chunk` + `done` identically.

### 2) Hybrid retrieval (`retrieval_service.go`)
- Vector query: `dc.embedding <=> CAST($1 AS vector)` (cosine — **change from current `<->` L2**) with `WHERE distance < max_dist`.
- Keyword query: `ts_rank_cd(to_tsvector('simple', dc.content), plainto_tsquery('simple', $1))` with `@@`.
- Merge via RRF: `1/(k+rank)` for both lists (key = content hash), add `path_boost_rrf` from `path_rules.yaml`, sort by `effective_rrf` descending.
- All constants (`rrf_k`, `max_dist`, `path_boost_rrf`, limits) read from `tuning.yaml`.
- Add migration: GIN index on `to_tsvector('simple', content)` (perf only; not required for correctness).

### 3) Intent router (`intent_router_service.go`)
- Port logic from `intent_router.py` + read `intents.yaml` (intent patterns, quick replies, routing). Keep the semantic-cache / router-answer already in `chat_ask_flow.go`.

## Parity Testing (critical — parity-first)

- **Golden set:** ~30–50 real questions across every intent / BU.
- Run Python (current) to capture a baseline → run Go → compare: retrieved chunks & order, sources, intent, answer (semantic comparison, not byte-exact).
- Pass criteria: high top-k retrieval overlap + matching intent + no obvious regression.
- Unit tests: RRF math, FTS query, NDJSON encoder matches protocol.

## Cutover (strangler, endpoint by endpoint)

1. `record-history` / `history` (already native) — confirm.
2. `feedback`, `rooms/*`, `clear`, `room-history` → native (low risk, CRUD).
3. **`/api/chat/stream`** → native (highest risk) after the golden set passes.
4. Every endpoint behind `CHAT_NATIVE_*`; default proxy → flip one at a time in prod; rollback = flip the flag back.
5. When all flags are native and stable → delete Python, proxy, `PYTHON_CHATBOT_URL`; update docker-compose + CLAUDE.md.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM streaming SSE edge cases (multi-byte, partial line) | line-based buffered reader + multi-byte (Thai) tests |
| Retrieval mismatch (`<=>` vs `<->`, FTS ranking) | golden-set diff before flipping the flag |
| Hidden logic in 448-LOC intent router | port rule by rule against `intents.yaml` + existing route-test endpoint |
| Budget / pricing / PII computed differently | port + unit tests comparing against Python numbers |
| Fiber streaming doesn't flush / buffers | end-to-end test against the real frontend |
