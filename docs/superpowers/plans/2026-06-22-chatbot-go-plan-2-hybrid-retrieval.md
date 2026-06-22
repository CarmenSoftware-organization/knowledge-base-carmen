# Chatbot Go Migration — Plan 2: Hybrid Retrieval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vector-only retrieval in `/api/chat/ask` with hybrid pgvector(cosine) + PostgreSQL FTS + Reciprocal Rank Fusion + path boost, matching the Python service's behavior, with the fusion/ranking logic unit-tested independently of the database.

**Architecture:** Split retrieval into a pure, unit-testable core (`FuseAndRank` + path-boost matcher operating on already-fetched rows) and a thin DB layer (two SQL queries) in a new `RetrievalService`. Wire the service into the existing `chat_ask_flow.go`. Add a DB-gated golden-set parity harness. Reuses Plan 1 primitives (`utils.IsThai`, `utils.FuseRRF`, `chatconfig` tuning + path rules).

**Tech Stack:** Go 1.25, Fiber v2, GORM raw SQL (`database.DB.Raw`), pgvector cosine (`<=>`), Postgres FTS (`to_tsvector('simple', …)` / `plainto_tsquery`), the Plan 1 `chatconfig` and `utils` packages.

## Global Constraints

- Go module `github.com/new-carmen/backend`. Run commands from `backend/`.
- Retrieval tuning is read from `chatconfig.RetrievalTuning` (loaded from `config/tuning.yaml`), never hardcoded: `top_k=4`, `max_distance=0.45`, `fetch_k=20`, `rrf_k=60`, `path_boost_rrf=0.02`.
- Vector similarity uses **cosine distance `<=>`** (NOT the current L2 `<->`). Lower = closer. Cutoff: `distance < max_distance`.
- FTS uses `to_tsvector('simple', dc.content)` and `plainto_tsquery('simple', question)` computed at query time (no precomputed column). **Skip the FTS query entirely when `utils.IsThai(question)`** — the 'simple' dictionary cannot tokenize Thai.
- RRF: 1-indexed ranks, key = SHA-256 hex of chunk content, `score += 1/(rrf_k + rank)` accumulated across the vector and keyword lists (reuse `utils.FuseRRF`). Path boost adds `path_boost_rrf` to a candidate's fused score when the chunk's path matches an active path rule. Final list sorted by effective score descending, truncated to `top_k`.
- Exclude index pages from the **vector** query with `AND d.path NOT LIKE '%index.md'` (parity with Python `retrieval.py`; the implementer MUST confirm against `carmen-chatbot/backend/llm/retrieval.py` whether the FTS query also carries this clause and match it exactly).
- Embedding dimension is resolved: production runs `VECTOR_DIMENSION=2000` (both Go and Python read it at runtime; same embed model `qwen/qwen3-embedding-8b`). Reuse the existing `utils.TruncateEmbedding` + `utils.Float32SliceToPgVector` pipeline. Do NOT change `vector.go`.
- The dev database is **remote** (`dev.blueledgers.com:6432`, schema search path `carmen,public`). Existing tests do not touch the DB. Therefore: pure logic is unit-tested (always runs); SQL-touching tests MUST skip gracefully (`t.Skip`) when the DB is unreachable, never fail the suite.
- Parity bar (golden set): for each labeled question, **every** expected path must appear in Go's top-k result (100% recall on labeled paths).
- Additive/behavior-preserving for everything except the retrieval internals of `/api/chat/ask`: the endpoint's request/response contract is unchanged.

---

### Task 1: Path-boost matcher (pure)

**Files:**
- Create: `backend/internal/services/path_boost.go`
- Create: `backend/internal/services/path_boost_test.go`

**Interfaces:**
- Consumes: `chatconfig.PathRule{ Keywords []string; Patterns []string }` (Plan 1).
- Produces: `services.MatchesPathRules(path, question string, rules []chatconfig.PathRule) bool` — true when some rule has a keyword contained (case-insensitively) in `question` AND that same rule has a pattern matching `path`. A pattern is a SQL `LIKE` glob using `%` wildcards; translate it to Go: `%x%`→substring, `x%`→prefix, `%x`→suffix, `x`→exact, all case-insensitive.

- [ ] **Step 1: Write the failing test**

Create `backend/internal/services/path_boost_test.go`:

```go
package services

import (
	"testing"

	"github.com/new-carmen/backend/internal/chatconfig"
)

func TestMatchesPathRules(t *testing.T) {
	rules := []chatconfig.PathRule{
		{Keywords: []string{"vendor", "ผู้ขาย"}, Patterns: []string{"%vendor%"}},
		{Keywords: []string{"ap", "เจ้าหนี้"}, Patterns: []string{"%ap-%", "%/ap/%"}},
	}
	cases := []struct {
		name     string
		path     string
		question string
		want     bool
	}{
		{"keyword+pattern match", "carmen/ap/vendor-list.md", "how to add a vendor?", true},
		{"keyword matches but path doesn't", "carmen/gl/journal.md", "vendor setup", false},
		{"path matches but no keyword in question", "carmen/ap/ap-invoice.md", "general greeting", false},
		{"thai keyword + ap path", "carmen/ap/ap-payment.md", "บันทึกเจ้าหนี้ยังไง", true},
		{"case-insensitive keyword", "carmen/ap/vendor.md", "VENDOR master", true},
		{"no rules match", "carmen/x/y.md", "unrelated", false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := MatchesPathRules(c.path, c.question, rules); got != c.want {
				t.Errorf("MatchesPathRules(%q,%q) = %v, want %v", c.path, c.question, got, c.want)
			}
		})
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/services/ -run MatchesPathRules -v`
Expected: FAIL — `MatchesPathRules` undefined.

- [ ] **Step 3: Write the implementation**

Create `backend/internal/services/path_boost.go`:

```go
package services

import (
	"strings"

	"github.com/new-carmen/backend/internal/chatconfig"
)

// MatchesPathRules reports whether a chunk path should receive a path boost for
// this question: some rule has a keyword present in the question AND a pattern
// matching the path. Patterns are SQL LIKE globs ('%' = wildcard); matching is
// case-insensitive. Mirrors the Python path-rule boost in retrieval.py.
func MatchesPathRules(path, question string, rules []chatconfig.PathRule) bool {
	lqPath := strings.ToLower(path)
	lqQuestion := strings.ToLower(question)
	for _, rule := range rules {
		if !anyKeywordInQuestion(rule.Keywords, lqQuestion) {
			continue
		}
		for _, pat := range rule.Patterns {
			if likeMatch(lqPath, strings.ToLower(pat)) {
				return true
			}
		}
	}
	return false
}

func anyKeywordInQuestion(keywords []string, lqQuestion string) bool {
	for _, kw := range keywords {
		kw = strings.TrimSpace(strings.ToLower(kw))
		if kw != "" && strings.Contains(lqQuestion, kw) {
			return true
		}
	}
	return false
}

// likeMatch evaluates a lowercased SQL LIKE glob (only '%' wildcards) against a
// lowercased subject. '_' is treated literally (path rules don't use it).
func likeMatch(subject, pattern string) bool {
	hasLead := strings.HasPrefix(pattern, "%")
	hasTrail := strings.HasSuffix(pattern, "%")
	core := strings.Trim(pattern, "%")
	// Inner '%' splits the core into ordered fragments that must appear in order.
	frags := strings.Split(core, "%")
	switch {
	case hasLead && hasTrail:
		return containsInOrder(subject, frags)
	case hasLead:
		// must end with the (single) core
		return len(frags) == 1 && strings.HasSuffix(subject, frags[0])
	case hasTrail:
		return len(frags) == 1 && strings.HasPrefix(subject, frags[0])
	default:
		return subject == core
	}
}

func containsInOrder(subject string, frags []string) bool {
	idx := 0
	for _, f := range frags {
		if f == "" {
			continue
		}
		pos := strings.Index(subject[idx:], f)
		if pos < 0 {
			return false
		}
		idx += pos + len(f)
	}
	return true
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/services/ -run MatchesPathRules -v`
Expected: PASS (all sub-cases).

- [ ] **Step 5: Commit**

```bash
cd backend
git add internal/services/path_boost.go internal/services/path_boost_test.go
git commit -m "feat(chat): add path-rule boost matcher for hybrid retrieval"
```

---

### Task 2: Fuse-and-rank core (pure)

**Files:**
- Create: `backend/internal/services/retrieval_rank.go`
- Create: `backend/internal/services/retrieval_rank_test.go`

**Interfaces:**
- Consumes: `utils.FuseRRF` (Plan 1), `chatconfig.RetrievalTuning`, `MatchesPathRules` (Task 1).
- Produces:
  - `services.ScoredRow{ Path, Title, Content string; Dist float64 }` — a row fetched from one source (Dist used only for the vector list, 0 for keyword).
  - `services.RetrievedChunk{ Path, Title, Content string; RRF float64; Boosted bool }`
  - `services.FuseAndRank(vec, kw []ScoredRow, cfg chatconfig.RetrievalTuning, question string, rules []chatconfig.PathRule) []RetrievedChunk` — dedupes by content hash, fuses the vector and keyword rank lists via RRF, adds `path_boost_rrf` to boosted candidates, sorts by effective score desc, returns the top `cfg.TopK`. Ties broken by lower content-hash (deterministic).

- [ ] **Step 1: Write the failing test**

Create `backend/internal/services/retrieval_rank_test.go`:

```go
package services

import (
	"testing"

	"github.com/new-carmen/backend/internal/chatconfig"
)

func cfg() chatconfig.RetrievalTuning {
	return chatconfig.RetrievalTuning{TopK: 2, MaxDistance: 0.45, FetchK: 20, RRFK: 60, PathBoostRRF: 0.02}
}

func TestFuseAndRank_RRFOrderingAndTopK(t *testing.T) {
	// A is rank1 vector + rank1 keyword → highest fused. B rank2 both. C only vector rank3.
	vec := []ScoredRow{
		{Path: "p/a.md", Title: "A", Content: "alpha", Dist: 0.10},
		{Path: "p/b.md", Title: "B", Content: "beta", Dist: 0.20},
		{Path: "p/c.md", Title: "C", Content: "gamma", Dist: 0.30},
	}
	kw := []ScoredRow{
		{Path: "p/a.md", Title: "A", Content: "alpha"},
		{Path: "p/b.md", Title: "B", Content: "beta"},
	}
	got := FuseAndRank(vec, kw, cfg(), "anything", nil)
	if len(got) != 2 { // TopK=2
		t.Fatalf("len = %d, want 2", len(got))
	}
	if got[0].Content != "alpha" || got[1].Content != "beta" {
		t.Errorf("order = [%s,%s], want [alpha,beta]", got[0].Content, got[1].Content)
	}
}

func TestFuseAndRank_DedupByContent(t *testing.T) {
	vec := []ScoredRow{
		{Path: "p/a.md", Title: "A", Content: "same", Dist: 0.10},
		{Path: "p/a2.md", Title: "A2", Content: "same", Dist: 0.40}, // dup content
	}
	got := FuseAndRank(vec, nil, cfg(), "q", nil)
	if len(got) != 1 {
		t.Fatalf("len = %d, want 1 (deduped by content)", len(got))
	}
}

func TestFuseAndRank_PathBoostLifts(t *testing.T) {
	// Without boost, vec-only ranks: x(rank1) > y(rank2). Boost y so it overtakes x.
	vec := []ScoredRow{
		{Path: "p/x.md", Title: "X", Content: "xx", Dist: 0.10},
		{Path: "carmen/ap/ap-y.md", Title: "Y", Content: "yy", Dist: 0.20},
	}
	rules := []chatconfig.PathRule{{Keywords: []string{"ap"}, Patterns: []string{"%ap-%"}}}
	c := cfg()
	c.TopK = 2
	// rrf: x=1/61≈0.016393, y=1/62≈0.016129; boost y by 0.02 → y wins.
	got := FuseAndRank(vec, nil, c, "ap question", rules)
	if got[0].Content != "yy" {
		t.Errorf("boosted y should rank first, got %q", got[0].Content)
	}
	if !got[0].Boosted {
		t.Error("y should be marked Boosted")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/services/ -run FuseAndRank -v`
Expected: FAIL — `ScoredRow`/`RetrievedChunk`/`FuseAndRank` undefined.

- [ ] **Step 3: Write the implementation**

Create `backend/internal/services/retrieval_rank.go`:

```go
package services

import (
	"crypto/sha256"
	"encoding/hex"
	"sort"

	"github.com/new-carmen/backend/internal/chatconfig"
	"github.com/new-carmen/backend/internal/utils"
)

type ScoredRow struct {
	Path    string
	Title   string
	Content string
	Dist    float64
}

type RetrievedChunk struct {
	Path    string
	Title   string
	Content string
	RRF     float64
	Boosted bool
}

func contentKey(content string) string {
	sum := sha256.Sum256([]byte(content))
	return hex.EncodeToString(sum[:])
}

// FuseAndRank fuses the vector and keyword rank lists with RRF, applies the
// path boost, and returns the top cfg.TopK chunks (deduped by content hash).
func FuseAndRank(vec, kw []ScoredRow, cfg chatconfig.RetrievalTuning, question string, rules []chatconfig.PathRule) []RetrievedChunk {
	rowByKey := map[string]ScoredRow{}
	vecKeys := make([]string, 0, len(vec))
	for _, r := range vec {
		k := contentKey(r.Content)
		if _, ok := rowByKey[k]; !ok {
			rowByKey[k] = r
		}
		vecKeys = append(vecKeys, k)
	}
	kwKeys := make([]string, 0, len(kw))
	for _, r := range kw {
		k := contentKey(r.Content)
		if _, ok := rowByKey[k]; !ok {
			rowByKey[k] = r
		}
		kwKeys = append(kwKeys, k)
	}

	fused := utils.FuseRRF([][]string{vecKeys, kwKeys}, cfg.RRFK)

	type scored struct {
		key       string
		effective float64
		boosted   bool
	}
	ranked := make([]scored, 0, len(fused))
	for k, base := range fused {
		row := rowByKey[k]
		boosted := MatchesPathRules(row.Path, question, rules)
		eff := base
		if boosted {
			eff += cfg.PathBoostRRF
		}
		ranked = append(ranked, scored{key: k, effective: eff, boosted: boosted})
	}
	sort.Slice(ranked, func(i, j int) bool {
		if ranked[i].effective != ranked[j].effective {
			return ranked[i].effective > ranked[j].effective
		}
		return ranked[i].key < ranked[j].key // deterministic tie-break
	})

	limit := cfg.TopK
	if limit > len(ranked) {
		limit = len(ranked)
	}
	out := make([]RetrievedChunk, 0, limit)
	for _, s := range ranked[:limit] {
		row := rowByKey[s.key]
		out = append(out, RetrievedChunk{
			Path:    row.Path,
			Title:   row.Title,
			Content: row.Content,
			RRF:     s.effective,
			Boosted: s.boosted,
		})
	}
	return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/services/ -run FuseAndRank -v`
Expected: PASS (all three tests).

- [ ] **Step 5: Commit**

```bash
cd backend
git add internal/services/retrieval_rank.go internal/services/retrieval_rank_test.go
git commit -m "feat(chat): add RRF fuse-and-rank core for hybrid retrieval"
```

---

### Task 3: Retrieval service (DB layer)

**Files:**
- Create: `backend/internal/services/retrieval_service.go`
- Create: `backend/internal/services/retrieval_service_test.go`

**Interfaces:**
- Consumes: `database.DB` (global `*gorm.DB`), `utils.TruncateEmbedding`, `utils.Float32SliceToPgVector`, `utils.IsThai`, `chatconfig` (tuning + path rules), `FuseAndRank`/`ScoredRow`/`RetrievedChunk` (Task 2).
- Produces:
  - `services.RetrievalService` struct with `tuning chatconfig.RetrievalTuning` and `rules []chatconfig.PathRule`.
  - `services.NewRetrievalService() *RetrievalService` — loads tuning + path rules from `chatconfig.DefaultDir()`; on load error, falls back to the documented default constants and logs a warning (retrieval must not crash the server).
  - `(s *RetrievalService) Retrieve(bu, question string, emb []float32) ([]RetrievedChunk, error)` — runs the vector query and (unless `utils.IsThai(question)`) the keyword query, then `FuseAndRank`.
  - `(s *RetrievalService) fetchVector(bu, embStr string) ([]ScoredRow, error)` and `(s *RetrievalService) fetchKeyword(bu, question string) ([]ScoredRow, error)` — unexported, hold the SQL.

- [ ] **Step 1: Write the failing test (DB-gated)**

Create `backend/internal/services/retrieval_service_test.go`:

```go
package services

import (
	"os"
	"testing"

	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
)

// dbAvailable connects using the loaded config; skips the test when the remote
// DB is unreachable so the unit suite stays green offline.
func dbAvailable(t *testing.T) {
	t.Helper()
	if os.Getenv("RUN_DB_TESTS") != "1" {
		t.Skip("set RUN_DB_TESTS=1 to run DB-backed retrieval tests")
	}
	if err := config.Load(); err != nil {
		t.Skipf("config load failed: %v", err)
	}
	if err := database.Connect(); err != nil {
		t.Skipf("DB unreachable: %v", err)
	}
}

func TestRetrievalService_ReturnsChunks(t *testing.T) {
	dbAvailable(t)
	s := NewRetrievalService()
	// Use a question with an obvious answer in the seeded 'carmen' BU.
	rows, err := s.fetchKeyword("carmen", "vendor")
	if err != nil {
		t.Fatalf("fetchKeyword: %v", err)
	}
	// Keyword search for a common term should return at least one row.
	if len(rows) == 0 {
		t.Skip("no keyword rows (content may differ in this DB) — not a logic failure")
	}
	for _, r := range rows {
		if r.Path == "" || r.Content == "" {
			t.Errorf("row missing fields: %+v", r)
		}
	}
}

func TestNewRetrievalService_LoadsTuning(t *testing.T) {
	// This part needs no DB: the service must load tuning constants.
	s := NewRetrievalService()
	if s.tuning.TopK != 4 || s.tuning.RRFK != 60 || s.tuning.MaxDistance != 0.45 {
		t.Errorf("tuning not loaded: %+v", s.tuning)
	}
}
```

> Note: `TestNewRetrievalService_LoadsTuning` runs without a DB and exercises the tuning load (relative path `config/` resolves when tests run from the package dir — if the working directory differs, the implementer must make `NewRetrievalService` resolve the config dir robustly, e.g. via an env override `CHAT_CONFIG_DIR`, and set it in the test). Confirm the test passes from `internal/services/`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/services/ -run 'RetrievalService|NewRetrievalService' -v`
Expected: FAIL — `RetrievalService`/`NewRetrievalService` undefined.

- [ ] **Step 3: Write the implementation**

Create `backend/internal/services/retrieval_service.go`:

```go
package services

import (
	"fmt"
	"log"

	"github.com/new-carmen/backend/internal/chatconfig"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/utils"
)

type RetrievalService struct {
	tuning chatconfig.RetrievalTuning
	rules  []chatconfig.PathRule
}

func defaultRetrievalTuning() chatconfig.RetrievalTuning {
	return chatconfig.RetrievalTuning{TopK: 4, MaxDistance: 0.45, FetchK: 20, RRFK: 60, PathBoostRRF: 0.02}
}

func NewRetrievalService() *RetrievalService {
	dir := chatconfig.DefaultDir()
	tuning := defaultRetrievalTuning()
	if t, err := chatconfig.LoadTuning(dir); err != nil {
		log.Printf("[retrieval] tuning load failed, using defaults: %v", err)
	} else {
		tuning = t.Retrieval
	}
	rules, err := chatconfig.LoadPathRules(dir)
	if err != nil {
		log.Printf("[retrieval] path rules load failed, continuing without boost: %v", err)
		rules = nil
	}
	return &RetrievalService{tuning: tuning, rules: rules}
}

func (s *RetrievalService) Retrieve(bu, question string, emb []float32) ([]RetrievedChunk, error) {
	embStr := utils.Float32SliceToPgVector(utils.TruncateEmbedding(emb))
	vec, err := s.fetchVector(bu, embStr)
	if err != nil {
		return nil, err
	}
	var kw []ScoredRow
	if !utils.IsThai(question) {
		// Parity with Python: keyword search is best-effort. On failure, log and
		// fall back to vector-only rather than failing the whole retrieval.
		if rows, kErr := s.fetchKeyword(bu, question); kErr != nil {
			log.Printf("[retrieval] keyword search failed, using vector-only: %v", kErr)
		} else {
			kw = rows
		}
	}
	return FuseAndRank(vec, kw, s.tuning, question, s.rules), nil
}

func (s *RetrievalService) fetchVector(bu, embStr string) ([]ScoredRow, error) {
	query := fmt.Sprintf(`
SELECT d.path, d.title, dc.content, (dc.embedding <=> CAST(? AS vector)) AS dist
FROM %s.document_chunks dc
JOIN %s.documents d ON dc.document_id = d.id
WHERE (dc.embedding <=> CAST(? AS vector)) < ?
  AND d.path NOT LIKE '%%index.md'
ORDER BY dist
LIMIT ?
`, bu, bu)
	var rows []ScoredRow
	if err := database.DB.Raw(query, embStr, embStr, s.tuning.MaxDistance, s.tuning.FetchK).Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (s *RetrievalService) fetchKeyword(bu, question string) ([]ScoredRow, error) {
	query := fmt.Sprintf(`
SELECT d.path, d.title, dc.content
FROM %s.document_chunks dc
JOIN %s.documents d ON dc.document_id = d.id
WHERE to_tsvector('simple', dc.content) @@ plainto_tsquery('simple', ?)
ORDER BY ts_rank_cd(to_tsvector('simple', dc.content), plainto_tsquery('simple', ?)) DESC
LIMIT ?
`, bu, bu)
	var rows []ScoredRow
	if err := database.DB.Raw(query, question, question, s.tuning.FetchK).Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}
```

> Parity (verified against `carmen-chatbot/backend/llm/retrieval.py`): the vector query uses strict `<` and `AND d.path NOT LIKE '%index.md'`; the FTS query does **NOT** exclude `%index.md`; both `LIMIT fetch_k`; Thai queries skip FTS; keyword search is best-effort (Python try/except → vector-only fallback, replicated in `Retrieve` above). The code above already matches all of these — no further adjustment needed. One mechanical check remains: the `dist` column scans into `ScoredRow.Dist`; GORM maps by lowercased field name so `Dist`←`dist` works, but if a run shows `Dist` always 0, add `gorm:"column:dist"` to the field.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/services/ -run 'RetrievalService|NewRetrievalService' -v`
Expected: `TestNewRetrievalService_LoadsTuning` PASS; DB tests SKIP without `RUN_DB_TESTS=1`. If the remote DB is reachable, run `RUN_DB_TESTS=1 go test ./internal/services/ -run RetrievalService -v` and confirm rows return.

- [ ] **Step 5: Commit**

```bash
cd backend
git add internal/services/retrieval_service.go internal/services/retrieval_service_test.go
git commit -m "feat(chat): add hybrid retrieval service (cosine + FTS + RRF)"
```

---

### Task 4: GIN index migration + wire into chat_ask_flow

**Files:**
- Create: `backend/migrations/0011_fts_gin_index.sql`
- Modify: `backend/internal/api/chat_ask_flow.go`
- Modify: `backend/internal/api/chat_handler.go` (add a `retrieval *services.RetrievalService` field + init in `NewChatHandler`)

**Interfaces:**
- Consumes: `services.RetrievalService.Retrieve` (Task 3), `services.RetrievedChunk` (Task 2).
- Produces: `/api/chat/ask` builds its LLM context from hybrid retrieval. A new helper `buildContextFromChunks(chunks []services.RetrievedChunk, maxContextChars, maxChunkContent int) (string, []models.ChatSource)` replaces the row-based `buildContextFromRows` in the ask path.

- [ ] **Step 1: Write the GIN index migration**

Create `backend/migrations/0011_fts_gin_index.sql`:

```sql
-- 0011_fts_gin_index.sql
-- Speeds up the hybrid-retrieval FTS query (to_tsvector('simple', content)).
-- Per-BU: run for each business-unit schema's document_chunks table.
-- Example for the 'carmen' schema (repeat per BU, or fold into create_bu_tables):
CREATE INDEX IF NOT EXISTS document_chunks_content_fts_idx
  ON carmen.document_chunks
  USING gin (to_tsvector('simple', content));
```

> Run with `psql` (not `./server migrate`) per the repo convention. This index is a performance optimization; correctness does not depend on it.

- [ ] **Step 2: Write the failing test for the context builder**

Add to `backend/internal/api/chat_ask_flow_test.go` (create the file if absent):

```go
package api

import (
	"strings"
	"testing"

	"github.com/new-carmen/backend/internal/services"
)

func TestBuildContextFromChunks(t *testing.T) {
	chunks := []services.RetrievedChunk{
		{Path: "p/a.md", Title: "Alpha", Content: "alpha content"},
		{Path: "p/b.md", Title: "", Content: "beta content"},
	}
	ctx, sources := buildContextFromChunks(chunks, 8000, 2000)
	if !strings.Contains(ctx, "alpha content") || !strings.Contains(ctx, "beta content") {
		t.Errorf("context missing content: %q", ctx)
	}
	if len(sources) != 2 {
		t.Fatalf("sources = %d, want 2", len(sources))
	}
	if sources[0].ArticleID != "p/a.md" || sources[0].Title != "Alpha" {
		t.Errorf("source[0] = %+v", sources[0])
	}
	if sources[1].Title != "p/b.md" { // empty title falls back to path
		t.Errorf("source[1] title fallback = %q, want path", sources[1].Title)
	}
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && go test ./internal/api/ -run BuildContextFromChunks -v`
Expected: FAIL — `buildContextFromChunks` undefined.

- [ ] **Step 4: Implement the context builder and wire retrieval**

Add to `chat_ask_flow.go`:

```go
func buildContextFromChunks(chunks []services.RetrievedChunk, maxContextChars, maxChunkContent int) (string, []models.ChatSource) {
	var b strings.Builder
	sources := make([]models.ChatSource, 0, len(chunks))
	for i, ch := range chunks {
		content := ch.Content
		if len(content) > maxChunkContent {
			content = content[:maxChunkContent]
		}
		if b.Len() >= maxContextChars {
			break
		}
		b.WriteString("\n--- Context ")
		b.WriteString(strconv.Itoa(i + 1))
		b.WriteString(" ---\n")
		b.WriteString(content)
		b.WriteString("\n")

		title := strings.TrimSpace(ch.Title)
		if title == "" {
			title = ch.Path
		}
		sources = append(sources, models.ChatSource{ArticleID: ch.Path, Title: title})
	}
	return b.String(), sources
}
```

In `chat_handler.go`, add the field and init:

```go
// in ChatHandler struct:
retrieval *services.RetrievalService
// in NewChatHandler():
retrieval: services.NewRetrievalService(),
```

In `askFlow` (chat_ask_flow.go), replace the `queryVectorRows` + `buildContextFromRows` calls in the main retrieval path with:

```go
chunks, err := h.retrieval.Retrieve(bu, question, emb)
if err != nil {
	return models.ChatAskResponse{}, fiber.StatusInternalServerError, fmt.Errorf("retrieval failed: %w", err)
}
context, sources := buildContextFromChunks(chunks, chatCfg.MaxContextChars, chatCfg.MaxChunkContent)
```

Leave the cached-answer and router branches as they are. Do not delete `queryVectorRows`/`buildContextFromRows` if other code still references them; if nothing references them after this change, remove them to avoid dead code (the reviewer will check).

- [ ] **Step 5: Run tests + build**

Run: `cd backend && go test ./internal/api/ -run BuildContextFromChunks -v && go build ./... && go test ./...`
Expected: context test PASS; build clean; full suite green (DB tests skip).

- [ ] **Step 6: Commit**

```bash
cd backend
git add migrations/0011_fts_gin_index.sql internal/api/chat_ask_flow.go internal/api/chat_handler.go internal/api/chat_ask_flow_test.go
git commit -m "feat(chat): wire hybrid retrieval into /api/chat/ask + GIN index migration"
```

---

### Task 5: Golden-set parity harness (DB-gated)

**Files:**
- Create: `backend/tests/parity/golden_set.json`
- Create: `backend/tests/parity/harness_test.go`
- Create: `backend/tests/parity/README.md`

**Interfaces:**
- Consumes: `services.NewRetrievalService` + `Retrieve`, an embedder (`openrouter.NewClient().Embedding`), `config.Load`, `database.Connect`.
- Produces: a DB-gated test that, for each golden entry, embeds the question, runs `Retrieve`, and asserts every `expected_paths` entry appears in the returned top-k (100% recall on labeled paths).

**Golden-set source decision:** entries are hand-written (~30–50 over time) by someone with domain knowledge of the `carmen` content. This task ships the harness, the JSON schema, the README process, and a **starter set of ~8 entries** the domain expert will validate and expand. Generating correct `expected_paths` requires knowing the real content — the harness must make expanding the set trivial, not invent authoritative answers.

- [ ] **Step 1: Create the golden-set schema + starter entries**

Create `backend/tests/parity/golden_set.json`:

```json
[
  { "question": "how do I add a vendor?", "bu": "carmen", "expected_paths": ["%vendor%"] },
  { "question": "วิธีบันทึกใบกำกับภาษีเจ้าหนี้", "bu": "carmen", "expected_paths": ["%ap%"] }
]
```

> `expected_paths` are SQL-LIKE globs matched against returned paths (reuse the Task 1 `likeMatch` semantics via an exported helper, or a local matcher). The starter entries use broad globs; the domain expert tightens them to specific document paths during expansion.

- [ ] **Step 2: Write the harness test**

Create `backend/tests/parity/harness_test.go`:

```go
package parity

import (
	"encoding/json"
	"os"
	"strings"
	"testing"

	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/services"
	"github.com/new-carmen/backend/pkg/openrouter"
)

type goldenEntry struct {
	Question      string   `json:"question"`
	BU            string   `json:"bu"`
	ExpectedPaths []string `json:"expected_paths"`
}

func TestGoldenSetRecall(t *testing.T) {
	if os.Getenv("RUN_DB_TESTS") != "1" {
		t.Skip("set RUN_DB_TESTS=1 (and reachable DB + LLM key) to run the golden-set parity harness")
	}
	if err := config.Load(); err != nil {
		t.Skipf("config: %v", err)
	}
	if err := database.Connect(); err != nil {
		t.Skipf("DB unreachable: %v", err)
	}
	raw, err := os.ReadFile("golden_set.json")
	if err != nil {
		t.Fatalf("read golden_set.json: %v", err)
	}
	var entries []goldenEntry
	if err := json.Unmarshal(raw, &entries); err != nil {
		t.Fatalf("parse golden set: %v", err)
	}

	embedder := openrouter.NewClient()
	rs := services.NewRetrievalService()
	for _, e := range entries {
		t.Run(e.Question, func(t *testing.T) {
			emb, err := embedder.Embedding(e.Question)
			if err != nil {
				t.Skipf("embedding failed (LLM unreachable): %v", err)
			}
			chunks, err := rs.Retrieve(e.BU, e.Question, emb)
			if err != nil {
				t.Fatalf("retrieve: %v", err)
			}
			for _, want := range e.ExpectedPaths {
				if !anyPathMatches(chunks, want) {
					t.Errorf("expected path %q not in top-%d for %q", want, len(chunks), e.Question)
				}
			}
		})
	}
}

func anyPathMatches(chunks []services.RetrievedChunk, glob string) bool {
	needle := strings.ToLower(strings.Trim(glob, "%"))
	for _, c := range chunks {
		if strings.Contains(strings.ToLower(c.Path), needle) {
			return true
		}
	}
	return false
}
```

- [ ] **Step 3: Write the README process**

Create `backend/tests/parity/README.md`:

```markdown
# Retrieval Parity Golden Set

Hand-curated questions used to verify the Go hybrid retrieval returns the right
documents. Parity bar: **every `expected_paths` glob must match at least one
path in the top-k** (100% recall on labeled paths).

## Run
RUN_DB_TESTS=1 go test ./tests/parity/ -v   # needs reachable DB + LLM_API_KEY

Without RUN_DB_TESTS=1 the harness skips (keeps the offline unit suite green).

## Expand the set
Add objects to `golden_set.json`:
{ "question": "...", "bu": "carmen", "expected_paths": ["%specific-doc%"] }
Pick questions whose correct document is unambiguous. Tighten globs from broad
(`%vendor%`) to specific document slugs as you learn the content. Target 30–50
entries across intents/modules (AP, AR, GL, Asset, Configuration, …).
```

- [ ] **Step 4: Run the harness (skipped offline) + build**

Run: `cd backend && go test ./tests/parity/ -v && go build ./...`
Expected: `TestGoldenSetRecall` SKIP (no `RUN_DB_TESTS`); build clean. If the dev DB + `LLM_API_KEY` are available, run `RUN_DB_TESTS=1 go test ./tests/parity/ -v` and confirm the starter entries pass (or surface real retrieval gaps).

- [ ] **Step 5: Commit**

```bash
cd backend
git add tests/parity/
git commit -m "test(chat): add DB-gated golden-set retrieval parity harness"
```

---

## Self-Review

**Spec coverage (Plan 2 slice of the migration spec):** hybrid cosine+FTS+RRF retrieval → Tasks 2+3; path boost → Tasks 1+2; Thai-skip FTS → Task 3; `NOT LIKE '%index.md'` + cosine `<=>` → Task 3; GIN index → Task 4; wire into ask flow → Task 4; golden-set parity harness with 100%-recall bar → Task 5. Tuning read from YAML, not hardcoded → Tasks 2/3 use `chatconfig.RetrievalTuning`.

**Placeholder scan:** No TBD/TODO. Every code step has full code; every run step has command + expected result. Two explicit implementer parity-verification notes (FTS `%index.md` clause; `< ` vs `<=`; GORM `dist` column tag) are concrete checks against `retrieval.py`, not placeholders.

**Type consistency:** `ScoredRow`/`RetrievedChunk`/`FuseAndRank` identical across Tasks 2/3/4 and tests. `MatchesPathRules(path, question, rules)` identical across Tasks 1/2/3. `RetrievalService.Retrieve(bu, question, emb)` consistent in Tasks 3/4/5. `buildContextFromChunks` signature identical in Task 4 impl and test. `chatconfig.RetrievalTuning` field names (`TopK,MaxDistance,FetchK,RRFK,PathBoostRRF`) match Plan 1.

**Known executor checks:** confirm FTS `%index.md` parity + distance comparator against `carmen-chatbot/backend/llm/retrieval.py`; ensure `NewRetrievalService` resolves `config/` robustly when tests run from a different working dir (env override if needed); add GORM `column:dist` tag if the scan doesn't populate `ScoredRow.Dist`.
```

