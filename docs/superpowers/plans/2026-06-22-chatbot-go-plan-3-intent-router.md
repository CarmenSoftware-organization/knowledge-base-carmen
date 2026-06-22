# Chatbot Go Migration — Plan 3: Intent Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Port the Python 3-tier intent router (regex fast-track → vector semantic similarity with soft-zone voting → LLM fallback) into Go as a native `IntentRouterService`, reading `intents.yaml` + `tuning.yaml`, matching `intent_router.py` behavior.

**Architecture:** Pure, unit-testable cores (regex matcher; cosine-match + soft-zone voting given a fixture matrix; LLM-response keyword parsing; threshold decision) separated from the LLM/embedding-dependent index build and fallback call (gated like Plan 2's DB tests). Reuses Plan 1 (`chatconfig`, `utils.Truncate/Normalize`) and Plan 2's openrouter client. This is intent CLASSIFICATION (greeting/thanks/tech_support/…), independent of the path-candidate `QuestionRouterService`. Plan 4 (streaming) consumes the result for quick replies.

**Tech Stack:** Go 1.25, `regexp` (RE2), OpenAI-compatible embeddings + intent model via `pkg/openrouter`, `chatconfig` tuning/intents.

## Global Constraints

- Go module `github.com/new-carmen/backend`; run from `backend/`.
- Thresholds read from `chatconfig.IntentTuning` (Plan 1, `tuning.yaml`), never hardcoded: `default_threshold=0.90`, `soft_zone_min=0.75`, `soft_zone_votes=2`, `category_thresholds={greeting:0.90,thanks:0.90,company_info:0.82,capabilities:0.88,out_of_scope:0.88,confusion:0.92}`.
- Regex DIRECT_MATCHES (verbatim from `intent_router.py`, compiled case-insensitively, matched against the trimmed+lowercased message; `confusion` is SKIPPED when `haveHistory`):
  - greeting: `^(สวัสดี|hello|hi|hey|good\s?(morning|afternoon|evening)|yo|sup|ทักทาย|ทัก|เฮลโล|หวัดดี|ดี)(ครับ|ค่ะ|คร้า|คับ|นะ|จ๊ะ|จ๋า|!)?$`
  - thanks: `^(ขอบคุณ|thank\s?you|thanks|thx|ขอบใจ|เยี่ยม|ดีมาก|ขอบพระคุณ|แต๊ง|กราบ|awesome|perfect)(ครับ|ค่ะ|คร้า|คับ|นะ|จ๊ะ|จ๋า|!)?$`
  - capabilities: `^(ทำอะไรได้บ้าง|ช่วยอะไรได้บ้าง|ช่วยยังไง|มึความสามารถอะไร|what can you do|how can you help|features|capabilities)$`
  - confusion: `^(อะไรนะ|งง|ไม่เข้าใจ|พูดไรนะ|ไม่รู้เรื่อง|ห๊ะ|ฮะ|what\??|confused|huh\??|eh\??)$`
- Embeddings are L2-normalized AND truncated to `VECTOR_DIMENSION` (reuse `utils.TruncateEmbedding` + `utils.NormalizeEmbedding`). Matrix rows are unit vectors; cosine similarity = dot product.
- Vector match (verbatim algorithm): normalize query; `scores = matrix · query`; take top-`min(5,n)` by score desc; `best` = top-1. If `best_intent=="confusion" && haveHistory` → fall through to LLM. Elif `best_score >= category_threshold(best_intent)` → return `best_intent` (hard match). Elif `best_score >= soft_zone_min` → among the top-N indices with `score >= soft_zone_min`, count votes per label; let `top_cat` = most-voted; if `top_cat != "confusion" && votes >= soft_zone_votes` → return `top_cat`. Else fall through to LLM.
- Quick-reply intents (carry a canned response): `{greeting, thanks, out_of_scope, company_info, capabilities}`. `tech_support` and `confusion` have empty canned response.
- LLM fallback uses the **intent model** (`LLMConfig.IntentModel`), temperature 0, the verbatim prompt below; parse the reply by splitting on `[\s\n.,!?\-]+`, uppercasing, first token in `{GREETING,THANKS,COMPANY_INFO,CAPABILITIES,OUT_OF_SCOPE,CONFUSION,TECH_SUPPORT}` wins; no match → `tech_support`. Any error → `tech_support`.
- Return type `IntentResult{ Type string; CannedResponse string; LLMInputTokens, LLMOutputTokens, EmbedTokens int; Source string }` (`Source` ∈ {"regex","vector_hard","vector_soft","llm","fallback"} for observability/tests).
- LLM/embedding-dependent tests skip when `RUN_DB_TESTS != "1"` or the LLM is unreachable; offline suite stays green.

## LLM Fallback Prompt (verbatim, with `{vector_hint}` and `{context_instruction}` substitutions)

```
Classify this user query for a hotel accounting software support chatbot.
Reply with ONE WORD only — the category name.

Categories:
- GREETING    : casual hello/greeting  (สวัสดี / hello / hi / good morning)
- THANKS      : appreciation or done   (ขอบคุณ / thank you / great / awesome)
- COMPANY_INFO: contact info, address, phone, email, Line ID, website, or how to reach support/sales/team
- CAPABILITIES: asking what the AI assistant can do  (ทำอะไรได้บ้าง / what can you help with)
- OUT_OF_SCOPE: completely unrelated topics — weather, food, news, sports, jokes, general chat
- CONFUSION   : vague/meaningless message with no specific topic  (งง / อะไรนะ / huh? / ???)
- TECH_SUPPORT: system how-to, troubleshooting, feature usage — DEFAULT for any software question
{vector_hint}
Query: "{sanitized_message}"
{context_instruction}

ONE word:
```

- `context_instruction` when `haveHistory`: `NOTE: An ongoing conversation exists. Classify based on the query itself — COMPANY_INFO still applies for contact/address questions regardless of history. Use TECH_SUPPORT for ambiguous/confused messages when history is present.`
- `context_instruction` otherwise: `Treat ambiguous or confused messages (งง, huh?) without context as OUT_OF_SCOPE.`
- `vector_hint` only when `vec_best_score >= soft_zone_min`: `\n[Semantic hint: vector analysis suggests {VEC_BEST_INTENT_UPPER} (score={vec_best_score:.2f}) — confirm or override if clearly wrong.]` (empty otherwise).

---

### Task 1: Regex fast-track (pure)

**Files:**
- Create: `backend/internal/services/intent_regex.go`
- Create: `backend/internal/services/intent_regex_test.go`

**Interfaces:**
- Produces:
  - `services.RegexIntent(message string, haveHistory bool) (intent string, matched bool)` — trims+lowercases the message, tests the four DIRECT_MATCHES patterns in order (greeting, thanks, capabilities, confusion), skipping `confusion` when `haveHistory`. Returns the first matching intent.

- [ ] **Step 1: Write the failing test**

Create `backend/internal/services/intent_regex_test.go`:

```go
package services

import "testing"

func TestRegexIntent(t *testing.T) {
	cases := []struct {
		name        string
		msg         string
		haveHistory bool
		want        string
		matched     bool
	}{
		{"thai greeting", "สวัสดีครับ", false, "greeting", true},
		{"english hi", "hi", false, "greeting", true},
		{"good morning", "good morning", false, "greeting", true},
		{"thai thanks", "ขอบคุณค่ะ", false, "thanks", true},
		{"thank you", "thank you", false, "thanks", true},
		{"capabilities", "ทำอะไรได้บ้าง", false, "capabilities", true},
		{"confusion no history", "งง", false, "confusion", true},
		{"confusion WITH history skipped", "งง", true, "", false},
		{"real question no match", "how do I post an AP invoice?", false, "", false},
		{"trims and lowercases", "  HELLO  ", false, "greeting", true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, ok := RegexIntent(c.msg, c.haveHistory)
			if ok != c.matched || got != c.want {
				t.Errorf("RegexIntent(%q,%v) = (%q,%v), want (%q,%v)", c.msg, c.haveHistory, got, ok, c.want, c.matched)
			}
		})
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/services/ -run RegexIntent -v`
Expected: FAIL — `RegexIntent` undefined.

- [ ] **Step 3: Write the implementation**

Create `backend/internal/services/intent_regex.go`:

```go
package services

import (
	"regexp"
	"strings"
)

// directMatch pairs an intent label with its compiled fast-track pattern.
type directMatch struct {
	intent  string
	pattern *regexp.Regexp
}

// Order matches intent_router.py DIRECT_MATCHES. Patterns are compiled
// case-insensitively and anchored; tested against the trimmed+lowercased message.
var directMatches = []directMatch{
	{"greeting", regexp.MustCompile(`(?i)^(สวัสดี|hello|hi|hey|good\s?(morning|afternoon|evening)|yo|sup|ทักทาย|ทัก|เฮลโล|หวัดดี|ดี)(ครับ|ค่ะ|คร้า|คับ|นะ|จ๊ะ|จ๋า|!)?$`)},
	{"thanks", regexp.MustCompile(`(?i)^(ขอบคุณ|thank\s?you|thanks|thx|ขอบใจ|เยี่ยม|ดีมาก|ขอบพระคุณ|แต๊ง|กราบ|awesome|perfect)(ครับ|ค่ะ|คร้า|คับ|นะ|จ๊ะ|จ๋า|!)?$`)},
	{"capabilities", regexp.MustCompile(`(?i)^(ทำอะไรได้บ้าง|ช่วยอะไรได้บ้าง|ช่วยยังไง|มึความสามารถอะไร|what can you do|how can you help|features|capabilities)$`)},
	{"confusion", regexp.MustCompile(`(?i)^(อะไรนะ|งง|ไม่เข้าใจ|พูดไรนะ|ไม่รู้เรื่อง|ห๊ะ|ฮะ|what\??|confused|huh\??|eh\??)$`)},
}

// RegexIntent runs the fast-track regex tier. confusion is skipped when history
// is present (an ongoing conversation makes a terse message a real follow-up).
func RegexIntent(message string, haveHistory bool) (string, bool) {
	msg := strings.ToLower(strings.TrimSpace(message))
	for _, dm := range directMatches {
		if dm.intent == "confusion" && haveHistory {
			continue
		}
		if dm.pattern.MatchString(msg) {
			return dm.intent, true
		}
	}
	return "", false
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/services/ -run RegexIntent -v`
Expected: PASS. (If any Thai pattern fails to compile, RE2 reports it at `MustCompile` — fix the literal.)

- [ ] **Step 5: Commit**

```bash
cd backend
git add internal/services/intent_regex.go internal/services/intent_regex_test.go
git commit -m "feat(chat): add intent regex fast-track tier"
```

---

### Task 2: Batch embedding on the OpenRouter client

**Files:**
- Modify: `backend/pkg/openrouter/client.go`
- Create: `backend/pkg/openrouter/embedding_batch_test.go`

**Interfaces:**
- Consumes: existing `Client` (`APIBase`,`APIKey`,`EmbedModel`,`httpClient`), `EmbeddingsRequest`, `EmbeddingsResponse`.
- Produces: `(c *Client) EmbeddingBatch(texts []string) ([][]float32, error)` — one POST to `/embeddings` with `Input: texts`, returning vectors ordered by `Data[i].Index` (sort by Index to be safe). Empty input → empty slice, no call.

- [ ] **Step 1: Write the failing test**

Create `backend/pkg/openrouter/embedding_batch_test.go`:

```go
package openrouter

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestEmbeddingBatch(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// Return two vectors, deliberately out of order by index to test sorting.
		w.Write([]byte(`{"data":[{"embedding":[0.3,0.4],"index":1},{"embedding":[0.1,0.2],"index":0}],"usage":{"prompt_tokens":5}}`))
	}))
	defer srv.Close()

	c := &Client{APIBase: srv.URL, EmbedModel: "m", httpClient: &http.Client{Timeout: 5 * time.Second}}
	vecs, err := c.EmbeddingBatch([]string{"a", "b"})
	if err != nil {
		t.Fatalf("EmbeddingBatch: %v", err)
	}
	if len(vecs) != 2 {
		t.Fatalf("len = %d, want 2", len(vecs))
	}
	if vecs[0][0] != 0.1 || vecs[1][0] != 0.3 {
		t.Errorf("vectors not ordered by index: %v", vecs)
	}
}

func TestEmbeddingBatch_Empty(t *testing.T) {
	c := &Client{}
	vecs, err := c.EmbeddingBatch(nil)
	if err != nil || len(vecs) != 0 {
		t.Errorf("empty input: got (%v,%v)", vecs, err)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./pkg/openrouter/ -run EmbeddingBatch -v`
Expected: FAIL — `EmbeddingBatch` undefined.

- [ ] **Step 3: Add the implementation**

Append to `backend/pkg/openrouter/client.go` (uses already-imported `sort`? add `"sort"` to imports):

```go
// EmbeddingBatch embeds multiple texts in a single request, returning vectors
// ordered to match the input (by the response's Index field).
func (c *Client) EmbeddingBatch(texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return [][]float32{}, nil
	}
	reqBody := EmbeddingsRequest{Model: c.EmbedModel, Input: texts}
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}
	req, err := http.NewRequest("POST", strings.TrimRight(c.APIBase, "/")+"/embeddings", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.APIKey)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("openrouter error %d: %s", resp.StatusCode, string(body))
	}
	var res EmbeddingsResponse
	if err := json.Unmarshal(body, &res); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}
	if len(res.Data) != len(texts) {
		return nil, fmt.Errorf("embedding count mismatch: got %d want %d", len(res.Data), len(texts))
	}
	sort.Slice(res.Data, func(i, j int) bool { return res.Data[i].Index < res.Data[j].Index })
	out := make([][]float32, len(res.Data))
	for i := range res.Data {
		out[i] = res.Data[i].Embedding
	}
	return out, nil
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./pkg/openrouter/ -run EmbeddingBatch -v`
Expected: PASS (both).

- [ ] **Step 5: Commit**

```bash
cd backend
git add pkg/openrouter/client.go pkg/openrouter/embedding_batch_test.go
git commit -m "feat(chat): add batch embedding to openrouter client"
```

---

### Task 3: Intent index — cosine match + soft-zone voting

**Files:**
- Create: `backend/internal/services/intent_index.go`
- Create: `backend/internal/services/intent_index_test.go`

**Interfaces:**
- Consumes: `chatconfig.IntentTuning` (thresholds), `chatconfig.Intent` examples (via `chatconfig.LoadIntents`), `utils.TruncateEmbedding`/`NormalizeEmbedding`, `openrouter.EmbeddingBatch` (Task 2).
- Produces:
  - `services.IntentIndex` holding `matrix [][]float32` (unit rows), `labels []string`, `tuning chatconfig.IntentTuning`, `canned map[string]map[string]string` (category→lang→response).
  - `services.IntentMatch{ Intent string; Score float64; Source string }` (Source ∈ {"vector_hard","vector_soft",""}).
  - `(idx *IntentIndex) Match(queryEmb []float32, haveHistory bool) (IntentMatch, bool)` — pure: normalizes the query, computes cosine scores against the matrix, applies the verbatim hard/soft-zone decision. Returns `(match, true)` when a hard or soft decision fires; `(_, false)` when it should fall through to LLM (including the confusion-with-history case). Also returns nothing to embed — embedding is the caller's job.
  - `(idx *IntentIndex) Canned(intent, lang string) string` — looks up the canned response (empty if none).

- [ ] **Step 1: Write the failing test (pure Match with a fixture matrix)**

Create `backend/internal/services/intent_index_test.go`:

```go
package services

import (
	"testing"

	"github.com/new-carmen/backend/internal/chatconfig"
	"github.com/new-carmen/backend/internal/utils"
)

func intentTuning() chatconfig.IntentTuning {
	return chatconfig.IntentTuning{
		DefaultThreshold: 0.90, SoftZoneMin: 0.75, SoftZoneVotes: 2,
		CategoryThresholds: map[string]float64{"greeting": 0.90, "confusion": 0.92},
	}
}

// unit builds a normalized 2-D vector pointing at angle implied by (x,y).
func unit(x, y float32) []float32 { return utils.NormalizeEmbedding([]float32{x, y}) }

func TestIntentIndex_HardMatch(t *testing.T) {
	idx := &IntentIndex{
		matrix: [][]float32{unit(1, 0), unit(0, 1)},
		labels: []string{"greeting", "thanks"},
		tuning: intentTuning(),
	}
	// Query nearly parallel to row 0 (greeting) → score ≈ 1.0 ≥ 0.90 → hard match.
	m, ok := idx.Match(unit(1, 0), false)
	if !ok || m.Intent != "greeting" || m.Source != "vector_hard" {
		t.Fatalf("hard match = (%+v,%v)", m, ok)
	}
}

func TestIntentIndex_SoftZoneVotes(t *testing.T) {
	// Two 'greeting' rows close to the query (~0.80 each), enough votes (2) in soft zone.
	idx := &IntentIndex{
		matrix: [][]float32{unit(1, 0.6), unit(1, 0.7), unit(0, 1)},
		labels: []string{"greeting", "greeting", "thanks"},
		tuning: intentTuning(),
	}
	m, ok := idx.Match(unit(1, 0.65), false)
	if !ok || m.Intent != "greeting" || m.Source != "vector_soft" {
		t.Fatalf("soft match = (%+v,%v)", m, ok)
	}
}

func TestIntentIndex_ConfusionWithHistoryFallsThrough(t *testing.T) {
	idx := &IntentIndex{
		matrix: [][]float32{unit(1, 0)},
		labels: []string{"confusion"},
		tuning: intentTuning(),
	}
	if _, ok := idx.Match(unit(1, 0), true); ok {
		t.Error("confusion + history must fall through to LLM (ok=false)")
	}
}

func TestIntentIndex_NoMatchFallsThrough(t *testing.T) {
	idx := &IntentIndex{
		matrix: [][]float32{unit(1, 0)},
		labels: []string{"greeting"},
		tuning: intentTuning(),
	}
	// Orthogonal query → score ≈ 0 < soft_zone_min → fall through.
	if _, ok := idx.Match(unit(0, 1), false); ok {
		t.Error("low score must fall through (ok=false)")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/services/ -run IntentIndex -v`
Expected: FAIL — `IntentIndex`/`Match` undefined.

- [ ] **Step 3: Write the implementation**

Create `backend/internal/services/intent_index.go`:

```go
package services

import (
	"sort"

	"github.com/new-carmen/backend/internal/chatconfig"
	"github.com/new-carmen/backend/internal/utils"
)

type IntentIndex struct {
	matrix [][]float32
	labels []string
	tuning chatconfig.IntentTuning
	canned map[string]map[string]string
}

type IntentMatch struct {
	Intent string
	Score  float64
	Source string
}

func dot(a, b []float32) float64 {
	n := len(a)
	if len(b) < n {
		n = len(b)
	}
	var s float64
	for i := 0; i < n; i++ {
		s += float64(a[i]) * float64(b[i])
	}
	return s
}

func (idx *IntentIndex) categoryThreshold(intent string) float64 {
	if t, ok := idx.tuning.CategoryThresholds[intent]; ok {
		return t
	}
	return idx.tuning.DefaultThreshold
}

// Match runs the vector tier. Returns (match,true) on a hard or soft decision,
// or (_,false) to fall through to the LLM. queryEmb need not be pre-normalized.
func (idx *IntentIndex) Match(queryEmb []float32, haveHistory bool) (IntentMatch, bool) {
	if len(idx.matrix) == 0 {
		return IntentMatch{}, false
	}
	q := utils.NormalizeEmbedding(queryEmb)

	type scored struct {
		label string
		score float64
	}
	all := make([]scored, len(idx.matrix))
	for i, row := range idx.matrix {
		all[i] = scored{idx.labels[i], dot(row, q)}
	}
	sort.SliceStable(all, func(i, j int) bool { return all[i].score > all[j].score })

	topN := 5
	if topN > len(all) {
		topN = len(all)
	}
	top := all[:topN]
	best := top[0]

	// Confusion with active history is a real follow-up — defer to LLM.
	if best.label == "confusion" && haveHistory {
		return IntentMatch{}, false
	}
	if best.score >= idx.categoryThreshold(best.label) {
		return IntentMatch{Intent: best.label, Score: best.score, Source: "vector_hard"}, true
	}
	if best.score >= idx.tuning.SoftZoneMin {
		votes := map[string]int{}
		for _, s := range top {
			if s.score >= idx.tuning.SoftZoneMin {
				votes[s.label]++
			}
		}
		if len(votes) > 0 {
			topCat, topCnt := "", 0
			// deterministic: highest count, tie-break by label
			labels := make([]string, 0, len(votes))
			for l := range votes {
				labels = append(labels, l)
			}
			sort.Strings(labels)
			for _, l := range labels {
				if votes[l] > topCnt {
					topCnt, topCat = votes[l], l
				}
			}
			if topCat != "confusion" && topCnt >= idx.tuning.SoftZoneVotes {
				return IntentMatch{Intent: topCat, Score: best.score, Source: "vector_soft"}, true
			}
		}
	}
	return IntentMatch{}, false
}

func (idx *IntentIndex) Canned(intent, lang string) string {
	if m, ok := idx.canned[intent]; ok {
		return m[lang]
	}
	return ""
}

// BuildIntentIndex embeds all intents.yaml examples (batched) into a normalized
// matrix. embedBatch is injected (openrouter.EmbeddingBatch) so callers without
// LLM access can pass a stub. Returns nil index + error on embed failure.
func BuildIntentIndex(intents map[string]chatconfig.Intent, tuning chatconfig.IntentTuning, embedBatch func([]string) ([][]float32, error)) (*IntentIndex, error) {
	var texts []string
	var labels []string
	canned := map[string]map[string]string{}
	// deterministic category order
	cats := make([]string, 0, len(intents))
	for c := range intents {
		cats = append(cats, c)
	}
	sort.Strings(cats)
	for _, c := range cats {
		canned[c] = intents[c].Responses
		for _, ex := range intents[c].Examples {
			texts = append(texts, ex)
			labels = append(labels, c)
		}
	}
	idx := &IntentIndex{labels: labels, tuning: tuning, canned: canned}
	if len(texts) == 0 {
		return idx, nil
	}
	vecs, err := embedBatch(texts)
	if err != nil {
		return nil, err
	}
	idx.matrix = make([][]float32, len(vecs))
	for i, v := range vecs {
		idx.matrix[i] = utils.NormalizeEmbedding(utils.TruncateEmbedding(v))
	}
	return idx, nil
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/services/ -run IntentIndex -v`
Expected: PASS (all four).

- [ ] **Step 5: Commit**

```bash
cd backend
git add internal/services/intent_index.go internal/services/intent_index_test.go
git commit -m "feat(chat): add intent vector index (cosine + soft-zone voting)"
```

---

### Task 4: IntentRouterService — orchestration + LLM fallback

**Files:**
- Create: `backend/internal/services/intent_router_service.go`
- Create: `backend/internal/services/intent_router_service_test.go`

**Interfaces:**
- Consumes: `RegexIntent` (Task 1), `IntentIndex`/`BuildIntentIndex` (Task 3), `openrouter` client (Task 2 + Plan 1 `StreamAnswer`/chat), `chatconfig`.
- Produces:
  - `services.IntentResult{ Type, CannedResponse string; LLMInputTokens, LLMOutputTokens, EmbedTokens int; Source string }`.
  - `services.IntentRouterService` with `idx *IntentIndex`, `embedOne func(string)([]float32,error)`, `classifyLLM func(prompt string)(string,int,int,error)` (injectable for tests), `tuning chatconfig.IntentTuning`.
  - `services.NewIntentRouterService() *IntentRouterService` — loads tuning + intents via `chatconfig` (honoring `CHAT_CONFIG_DIR`), builds the index via `openrouter.NewClient().EmbeddingBatch`; on build failure logs + leaves `idx` nil (regex + LLM tiers still work). Wires `embedOne`/`classifyLLM` to the openrouter client.
  - `(s *IntentRouterService) Classify(message, lang string, haveHistory bool) IntentResult` — regex → vector → LLM, per Global Constraints.
  - Helper `services.ParseIntentWord(raw string) string` — pure: split on `[\s\n.,!?\-]+`, uppercase, first token in the keyword set → lowercase; "" if none.
  - Helper `services.BuildIntentPrompt(message string, haveHistory bool, vecBestIntent string, vecBestScore float64, softZoneMin float64) string` — pure: assembles the verbatim prompt with hint/context substitutions.

- [ ] **Step 1: Write the failing tests (pure helpers + injected orchestration)**

Create `backend/internal/services/intent_router_service_test.go`:

```go
package services

import (
	"strings"
	"testing"

	"github.com/new-carmen/backend/internal/chatconfig"
	"github.com/new-carmen/backend/internal/utils"
)

func TestParseIntentWord(t *testing.T) {
	cases := map[string]string{
		"GREETING":            "greeting",
		"  thanks  ":          "thanks",
		"The answer is TECH_SUPPORT.": "tech_support",
		"banana":              "",
		"":                    "",
	}
	for in, want := range cases {
		if got := ParseIntentWord(in); got != want {
			t.Errorf("ParseIntentWord(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestBuildIntentPrompt_HintAndContext(t *testing.T) {
	p := BuildIntentPrompt("where is your office?", false, "company_info", 0.80, 0.75)
	if !strings.Contains(p, "Semantic hint") || !strings.Contains(p, "COMPANY_INFO") {
		t.Errorf("expected vector hint in prompt:\n%s", p)
	}
	if !strings.Contains(p, "OUT_OF_SCOPE") { // no-history context instruction mentions OUT_OF_SCOPE
		t.Errorf("expected no-history context instruction")
	}
	p2 := BuildIntentPrompt("x", false, "greeting", 0.50, 0.75) // below soft zone → no hint
	if strings.Contains(p2, "Semantic hint") {
		t.Errorf("did not expect hint below soft zone")
	}
}

func TestClassify_RegexTierWins(t *testing.T) {
	s := &IntentRouterService{tuning: intentTuning()}
	r := s.Classify("สวัสดีครับ", "th", false)
	if r.Type != "greeting" || r.Source != "regex" {
		t.Errorf("regex tier = %+v", r)
	}
}

func TestClassify_VectorHardTier(t *testing.T) {
	s := &IntentRouterService{
		tuning: intentTuning(),
		idx: &IntentIndex{
			matrix: [][]float32{unit(1, 0)},
			labels: []string{"thanks"},
			tuning: intentTuning(),
			canned: map[string]map[string]string{"thanks": {"th": "ยินดีค่ะ"}},
		},
		embedOne: func(string) ([]float32, error) { return unit(1, 0), nil },
	}
	r := s.Classify("appreciate the help mate", "th", false)
	if r.Type != "thanks" || r.Source != "vector_hard" || r.CannedResponse != "ยินดีค่ะ" {
		t.Errorf("vector hard tier = %+v", r)
	}
}

func TestClassify_LLMFallback(t *testing.T) {
	s := &IntentRouterService{
		tuning:   intentTuning(),
		idx:      nil, // no vector tier → straight to LLM
		classifyLLM: func(prompt string) (string, int, int, error) {
			return "COMPANY_INFO", 11, 1, nil
		},
	}
	r := s.Classify("what's your phone number?", "th", false)
	if r.Type != "company_info" || r.Source != "llm" || r.LLMInputTokens != 11 {
		t.Errorf("llm fallback = %+v", r)
	}
}

func TestClassify_LLMErrorDefaultsTechSupport(t *testing.T) {
	s := &IntentRouterService{
		tuning:      intentTuning(),
		classifyLLM: func(string) (string, int, int, error) { return "", 0, 0, errStub },
	}
	r := s.Classify("some ambiguous thing xyz", "th", false)
	if r.Type != "tech_support" || r.Source != "fallback" {
		t.Errorf("llm error = %+v", r)
	}
}

var errStub = stubErr("stub")

type stubErr string

func (e stubErr) Error() string { return string(e) }

var _ = utils.NormalizeEmbedding // keep utils imported if unused above
var _ = chatconfig.IntentTuning{}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/services/ -run 'ParseIntentWord|BuildIntentPrompt|Classify' -v`
Expected: FAIL — undefined symbols.

- [ ] **Step 3: Write the implementation**

Create `backend/internal/services/intent_router_service.go`:

```go
package services

import (
	"fmt"
	"log"
	"regexp"
	"strings"

	"github.com/new-carmen/backend/internal/chatconfig"
	"github.com/new-carmen/backend/internal/utils"
	"github.com/new-carmen/backend/pkg/openrouter"
)

type IntentResult struct {
	Type            string
	CannedResponse  string
	LLMInputTokens  int
	LLMOutputTokens int
	EmbedTokens     int
	Source          string
}

type IntentRouterService struct {
	idx         *IntentIndex
	tuning      chatconfig.IntentTuning
	embedOne    func(string) ([]float32, error)
	classifyLLM func(prompt string) (intent string, inTok, outTok int, err error)
}

var intentKeywords = []string{"GREETING", "THANKS", "COMPANY_INFO", "CAPABILITIES", "OUT_OF_SCOPE", "CONFUSION", "TECH_SUPPORT"}
var intentSplit = regexp.MustCompile(`[\s\n.,!?\-]+`)

// ParseIntentWord extracts the first recognized category word from an LLM reply.
func ParseIntentWord(raw string) string {
	for _, w := range intentSplit.Split(strings.ToUpper(strings.TrimSpace(raw)), -1) {
		for _, kw := range intentKeywords {
			if w == kw {
				return strings.ToLower(kw)
			}
		}
	}
	return ""
}

// BuildIntentPrompt assembles the verbatim LLM classification prompt.
func BuildIntentPrompt(message string, haveHistory bool, vecBestIntent string, vecBestScore, softZoneMin float64) string {
	ctx := "Treat ambiguous or confused messages (งง, huh?) without context as OUT_OF_SCOPE."
	if haveHistory {
		ctx = "NOTE: An ongoing conversation exists. Classify based on the query itself — COMPANY_INFO still applies for contact/address questions regardless of history. Use TECH_SUPPORT for ambiguous/confused messages when history is present."
	}
	hint := ""
	if vecBestScore >= softZoneMin && vecBestIntent != "" {
		hint = fmt.Sprintf("\n[Semantic hint: vector analysis suggests %s (score=%.2f) — confirm or override if clearly wrong.]",
			strings.ToUpper(vecBestIntent), vecBestScore)
	}
	return fmt.Sprintf(`Classify this user query for a hotel accounting software support chatbot.
Reply with ONE WORD only — the category name.

Categories:
- GREETING    : casual hello/greeting  (สวัสดี / hello / hi / good morning)
- THANKS      : appreciation or done   (ขอบคุณ / thank you / great / awesome)
- COMPANY_INFO: contact info, address, phone, email, Line ID, website, or how to reach support/sales/team
- CAPABILITIES: asking what the AI assistant can do  (ทำอะไรได้บ้าง / what can you help with)
- OUT_OF_SCOPE: completely unrelated topics — weather, food, news, sports, jokes, general chat
- CONFUSION   : vague/meaningless message with no specific topic  (งง / อะไรนะ / huh? / ???)
- TECH_SUPPORT: system how-to, troubleshooting, feature usage — DEFAULT for any software question
%s
Query: "%s"
%s

ONE word:`, hint, utils.SanitizeForPrompt(message), ctx)
}

func NewIntentRouterService() *IntentRouterService {
	dir := configDir() // from retrieval_service.go (CHAT_CONFIG_DIR aware)
	tuning := chatconfig.IntentTuning{DefaultThreshold: 0.90, SoftZoneMin: 0.75, SoftZoneVotes: 2,
		CategoryThresholds: map[string]float64{"greeting": 0.90, "thanks": 0.90, "company_info": 0.82, "capabilities": 0.88, "out_of_scope": 0.88, "confusion": 0.92}}
	if t, err := chatconfig.LoadTuning(dir); err == nil {
		tuning = t.Intent
	} else {
		log.Printf("[intent] tuning load failed, using defaults: %v", err)
	}
	client := openrouter.NewClient()
	s := &IntentRouterService{
		tuning:   tuning,
		embedOne: client.Embedding,
		classifyLLM: func(prompt string) (string, int, int, error) {
			raw, in, out, err := client.ClassifyIntent(prompt) // see Task note below
			if err != nil {
				return "", 0, 0, err
			}
			return raw, in, out, nil
		},
	}
	if intents, err := chatconfig.LoadIntents(dir); err != nil {
		log.Printf("[intent] intents load failed: %v", err)
	} else if idx, err := BuildIntentIndex(intents, tuning, client.EmbeddingBatch); err != nil {
		log.Printf("[intent] index build failed (regex+LLM only): %v", err)
	} else {
		s.idx = idx
	}
	return s
}

func (s *IntentRouterService) Classify(message, lang string, haveHistory bool) IntentResult {
	// Tier 1 — regex
	if intent, ok := RegexIntent(message, haveHistory); ok {
		return IntentResult{Type: intent, CannedResponse: s.canned(intent, lang), Source: "regex"}
	}

	// Tier 2 — vector
	var vecBestIntent string
	var vecBestScore float64
	embedTokens := 0
	if s.idx != nil && s.embedOne != nil {
		if emb, err := s.embedOne(message); err == nil {
			if m, ok := s.idx.Match(emb, haveHistory); ok {
				return IntentResult{Type: m.Intent, CannedResponse: s.canned(m.Intent, lang), EmbedTokens: embedTokens, Source: m.Source}
			}
			// capture best for the LLM hint even when it didn't fire
			if bi, bs := s.idx.best(emb); bs > 0 {
				vecBestIntent, vecBestScore = bi, bs
			}
		} else {
			log.Printf("[intent] embed failed, skipping vector tier: %v", err)
		}
	}

	// Tier 3 — LLM fallback
	if s.classifyLLM == nil {
		return IntentResult{Type: "tech_support", Source: "fallback", EmbedTokens: embedTokens}
	}
	prompt := BuildIntentPrompt(message, haveHistory, vecBestIntent, vecBestScore, s.tuning.SoftZoneMin)
	raw, inTok, outTok, err := s.classifyLLM(prompt)
	if err != nil {
		log.Printf("[intent] LLM fallback failed: %v", err)
		return IntentResult{Type: "tech_support", Source: "fallback", EmbedTokens: embedTokens}
	}
	intent := ParseIntentWord(raw)
	if intent == "" {
		return IntentResult{Type: "tech_support", LLMInputTokens: inTok, LLMOutputTokens: outTok, EmbedTokens: embedTokens, Source: "llm"}
	}
	return IntentResult{Type: intent, CannedResponse: s.canned(intent, lang), LLMInputTokens: inTok, LLMOutputTokens: outTok, EmbedTokens: embedTokens, Source: "llm"}
}

func (s *IntentRouterService) canned(intent, lang string) string {
	if s.idx != nil {
		return s.idx.Canned(intent, lang)
	}
	return ""
}
```

Add to `intent_index.go` a small helper used above:

```go
// best returns the top label/score for the LLM hint (no decisioning).
func (idx *IntentIndex) best(queryEmb []float32) (string, float64) {
	if len(idx.matrix) == 0 {
		return "", 0
	}
	q := utils.NormalizeEmbedding(queryEmb)
	bestLabel, bestScore := "", -1.0
	for i, row := range idx.matrix {
		if sc := dot(row, q); sc > bestScore {
			bestScore, bestLabel = sc, idx.labels[i]
		}
	}
	return bestLabel, bestScore
}
```

> **Implementer notes:**
> 1. `utils.SanitizeForPrompt` and `client.ClassifyIntent` may not exist yet. For `SanitizeForPrompt`, if Plan-1/earlier code has no prompt sanitizer, add a minimal one in `utils` that strips the XML-ish tags `</?(user_input|context|history|chat_history|manual|system_instruction)[^>]*>` (matching Python `sanitize_input`) — or inline it. For `ClassifyIntent`, add a thin method on the openrouter client that calls `/chat/completions` with `IntentModel`, temperature 0, max_tokens 20, returning `(content, inTok, outTok, error)` — model from `config.AppConfig.LLM.IntentModel`. Keep these additions minimal and covered by a small test or the gated integration test. If you prefer, inject `classifyLLM`/`embedOne` only and keep the client methods test-light.
> 2. The pure tests above must pass WITHOUT network: they construct `IntentRouterService` literals with injected `idx`/`embedOne`/`classifyLLM`. Only `NewIntentRouterService` touches the network.

- [ ] **Step 4: Run tests + build**

Run: `cd backend && go test ./internal/services/ -run 'ParseIntentWord|BuildIntentPrompt|Classify' -v && go build ./... && go test ./...`
Expected: pure tests PASS; build clean; full suite green.

- [ ] **Step 5: Commit**

```bash
cd backend
git add internal/services/intent_router_service.go internal/services/intent_index.go internal/services/intent_router_service_test.go pkg/openrouter/ internal/utils/
git commit -m "feat(chat): add intent router service (regex -> vector -> LLM)"
```

---

### Task 5: Admin intent-test endpoint + labeled-intent parity harness

**Files:**
- Modify: `backend/internal/api/chat_handler.go` (add `intentRouter *services.IntentRouterService` field + init; add `IntentTest` handler)
- Modify: `backend/internal/router/chat_routes.go` (register `POST /api/chat/intent-test` behind `RequireAdminKey`)
- Create: `backend/tests/parity/intent_set.json`
- Create: `backend/tests/parity/intent_harness_test.go`

**Interfaces:**
- Consumes: `services.NewIntentRouterService`, `services.IntentResult`.
- Produces:
  - `POST /api/chat/intent-test` (admin) — body `{ "message": "...", "lang": "th", "have_history": false }` → JSON `{ "type": ..., "source": ..., "canned_response": ..., "embed_tokens": ..., "llm_input_tokens": ..., "llm_output_tokens": ... }`.
  - DB/LLM-gated `TestIntentLabeledSet` reading `intent_set.json` (`[{message, have_history, expected}]`), asserting `Classify(...).Type == expected` for the regex-tier entries (always run, no network) and, when `RUN_DB_TESTS=1`, the full set.

- [ ] **Step 1: Add the labeled set (regex-tier entries run offline)**

Create `backend/tests/parity/intent_set.json`:

```json
[
  { "message": "สวัสดีครับ", "have_history": false, "expected": "greeting", "tier": "regex" },
  { "message": "thank you", "have_history": false, "expected": "thanks", "tier": "regex" },
  { "message": "ทำอะไรได้บ้าง", "have_history": false, "expected": "capabilities", "tier": "regex" },
  { "message": "งง", "have_history": false, "expected": "confusion", "tier": "regex" },
  { "message": "how do I create an AP invoice?", "have_history": false, "expected": "tech_support", "tier": "vector_or_llm" }
]
```

- [ ] **Step 2: Write the harness test**

Create `backend/tests/parity/intent_harness_test.go`:

```go
package parity

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/new-carmen/backend/internal/services"
)

type intentEntry struct {
	Message     string `json:"message"`
	HaveHistory bool   `json:"have_history"`
	Expected    string `json:"expected"`
	Tier        string `json:"tier"`
}

func TestIntentLabeledSet(t *testing.T) {
	raw, err := os.ReadFile("intent_set.json")
	if err != nil {
		t.Fatalf("read intent_set.json: %v", err)
	}
	var entries []intentEntry
	if err := json.Unmarshal(raw, &entries); err != nil {
		t.Fatalf("parse: %v", err)
	}
	full := os.Getenv("RUN_DB_TESTS") == "1"
	if full {
		t.Setenv("CHAT_CONFIG_DIR", "../../config")
	}
	for _, e := range entries {
		e := e
		t.Run(e.Message, func(t *testing.T) {
			if e.Tier != "regex" && !full {
				t.Skip("set RUN_DB_TESTS=1 to exercise vector/LLM tiers")
			}
			var got services.IntentResult
			if e.Tier == "regex" {
				// Regex tier needs no network: a bare service still runs RegexIntent.
				s := &services.IntentRouterService{}
				_ = s // RegexIntent is exercised directly below to avoid network
				if intent, ok := services.RegexIntent(e.Message, e.HaveHistory); ok {
					got = services.IntentResult{Type: intent, Source: "regex"}
				}
			} else {
				got = services.NewIntentRouterService().Classify(e.Message, "th", e.HaveHistory)
			}
			if got.Type != e.Expected {
				t.Errorf("Classify(%q) = %q, want %q", e.Message, got.Type, e.Expected)
			}
		})
	}
}
```

> Note: the regex-tier rows assert via the exported `RegexIntent` (no network), so they run in the offline suite. The non-regex rows skip unless `RUN_DB_TESTS=1`. If `IntentRouterService` has unexported-only construction that blocks the `&services.IntentRouterService{}` literal, drop that literal — the regex rows already use `services.RegexIntent` directly.

- [ ] **Step 3: Wire the admin endpoint**

In `chat_handler.go` add the field + init and the handler:

```go
// struct field:
intentRouter *services.IntentRouterService
// in NewChatHandler():
intentRouter: services.NewIntentRouterService(),

// handler:
func (h *ChatHandler) IntentTest(c *fiber.Ctx) error {
	var req struct {
		Message     string `json:"message"`
		Lang        string `json:"lang"`
		HaveHistory bool   `json:"have_history"`
	}
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Message) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "message is required"})
	}
	if req.Lang == "" {
		req.Lang = "th"
	}
	r := h.intentRouter.Classify(req.Message, req.Lang, req.HaveHistory)
	return c.JSON(fiber.Map{
		"type": r.Type, "source": r.Source, "canned_response": r.CannedResponse,
		"embed_tokens": r.EmbedTokens, "llm_input_tokens": r.LLMInputTokens, "llm_output_tokens": r.LLMOutputTokens,
	})
}
```

In `chat_routes.go`, register after the existing `route-test` line:

```go
app.Post("/api/chat/intent-test", middleware.RequireAdminKey, chatHandler.IntentTest)
```

- [ ] **Step 4: Run tests + build**

Run: `cd backend && go test ./tests/parity/ -run IntentLabeledSet -v && go build ./... && go test ./...`
Expected: regex-tier sub-tests PASS, vector/LLM rows SKIP offline; build clean; full suite green. With `RUN_DB_TESTS=1` (+ LLM key + reachable embeddings), the full set runs.

- [ ] **Step 5: Commit**

```bash
cd backend
git add internal/api/chat_handler.go internal/router/chat_routes.go tests/parity/intent_set.json tests/parity/intent_harness_test.go
git commit -m "feat(chat): add admin intent-test endpoint + labeled-intent harness"
```

---

## Self-Review

**Spec coverage:** 3-tier router → Tasks 1 (regex), 3 (vector+soft-zone), 4 (LLM fallback orchestration); intents.yaml/thresholds from `chatconfig` → Tasks 3/4; batch embedding → Task 2; quick-reply canned responses → Tasks 3/4 (`Canned`); verbatim LLM prompt + one-word parse → Task 4 (`BuildIntentPrompt`/`ParseIntentWord`); observability + parity check → Task 5.

**Placeholder scan:** No TBD/TODO. Implementer notes in Task 4 are concrete (add `ClassifyIntent` client method + `SanitizeForPrompt` minimal util, or inject) — not placeholders; the pure tests pin the contract regardless.

**Type consistency:** `IntentResult`, `IntentMatch`, `IntentIndex`, `IntentRouterService`, `RegexIntent`, `BuildIntentIndex`, `ParseIntentWord`, `BuildIntentPrompt`, `Match`, `best`, `Canned`, `EmbeddingBatch` consistent across tasks/tests. `chatconfig.IntentTuning` fields match Plan 1. `configDir()` reused from `retrieval_service.go` (Plan 2).

**Known executor checks:** confirm `utils.SanitizeForPrompt` exists or add the minimal tag-stripper; add `openrouter.ClassifyIntent` (intent model, temp 0, max_tokens 20) or inject `classifyLLM`; ensure the `services` test helpers `unit`/`intentTuning` (defined in Task 3 test) are available to Task 4 tests in the same package (they are — same `services` test package).
```

