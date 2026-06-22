# Chatbot Go Migration — Plan 1: Foundation & Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the reusable, fully unit-tested primitives that later chatbot-migration plans depend on — YAML config loading, SSE LLM streaming, Thai-language detection, and Reciprocal Rank Fusion — without changing any live endpoint.

**Architecture:** Pure library code added to the existing Go Fiber `backend/`. Each primitive lands in its own focused file with inline `_test.go` tests. No HTTP route changes; no behavior change to `/api/chat/*`. This is the dependency base for Plans 2–5.

**Tech Stack:** Go 1.25, `gopkg.in/yaml.v3` (promote to direct dep; already in `go.sum`), standard library `net/http`/`bufio` for SSE, existing `pkg/openrouter` client.

## Global Constraints

- Go module: `github.com/new-carmen/backend`. Run all commands from `backend/`.
- Config values come from YAML, never hardcoded in logic. Verbatim constants Go must read from `tuning.yaml`:
  - `intent`: default_threshold=0.90, soft_zone_min=0.75, soft_zone_votes=2, mtime_check_interval=30, category_thresholds={greeting:0.90, thanks:0.90, company_info:0.82, capabilities:0.88, out_of_scope:0.88, confusion:0.92}
  - `retrieval`: top_k=4, max_distance=0.45, fetch_k=20, rrf_k=60, path_boost_rrf=0.02
  - `history`: context_limit=4, memory_limit=20
  - `llm`: temperature=0.82
- Thai detection threshold: a string is "Thai" when Thai runes (U+0E00–U+0E7F) are ≥ 15% of non-whitespace runes.
- RRF formula: `score[key] += 1/(k + rank)`, ranks are **1-indexed**, default `k=60`.
- Tests are inline (`<file>_test.go` in the same package) so unexported helpers are reachable. Run with `go test ./...`.
- Do NOT modify `internal/utils/vector.go` in this plan — the embedding-dimension reconciliation (Go default 2000 vs Python 1536) is a separate decision that blocks Plan 2, not Plan 1.

---

### Task 1: Chat config loader (`chatconfig`)

**Files:**
- Create: `backend/config/tuning.yaml`, `backend/config/intents.yaml`, `backend/config/path_rules.yaml`, `backend/config/prompts.yaml` (copied from `carmen-chatbot/backend/config/`)
- Create: `backend/internal/chatconfig/loader.go`
- Create: `backend/internal/chatconfig/loader_test.go`
- Modify: `backend/go.mod` (promote `gopkg.in/yaml.v3` to a direct require)

**Interfaces:**
- Produces:
  - `chatconfig.Tuning` struct with `Intent IntentTuning`, `Retrieval RetrievalTuning`, `History HistoryTuning`, `LLM LLMTuning`
  - `chatconfig.IntentTuning{ DefaultThreshold float64; SoftZoneMin float64; SoftZoneVotes int; MtimeCheckInterval int; CategoryThresholds map[string]float64 }`
  - `chatconfig.RetrievalTuning{ TopK int; MaxDistance float64; FetchK int; RRFK int; PathBoostRRF float64 }` (yaml keys `top_k`,`max_distance`,`fetch_k`,`rrf_k`,`path_boost_rrf`)
  - `chatconfig.HistoryTuning{ ContextLimit int; MemoryLimit int }`
  - `chatconfig.LLMTuning{ Temperature float64 }`
  - `chatconfig.Intent{ Responses map[string]string; Examples []string }`
  - `chatconfig.PathRule{ Keywords []string; Patterns []string }`
  - `chatconfig.Prompts{ BasePrompt, TranslatePrompt, RewritePrompt string }` (yaml keys `BASE_PROMPT`,`TRANSLATE_PROMPT`,`REWRITE_PROMPT`)
  - `chatconfig.LoadTuning(dir string) (*Tuning, error)`
  - `chatconfig.LoadIntents(dir string) (map[string]Intent, error)`
  - `chatconfig.LoadPathRules(dir string) ([]PathRule, error)`
  - `chatconfig.LoadPrompts(dir string) (*Prompts, error)`
  - `chatconfig.DefaultDir() string` → returns `"config"` (relative to the backend working dir)

- [ ] **Step 1: Copy the four YAML files and add the dependency**

```bash
cd backend
mkdir -p config
cp ../carmen-chatbot/backend/config/tuning.yaml      config/tuning.yaml
cp ../carmen-chatbot/backend/config/intents.yaml     config/intents.yaml
cp ../carmen-chatbot/backend/config/path_rules.yaml  config/path_rules.yaml
cp ../carmen-chatbot/backend/config/prompts.yaml     config/prompts.yaml
go get gopkg.in/yaml.v3@v3.0.1
```

Expected: `config/` now holds four files; `go.mod` lists `gopkg.in/yaml.v3 v3.0.1` as a direct require (no `// indirect`).

- [ ] **Step 2: Write the failing test**

Create `backend/internal/chatconfig/loader_test.go`:

```go
package chatconfig

import "testing"

func dir(t *testing.T) string {
	t.Helper()
	return "../../config" // tests run from package dir; repo backend/config
}

func TestLoadTuning_Constants(t *testing.T) {
	tn, err := LoadTuning(dir(t))
	if err != nil {
		t.Fatalf("LoadTuning: %v", err)
	}
	if tn.Intent.DefaultThreshold != 0.90 {
		t.Errorf("DefaultThreshold = %v, want 0.90", tn.Intent.DefaultThreshold)
	}
	if tn.Intent.SoftZoneMin != 0.75 || tn.Intent.SoftZoneVotes != 2 {
		t.Errorf("soft zone = (%v,%v), want (0.75,2)", tn.Intent.SoftZoneMin, tn.Intent.SoftZoneVotes)
	}
	if got := tn.Intent.CategoryThresholds["company_info"]; got != 0.82 {
		t.Errorf("company_info threshold = %v, want 0.82", got)
	}
	if tn.Retrieval.TopK != 4 || tn.Retrieval.FetchK != 20 || tn.Retrieval.RRFK != 60 {
		t.Errorf("retrieval = %+v, want top_k4 fetch20 rrf60", tn.Retrieval)
	}
	if tn.Retrieval.MaxDistance != 0.45 || tn.Retrieval.PathBoostRRF != 0.02 {
		t.Errorf("retrieval floats = %+v", tn.Retrieval)
	}
	if tn.History.ContextLimit != 4 || tn.History.MemoryLimit != 20 {
		t.Errorf("history = %+v, want 4/20", tn.History)
	}
	if tn.LLM.Temperature != 0.82 {
		t.Errorf("temperature = %v, want 0.82", tn.LLM.Temperature)
	}
}

func TestLoadIntents_Greeting(t *testing.T) {
	intents, err := LoadIntents(dir(t))
	if err != nil {
		t.Fatalf("LoadIntents: %v", err)
	}
	g, ok := intents["greeting"]
	if !ok {
		t.Fatal("greeting intent missing")
	}
	if g.Responses["th"] == "" || g.Responses["en"] == "" {
		t.Errorf("greeting responses incomplete: %+v", g.Responses)
	}
	if len(g.Examples) == 0 {
		t.Error("greeting examples empty")
	}
}

func TestLoadPathRules_NonEmpty(t *testing.T) {
	rules, err := LoadPathRules(dir(t))
	if err != nil {
		t.Fatalf("LoadPathRules: %v", err)
	}
	if len(rules) == 0 {
		t.Fatal("no path rules loaded")
	}
	if len(rules[0].Keywords) == 0 || len(rules[0].Patterns) == 0 {
		t.Errorf("first rule malformed: %+v", rules[0])
	}
}

func TestLoadPrompts_Keys(t *testing.T) {
	p, err := LoadPrompts(dir(t))
	if err != nil {
		t.Fatalf("LoadPrompts: %v", err)
	}
	if p.BasePrompt == "" || p.TranslatePrompt == "" || p.RewritePrompt == "" {
		t.Errorf("prompts incomplete: base=%d translate=%d rewrite=%d",
			len(p.BasePrompt), len(p.TranslatePrompt), len(p.RewritePrompt))
	}
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && go test ./internal/chatconfig/ -v`
Expected: FAIL — build error, `LoadTuning`/types undefined.

- [ ] **Step 4: Write the loader implementation**

Create `backend/internal/chatconfig/loader.go`:

```go
// Package chatconfig loads the YAML tuning/intents/path-rules/prompts files
// that drive the native Go chatbot. Values are read from YAML, never hardcoded,
// to preserve parity with the original Python service.
package chatconfig

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type Tuning struct {
	Intent    IntentTuning    `yaml:"intent"`
	Retrieval RetrievalTuning `yaml:"retrieval"`
	History   HistoryTuning   `yaml:"history"`
	LLM       LLMTuning       `yaml:"llm"`
}

type IntentTuning struct {
	DefaultThreshold   float64            `yaml:"default_threshold"`
	SoftZoneMin        float64            `yaml:"soft_zone_min"`
	SoftZoneVotes      int                `yaml:"soft_zone_votes"`
	MtimeCheckInterval int                `yaml:"mtime_check_interval"`
	CategoryThresholds map[string]float64 `yaml:"category_thresholds"`
}

type RetrievalTuning struct {
	TopK         int     `yaml:"top_k"`
	MaxDistance  float64 `yaml:"max_distance"`
	FetchK       int     `yaml:"fetch_k"`
	RRFK         int     `yaml:"rrf_k"`
	PathBoostRRF float64 `yaml:"path_boost_rrf"`
}

type HistoryTuning struct {
	ContextLimit int `yaml:"context_limit"`
	MemoryLimit  int `yaml:"memory_limit"`
}

type LLMTuning struct {
	Temperature float64 `yaml:"temperature"`
}

type Intent struct {
	Responses map[string]string `yaml:"responses"`
	Examples  []string          `yaml:"examples"`
}

type PathRule struct {
	Keywords []string `yaml:"keywords"`
	Patterns []string `yaml:"patterns"`
}

type Prompts struct {
	BasePrompt      string `yaml:"BASE_PROMPT"`
	TranslatePrompt string `yaml:"TRANSLATE_PROMPT"`
	RewritePrompt   string `yaml:"REWRITE_PROMPT"`
}

// DefaultDir is the config directory relative to the backend working directory.
func DefaultDir() string { return "config" }

func readYAML(dir, name string, out any) error {
	path := filepath.Join(dir, name)
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read %s: %w", path, err)
	}
	if err := yaml.Unmarshal(data, out); err != nil {
		return fmt.Errorf("parse %s: %w", path, err)
	}
	return nil
}

func LoadTuning(dir string) (*Tuning, error) {
	var t Tuning
	if err := readYAML(dir, "tuning.yaml", &t); err != nil {
		return nil, err
	}
	return &t, nil
}

func LoadIntents(dir string) (map[string]Intent, error) {
	out := map[string]Intent{}
	if err := readYAML(dir, "intents.yaml", &out); err != nil {
		return nil, err
	}
	return out, nil
}

func LoadPathRules(dir string) ([]PathRule, error) {
	var rules []PathRule
	if err := readYAML(dir, "path_rules.yaml", &rules); err != nil {
		return nil, err
	}
	return rules, nil
}

func LoadPrompts(dir string) (*Prompts, error) {
	var p Prompts
	if err := readYAML(dir, "prompts.yaml", &p); err != nil {
		return nil, err
	}
	return &p, nil
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && go test ./internal/chatconfig/ -v`
Expected: PASS (all four tests). If `intents.yaml` is a nested map under a top key rather than a flat map, adjust `LoadIntents` to match the real file shape and re-run.

- [ ] **Step 6: Commit**

```bash
cd backend
git add config/ internal/chatconfig/ go.mod go.sum
git commit -m "feat(chat): add chatconfig YAML loader for tuning/intents/path_rules/prompts"
```

---

### Task 2: Thai-language detection (`utils.IsThai`)

**Files:**
- Create: `backend/internal/utils/lang.go`
- Create: `backend/internal/utils/lang_test.go`

**Interfaces:**
- Produces:
  - `utils.ThaiRatio(s string) float64` — fraction of non-whitespace runes in U+0E00–U+0E7F (0.0 when no non-whitespace runes)
  - `utils.IsThai(s string) bool` — `ThaiRatio(s) >= 0.15`

- [ ] **Step 1: Write the failing test**

Create `backend/internal/utils/lang_test.go`:

```go
package utils

import (
	"math"
	"testing"
)

func TestThaiRatio(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want float64
	}{
		{"pure thai", "สวัสดีครับ", 1.0},
		{"pure english", "hello world", 0.0},
		{"empty", "", 0.0},
		{"whitespace only", "   \n\t", 0.0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := ThaiRatio(c.in)
			if math.Abs(got-c.want) > 1e-9 {
				t.Errorf("ThaiRatio(%q) = %v, want %v", c.in, got, c.want)
			}
		})
	}
}

func TestIsThai_Boundary(t *testing.T) {
	// 2 Thai runes out of 10 non-whitespace runes = 0.20 >= 0.15 → Thai
	if !IsThai("กขabcdefgh") {
		t.Error("expected 0.20 ratio to be Thai")
	}
	// 1 Thai rune out of 10 = 0.10 < 0.15 → not Thai
	if IsThai("กabcdefghi") {
		t.Error("expected 0.10 ratio to be non-Thai")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/utils/ -run 'Thai|IsThai' -v`
Expected: FAIL — `ThaiRatio`/`IsThai` undefined.

- [ ] **Step 3: Write the implementation**

Create `backend/internal/utils/lang.go`:

```go
package utils

import "unicode"

// ThaiRatio returns the fraction of non-whitespace runes that fall in the Thai
// Unicode block (U+0E00–U+0E7F). Returns 0 when there are no non-whitespace runes.
func ThaiRatio(s string) float64 {
	var total, thai int
	for _, r := range s {
		if unicode.IsSpace(r) {
			continue
		}
		total++
		if r >= 0x0E00 && r <= 0x0E7F {
			thai++
		}
	}
	if total == 0 {
		return 0
	}
	return float64(thai) / float64(total)
}

// IsThai reports whether the text is predominantly Thai (≥15% Thai runes).
// Used to skip PostgreSQL 'simple' FTS, which cannot tokenize Thai.
func IsThai(s string) bool {
	return ThaiRatio(s) >= 0.15
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/utils/ -run 'Thai|IsThai' -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd backend
git add internal/utils/lang.go internal/utils/lang_test.go
git commit -m "feat(chat): add Thai-language detection util"
```

---

### Task 3: Reciprocal Rank Fusion (`utils.FuseRRF`)

**Files:**
- Create: `backend/internal/utils/rrf.go`
- Create: `backend/internal/utils/rrf_test.go`

**Interfaces:**
- Produces:
  - `utils.FuseRRF(rankedLists [][]string, k int) map[string]float64` — each inner slice is keys in rank order (index 0 = rank 1). Accumulates `1/(k+rank)` per key across all lists. (This supersedes the `Ranked` struct sketch in the outline — ordered string slices are simpler and rank is implicit by position.)

- [ ] **Step 1: Write the failing test**

Create `backend/internal/utils/rrf_test.go`:

```go
package utils

import (
	"math"
	"testing"
)

func approx(a, b float64) bool { return math.Abs(a-b) < 1e-9 }

func TestFuseRRF_SingleList(t *testing.T) {
	// k=60: rank1 → 1/61, rank2 → 1/62
	got := FuseRRF([][]string{{"a", "b"}}, 60)
	if !approx(got["a"], 1.0/61) {
		t.Errorf("a = %v, want %v", got["a"], 1.0/61)
	}
	if !approx(got["b"], 1.0/62) {
		t.Errorf("b = %v, want %v", got["b"], 1.0/62)
	}
}

func TestFuseRRF_TwoListsAccumulate(t *testing.T) {
	// "a" is rank1 in list1 (1/61) and rank2 in list2 (1/62) → sum
	got := FuseRRF([][]string{{"a", "b"}, {"c", "a"}}, 60)
	want := 1.0/61 + 1.0/62
	if !approx(got["a"], want) {
		t.Errorf("a = %v, want %v", got["a"], want)
	}
	if !approx(got["c"], 1.0/61) {
		t.Errorf("c = %v, want %v", got["c"], 1.0/61)
	}
}

func TestFuseRRF_Empty(t *testing.T) {
	got := FuseRRF(nil, 60)
	if len(got) != 0 {
		t.Errorf("expected empty map, got %v", got)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/utils/ -run FuseRRF -v`
Expected: FAIL — `FuseRRF` undefined.

- [ ] **Step 3: Write the implementation**

Create `backend/internal/utils/rrf.go`:

```go
package utils

// FuseRRF merges several ranked lists using Reciprocal Rank Fusion.
// Each inner slice holds keys in descending relevance (index 0 = rank 1).
// The fused score for a key is the sum over all lists of 1/(k + rank),
// with ranks 1-indexed. k smooths the contribution of low ranks (default 60).
func FuseRRF(rankedLists [][]string, k int) map[string]float64 {
	scores := make(map[string]float64)
	for _, list := range rankedLists {
		for i, key := range list {
			rank := i + 1
			scores[key] += 1.0 / float64(k+rank)
		}
	}
	return scores
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/utils/ -run FuseRRF -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd backend
git add internal/utils/rrf.go internal/utils/rrf_test.go
git commit -m "feat(chat): add reciprocal rank fusion util"
```

---

### Task 4: SSE streaming in the OpenRouter client (`StreamAnswer`)

**Files:**
- Modify: `backend/pkg/openrouter/client.go`
- Create: `backend/pkg/openrouter/stream_test.go`

**Interfaces:**
- Consumes: existing `Client` struct (`APIBase`, `APIKey`, `ChatModel`, `httpClient`) from `client.go`.
- Produces:
  - `openrouter.ChatMessage{ Role string; Content string }`
  - `openrouter.Usage{ PromptTokens int; CompletionTokens int }`
  - `(c *Client) StreamAnswer(ctx context.Context, model string, messages []ChatMessage, onChunk func(delta string)) (finishReason string, usage Usage, err error)` — POSTs to `{APIBase}/chat/completions` with `"stream": true` and `"stream_options": {"include_usage": true}`; calls `onChunk` for each non-empty `choices[0].delta.content`; returns the last seen `finish_reason` and the usage from the final SSE frame. When `model` is empty it falls back to `c.ChatModel`.

- [ ] **Step 1: Write the failing test**

Create `backend/pkg/openrouter/stream_test.go`:

```go
package openrouter

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// fakeSSE writes a sequence of OpenAI-style streaming frames.
func fakeSSE(w http.ResponseWriter, frames []string) {
	w.Header().Set("Content-Type", "text/event-stream")
	fl, _ := w.(http.Flusher)
	for _, f := range frames {
		fmt.Fprintf(w, "data: %s\n\n", f)
		if fl != nil {
			fl.Flush()
		}
	}
	fmt.Fprint(w, "data: [DONE]\n\n")
	if fl != nil {
		fl.Flush()
	}
}

func TestStreamAnswer_CollectsDeltasAndUsage(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fakeSSE(w, []string{
			`{"choices":[{"delta":{"content":"สวัส"},"finish_reason":null}]}`,
			`{"choices":[{"delta":{"content":"ดีครับ"},"finish_reason":null}]}`,
			`{"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":12,"completion_tokens":3}}`,
		})
	}))
	defer srv.Close()

	c := &Client{APIBase: srv.URL, httpClient: &http.Client{Timeout: 5 * time.Second}}
	var got strings.Builder
	fr, usage, err := c.StreamAnswer(context.Background(), "test-model",
		[]ChatMessage{{Role: "user", Content: "hi"}},
		func(d string) { got.WriteString(d) })
	if err != nil {
		t.Fatalf("StreamAnswer: %v", err)
	}
	if got.String() != "สวัสดีครับ" {
		t.Errorf("content = %q, want สวัสดีครับ", got.String())
	}
	if fr != "stop" {
		t.Errorf("finishReason = %q, want stop", fr)
	}
	if usage.PromptTokens != 12 || usage.CompletionTokens != 3 {
		t.Errorf("usage = %+v, want {12,3}", usage)
	}
}

func TestStreamAnswer_HTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer srv.Close()

	c := &Client{APIBase: srv.URL, httpClient: &http.Client{Timeout: 5 * time.Second}}
	_, _, err := c.StreamAnswer(context.Background(), "m",
		[]ChatMessage{{Role: "user", Content: "hi"}}, func(string) {})
	if err == nil {
		t.Fatal("expected error on HTTP 500")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./pkg/openrouter/ -run StreamAnswer -v`
Expected: FAIL — `ChatMessage`, `Usage`, `StreamAnswer` undefined.

- [ ] **Step 3: Add the streaming implementation**

Append to `backend/pkg/openrouter/client.go` (and add `"bufio"` and `"context"` to the import block):

```go
// ChatMessage is a single role/content turn sent to the chat completions API.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Usage holds token accounting returned on the final streaming frame.
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
}

type streamRequest struct {
	Model         string        `json:"model"`
	Messages      []ChatMessage `json:"messages"`
	Stream        bool          `json:"stream"`
	StreamOptions struct {
		IncludeUsage bool `json:"include_usage"`
	} `json:"stream_options"`
}

type streamFrame struct {
	Choices []struct {
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
		FinishReason *string `json:"finish_reason"`
	} `json:"choices"`
	Usage *Usage `json:"usage"`
}

// StreamAnswer streams a chat completion, invoking onChunk for each content
// delta. It returns the last finish_reason seen and the usage frame (if any).
func (c *Client) StreamAnswer(ctx context.Context, model string, messages []ChatMessage, onChunk func(delta string)) (string, Usage, error) {
	if model == "" {
		model = c.ChatModel
	}
	reqBody := streamRequest{Model: model, Messages: messages, Stream: true}
	reqBody.StreamOptions.IncludeUsage = true
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", Usage{}, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST",
		strings.TrimRight(c.APIBase, "/")+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", Usage{}, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")
	if c.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.APIKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", Usage{}, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return "", Usage{}, fmt.Errorf("openrouter error %d: %s", resp.StatusCode, string(body))
	}

	var (
		finishReason string
		usage        Usage
	)
	reader := bufio.NewReader(resp.Body)
	for {
		line, err := reader.ReadString('\n')
		if len(line) > 0 {
			trimmed := strings.TrimSpace(line)
			if strings.HasPrefix(trimmed, "data:") {
				payload := strings.TrimSpace(strings.TrimPrefix(trimmed, "data:"))
				if payload == "[DONE]" {
					break
				}
				var frame streamFrame
				if jsonErr := json.Unmarshal([]byte(payload), &frame); jsonErr == nil {
					for _, ch := range frame.Choices {
						if ch.Delta.Content != "" && onChunk != nil {
							onChunk(ch.Delta.Content)
						}
						if ch.FinishReason != nil && *ch.FinishReason != "" {
							finishReason = *ch.FinishReason
						}
					}
					if frame.Usage != nil {
						usage = *frame.Usage
					}
				}
			}
		}
		if err != nil {
			if err == io.EOF {
				break
			}
			return finishReason, usage, fmt.Errorf("read stream: %w", err)
		}
	}
	return finishReason, usage, nil
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./pkg/openrouter/ -run StreamAnswer -v`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
cd backend
git add pkg/openrouter/client.go pkg/openrouter/stream_test.go
git commit -m "feat(chat): add SSE StreamAnswer to openrouter client"
```

---

### Task 5: Config additions (LLM models, budget, native-flag switches)

**Files:**
- Modify: `backend/internal/config/config.go`
- Create: `backend/internal/config/chat_config_test.go`

**Interfaces:**
- Consumes: existing `Config`, `LLMConfig`, `ChatConfig` structs and the `getEnv`/`getEnvAsInt`/`getEnvAsBool`/`getEnvFirst` helpers in `config.go`.
- Produces (new fields, read by Plans 3–5):
  - `LLMConfig.IntentModel string` (`LLM_INTENT_MODEL`, default `google/gemini-2.5-flash-lite`)
  - `LLMConfig.FallbackModel string` (`LLM_FALLBACK_MODEL`, default "")
  - `LLMConfig.MaxPromptTokens int` (`MAX_PROMPT_TOKENS`, default 6000)
  - `ChatConfig.DailyRequestLimit int` (`DAILY_REQUEST_LIMIT`, default 1000)
  - `ChatConfig.RateLimitPerMin string` (`RATE_LIMIT_PER_MINUTE`, default `20/minute`)
  - `Config.ChatNative ChatNativeConfig` with bool fields `Stream`,`Rooms`,`Feedback` (env `CHAT_NATIVE_STREAM`,`CHAT_NATIVE_ROOMS`,`CHAT_NATIVE_FEEDBACK`, all default false → proxy)

- [ ] **Step 1: Write the failing test**

Create `backend/internal/config/chat_config_test.go`:

```go
package config

import (
	"os"
	"testing"
)

func TestLoad_ChatDefaults(t *testing.T) {
	// Minimum env so Load() succeeds in non-strict mode.
	os.Setenv("PRIVACY_HMAC_SECRET", "0123456789abcdef0123456789abcdef")
	if err := Load(); err != nil {
		t.Fatalf("Load: %v", err)
	}
	if AppConfig.LLM.IntentModel != "google/gemini-2.5-flash-lite" {
		t.Errorf("IntentModel = %q", AppConfig.LLM.IntentModel)
	}
	if AppConfig.LLM.MaxPromptTokens != 6000 {
		t.Errorf("MaxPromptTokens = %d, want 6000", AppConfig.LLM.MaxPromptTokens)
	}
	if AppConfig.Chat.DailyRequestLimit != 1000 {
		t.Errorf("DailyRequestLimit = %d, want 1000", AppConfig.Chat.DailyRequestLimit)
	}
	if AppConfig.Chat.RateLimitPerMin != "20/minute" {
		t.Errorf("RateLimitPerMin = %q", AppConfig.Chat.RateLimitPerMin)
	}
	if AppConfig.ChatNative.Stream || AppConfig.ChatNative.Rooms || AppConfig.ChatNative.Feedback {
		t.Errorf("native flags should default false: %+v", AppConfig.ChatNative)
	}
}

func TestLoad_ChatNativeFlagOn(t *testing.T) {
	os.Setenv("PRIVACY_HMAC_SECRET", "0123456789abcdef0123456789abcdef")
	os.Setenv("CHAT_NATIVE_STREAM", "true")
	defer os.Unsetenv("CHAT_NATIVE_STREAM")
	if err := Load(); err != nil {
		t.Fatalf("Load: %v", err)
	}
	if !AppConfig.ChatNative.Stream {
		t.Error("CHAT_NATIVE_STREAM=true should enable native stream")
	}
}
```

> Note: if `Load()` requires additional env in this repo's non-strict path, set the same vars the existing config tests use. Check for an existing `config` test for the minimal env set before running.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/config/ -run ChatDefaults -v`
Expected: FAIL — `IntentModel`/`MaxPromptTokens`/`DailyRequestLimit`/`RateLimitPerMin`/`ChatNative` undefined.

- [ ] **Step 3: Add the fields and a ChatNativeConfig struct**

In `backend/internal/config/config.go`, extend `LLMConfig` (around line 26):

```go
type LLMConfig struct {
	APIKey          string
	APIBase         string
	ChatModel       string
	EmbedModel      string
	IntentModel     string
	FallbackModel   string
	MaxPromptTokens int
	TimeoutSec      int
}
```

Extend `ChatConfig` (around line 97):

```go
type ChatConfig struct {
	ContextLimit               int
	MaxContextChars            int
	MaxChunkContent            int
	HistoryEnabled             bool
	HistorySimilarityThreshold float64
	IndexingTimeoutMin         int
	WebhookIndexTimeoutMin     int
	DailyRequestLimit          int
	RateLimitPerMin            string
}
```

Add a new struct next to the others and a field on `Config`:

```go
type ChatNativeConfig struct {
	Stream   bool
	Rooms    bool
	Feedback bool
}
```

Add `ChatNative ChatNativeConfig` to the `Config` struct (alongside `Chat ChatConfig`).

- [ ] **Step 4: Wire the Load() assignments**

In the `LLM: LLMConfig{...}` literal (around line 327) add:

```go
			IntentModel:     getEnvFirst([]string{"LLM_INTENT_MODEL", "OPENROUTER_INTENT_MODEL"}, "google/gemini-2.5-flash-lite"),
			FallbackModel:   getEnv("LLM_FALLBACK_MODEL", ""),
			MaxPromptTokens: getEnvAsInt("MAX_PROMPT_TOKENS", 6000),
```

In the `Chat: ChatConfig{...}` literal (around line 312) add:

```go
			DailyRequestLimit: getEnvAsInt("DAILY_REQUEST_LIMIT", 1000),
			RateLimitPerMin:   getEnv("RATE_LIMIT_PER_MINUTE", "20/minute"),
```

Add a `ChatNative` literal to the returned `Config{...}` (alongside `Chat: ...`):

```go
		ChatNative: ChatNativeConfig{
			Stream:   getEnvAsBool("CHAT_NATIVE_STREAM", false),
			Rooms:    getEnvAsBool("CHAT_NATIVE_ROOMS", false),
			Feedback: getEnvAsBool("CHAT_NATIVE_FEEDBACK", false),
		},
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && go test ./internal/config/ -run 'ChatDefaults|ChatNativeFlagOn' -v`
Expected: PASS. If `Load()` errors on missing env, add the minimal vars the existing config tests set (Step 1 note) and re-run.

- [ ] **Step 6: Full build + suite, then commit**

```bash
cd backend
go build ./...
go test ./...
git add internal/config/config.go internal/config/chat_config_test.go
git commit -m "feat(chat): add LLM model, budget, and native-flag config fields"
```

Expected: `go build ./...` clean; `go test ./...` green (no regressions in existing packages).

---

## Self-Review

**Spec coverage (Plan 1 slice):** StreamAnswer → Task 4 ✔; YAML config parity loaders → Task 1 ✔; Thai detection → Task 2 ✔; RRF util → Task 3 ✔; LLM model/budget/native-flag config → Task 5 ✔. Embedding-dim reconciliation deliberately deferred (open decision #2, blocks Plan 2 not Plan 1) — noted in Global Constraints.

**Placeholder scan:** No TBD/TODO; every code step shows full code; every run step shows the command and expected result.

**Type consistency:** `Client` fields used in Task 4 match `client.go` (`APIBase`,`APIKey`,`ChatModel`,`httpClient`). `ChatMessage`/`Usage`/`StreamAnswer` signatures identical between the Interfaces block, the test, and the implementation. Config field names (`IntentModel`,`MaxPromptTokens`,`DailyRequestLimit`,`RateLimitPerMin`,`ChatNative.{Stream,Rooms,Feedback}`) identical across test and implementation. `FuseRRF([][]string,int) map[string]float64` consistent across Interfaces/test/impl. `chatconfig` type/field names consistent.

**Known follow-ups for the executor:** verify the real `intents.yaml` top-level shape (flat map vs nested) in Task 1 Step 5; confirm the minimal env set for `config.Load()` in Task 5 Step 1.
```

