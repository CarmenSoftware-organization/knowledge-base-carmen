package api

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/new-carmen/backend/internal/chatconfig"
	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/services"
	"github.com/new-carmen/backend/pkg/openrouter"
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// collectEvents runs streamFlow with the provided deps, collects every emitted
// NDJSON line and returns (types, rawLines).
func collectEvents(req StreamChatRequest, deps streamDeps) (types []string, lines []string) {
	var mu []string // event lines
	emit := func(line string) {
		mu = append(mu, line)
	}
	streamFlow(context.Background(), req, deps, emit)

	for _, line := range mu {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		var ev struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal([]byte(line), &ev); err == nil {
			types = append(types, ev.Type)
		}
	}
	return types, mu
}

// eventData unmarshals the "data" field of a specific event at position idx.
func eventData(lines []string, idx int, out any) error {
	line := strings.TrimSpace(lines[idx])
	var ev struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal([]byte(line), &ev); err != nil {
		return err
	}
	return json.Unmarshal(ev.Data, out)
}

// noopSaveLog is a save function that does nothing and returns 0.
func noopSaveLog(_ string, _ string, _ string, _ string, _ []models.ChatSource, _ []float32) int64 {
	return 0
}

// fixedSaveLog returns a constant logID.
func fixedSaveLog(id int64) func(string, string, string, string, []models.ChatSource, []float32) int64 {
	return func(_, _, _, _ string, _ []models.ChatSource, _ []float32) int64 {
		return id
	}
}

// noopEmbed is an embed function that returns a tiny dummy vector.
func noopEmbed(_ string) ([]float32, int, error) {
	return []float32{0.1, 0.2}, 5, nil
}

// nilEmbed returns nil — used when we want zero-results without error.
func nilEmbed(_ string) ([]float32, int, error) {
	return nil, 0, nil
}

// fakeStreamLLM builds a streamLLM that replays the given text delta-by-delta
// (each word is a separate delta to stress the suggestion-withholding logic).
func fakeStreamLLM(text string) func(context.Context, string, []openrouter.ChatMessage, func(string)) (string, openrouter.Usage, error) {
	return func(_ context.Context, _ string, _ []openrouter.ChatMessage, onChunk func(string)) (string, openrouter.Usage, error) {
		// Emit word-by-word to exercise the partial-tag buffering path.
		words := strings.Fields(text)
		for i, w := range words {
			if i < len(words)-1 {
				onChunk(w + " ")
			} else {
				onChunk(w)
			}
		}
		return "", openrouter.Usage{}, nil
	}
}

// fakeRetrieve returns a fixed list of chunks.
func fakeRetrieve(chunks []services.RetrievedChunk) func(string, string, []float32) ([]services.RetrievedChunk, error) {
	return func(_, _ string, _ []float32) ([]services.RetrievedChunk, error) {
		return chunks, nil
	}
}

// fakeClassify builds a classify function that always returns the given result.
func fakeClassify(intent, canned string) func(string, string, bool) services.IntentResult {
	return func(_, _ string, _ bool) services.IntentResult {
		return services.IntentResult{Type: intent, CannedResponse: canned}
	}
}

// baseDeps returns a minimal streamDeps suitable as a starting point for tests.
// Individual fields are overridden per test.
func baseDeps() streamDeps {
	return streamDeps{
		classify:         fakeClassify("tech_support", ""),
		buildSearchQuery: func(msg, hist string, have bool) (string, bool, int, int) { return msg, false, 0, 0 },
		embed:            noopEmbed,
		retrieve:         fakeRetrieve(nil),
		streamLLM: func(_ context.Context, _ string, _ []openrouter.ChatMessage, _ func(string)) (string, openrouter.Usage, error) {
			return "", openrouter.Usage{}, nil
		},
		checkBudget:     func(limit int) bool { return true },
		saveLog:         noopSaveLog,
		prompts:         chatconfig.Prompts{BasePrompt: "data_input:"},
		dailyLimit:      100,
		maxContextChars: 8000,
		maxChunkContent: 2000,
	}
}

// ---------------------------------------------------------------------------
// Test: Quick-reply
// ---------------------------------------------------------------------------

// TestStreamFlow_QuickReply verifies that when intent is "greeting" with a
// canned response, only chunk + done are emitted (no status/sources/composing).
func TestStreamFlow_QuickReply(t *testing.T) {
	req := StreamChatRequest{
		Text: "สวัสดี",
		BU:   "test_bu",
		Lang: "th",
	}
	deps := baseDeps()
	deps.classify = fakeClassify("greeting", "สวัสดีครับ ยินดีให้บริการ")
	deps.saveLog = fixedSaveLog(42)

	types, lines := collectEvents(req, deps)

	if len(types) != 2 {
		t.Fatalf("quick-reply: want 2 events, got %d: %v", len(types), types)
	}
	if types[0] != "chunk" {
		t.Errorf("quick-reply: types[0] = %q, want chunk", types[0])
	}
	if types[1] != "done" {
		t.Errorf("quick-reply: types[1] = %q, want done", types[1])
	}

	// chunk data should be the canned response
	var chunkData string
	if err := eventData(lines, 0, &chunkData); err != nil {
		t.Fatalf("parse chunk data: %v", err)
	}
	if chunkData != "สวัสดีครับ ยินดีให้บริการ" {
		t.Errorf("chunk data = %q, want canned response", chunkData)
	}

	// done data should be the logID
	var logID int64
	if err := eventData(lines, 1, &logID); err != nil {
		t.Fatalf("parse done data: %v", err)
	}
	if logID != 42 {
		t.Errorf("done logID = %d, want 42", logID)
	}
}

// ---------------------------------------------------------------------------
// Test: Zero results
// ---------------------------------------------------------------------------

// TestStreamFlow_ZeroResults verifies that when tech_support intent has no
// history and retrieve returns no chunks, the sequence is:
// status(searching) → chunk(apology) → done.
func TestStreamFlow_ZeroResults(t *testing.T) {
	req := StreamChatRequest{
		Text: "ทดสอบระบบ",
		BU:   "test_bu",
		Lang: "th",
		// no history
	}
	deps := baseDeps()
	deps.classify = fakeClassify("tech_support", "")
	deps.embed = nilEmbed                       // returns nil → retrieve not called
	deps.retrieve = fakeRetrieve(nil)           // no chunks
	deps.saveLog = fixedSaveLog(0)

	types, _ := collectEvents(req, deps)

	wantTypes := []string{"status", "chunk", "done"}
	if len(types) != len(wantTypes) {
		t.Fatalf("zero-results: got types %v, want %v", types, wantTypes)
	}
	for i, want := range wantTypes {
		if types[i] != want {
			t.Errorf("zero-results: types[%d] = %q, want %q", i, types[i], want)
		}
	}
}

// ---------------------------------------------------------------------------
// Test: Full path (no history)
// ---------------------------------------------------------------------------

// TestStreamFlow_FullPath verifies the happy-path event sequence for a
// tech_support intent with 2 retrieved chunks and a fake LLM that emits
// "hello [SUGGESTIONS] [\"q1\"]".
// Expected types: status(searching), sources, status(composing), chunk("hello"), suggestions(["q1"]), done.
func TestStreamFlow_FullPath(t *testing.T) {
	req := StreamChatRequest{
		Text: "how to create PO",
		BU:   "test_bu",
		Lang: "en",
		// no history
	}
	chunks := []services.RetrievedChunk{
		{Path: "docs/po.md", Title: "Purchase Order", Content: "PO content here"},
		{Path: "docs/ap.md", Title: "AP Setup", Content: "AP content here"},
	}
	deps := baseDeps()
	deps.classify = fakeClassify("tech_support", "")
	deps.embed = noopEmbed
	deps.retrieve = fakeRetrieve(chunks)
	// LLM emits text then suggestions
	deps.streamLLM = fakeStreamLLM(`hello [SUGGESTIONS] ["q1"]`)
	deps.saveLog = fixedSaveLog(7)

	types, _ := collectEvents(req, deps)

	wantTypes := []string{"status", "sources", "status", "chunk", "suggestions", "done"}
	if len(types) != len(wantTypes) {
		t.Fatalf("full-path: got types %v, want %v", types, wantTypes)
	}
	for i, want := range wantTypes {
		if types[i] != want {
			t.Errorf("full-path: types[%d] = %q, want %q", i, types[i], want)
		}
	}
}

// ---------------------------------------------------------------------------
// Test: History path
// ---------------------------------------------------------------------------

// TestStreamFlow_HistoryPath verifies that when haveHistory is true, the
// very first event is status(analyzing).
func TestStreamFlow_HistoryPath(t *testing.T) {
	req := StreamChatRequest{
		Text: "follow-up question",
		BU:   "test_bu",
		Lang: "th",
		History: []StreamHistoryItem{
			{Sender: "user", Message: "ก่อนหน้า"},
			{Sender: "bot", Message: "คำตอบก่อนหน้า"},
		},
	}
	chunks := []services.RetrievedChunk{
		{Path: "docs/x.md", Title: "X", Content: "some content"},
	}
	deps := baseDeps()
	deps.classify = fakeClassify("tech_support", "")
	deps.embed = noopEmbed
	deps.retrieve = fakeRetrieve(chunks)
	deps.streamLLM = fakeStreamLLM("คำตอบ")
	deps.saveLog = fixedSaveLog(0)

	types, lines := collectEvents(req, deps)

	if len(types) == 0 {
		t.Fatal("history-path: no events emitted")
	}
	if types[0] != "status" {
		t.Errorf("history-path: first event type = %q, want status", types[0])
	}

	// The status data should contain the analyzing string
	var statusData string
	if err := eventData(lines, 0, &statusData); err != nil {
		t.Fatalf("parse status data: %v", err)
	}
	loc := services.GetLocale("th")
	if statusData != loc.StatusAnalyzing {
		t.Errorf("history-path: status data = %q, want %q", statusData, loc.StatusAnalyzing)
	}
}

// ---------------------------------------------------------------------------
// Test: Budget exceeded
// ---------------------------------------------------------------------------

// TestStreamFlow_BudgetExceeded verifies that when checkBudget returns false,
// only chunk(apology) + done(0) are emitted.
func TestStreamFlow_BudgetExceeded(t *testing.T) {
	req := StreamChatRequest{
		Text: "test",
		BU:   "test_bu",
		Lang: "th",
	}
	deps := baseDeps()
	deps.checkBudget = func(_ int) bool { return false }

	types, lines := collectEvents(req, deps)

	if len(types) != 2 {
		t.Fatalf("budget-exceeded: got types %v, want [chunk done]", types)
	}
	if types[0] != "chunk" {
		t.Errorf("budget-exceeded: types[0] = %q, want chunk", types[0])
	}
	if types[1] != "done" {
		t.Errorf("budget-exceeded: types[1] = %q, want done", types[1])
	}

	// done data should be 0
	var logID int64
	if err := eventData(lines, 1, &logID); err != nil {
		t.Fatalf("parse done data: %v", err)
	}
	if logID != 0 {
		t.Errorf("budget-exceeded: done logID = %d, want 0", logID)
	}
}

// ---------------------------------------------------------------------------
// Test: buildHistoryText
// ---------------------------------------------------------------------------

func TestBuildHistoryText(t *testing.T) {
	items := []StreamHistoryItem{
		{Sender: "user", Message: "hello"},
		{Sender: "bot", Message: "world"},
	}
	got := buildHistoryText(items)
	if !strings.Contains(got, "user: hello") {
		t.Errorf("buildHistoryText missing user line: %q", got)
	}
	if !strings.Contains(got, "bot: world") {
		t.Errorf("buildHistoryText missing bot line: %q", got)
	}

	empty := buildHistoryText(nil)
	if empty != "" {
		t.Errorf("buildHistoryText(nil) = %q, want empty", empty)
	}
}

// ---------------------------------------------------------------------------
// Test: chunksToSources
// ---------------------------------------------------------------------------

func TestChunksToSources(t *testing.T) {
	chunks := []services.RetrievedChunk{
		{Path: "a/b.md", Title: "Title A", Content: "c"},
		{Path: "c/d.md", Title: "", Content: "c"},
	}
	sources := chunksToSources(chunks)
	if len(sources) != 2 {
		t.Fatalf("chunksToSources: want 2, got %d", len(sources))
	}
	if sources[0].ArticleID != "a/b.md" || sources[0].Title != "Title A" {
		t.Errorf("sources[0] = %+v", sources[0])
	}
	// Empty title falls back to path
	if sources[1].Title != "c/d.md" {
		t.Errorf("sources[1].Title = %q, want path fallback", sources[1].Title)
	}
}

// ---------------------------------------------------------------------------
// Test: Fix 1 — quick-reply saveLog receives a non-nil embedding
// ---------------------------------------------------------------------------

// TestStreamFlow_QuickReplyEmbedding verifies that the quick-reply path embeds
// req.Text and passes the resulting vector to saveLog (Fix 1).
func TestStreamFlow_QuickReplyEmbedding(t *testing.T) {
	req := StreamChatRequest{
		Text: "สวัสดี",
		BU:   "test_bu",
		Lang: "th",
	}
	deps := baseDeps()
	deps.classify = fakeClassify("greeting", "สวัสดีครับ ยินดีให้บริการ")

	var capturedEmb []float32
	deps.saveLog = func(bu, userID, question, answer string, sources []models.ChatSource, emb []float32) int64 {
		capturedEmb = emb
		return 99
	}
	// noopEmbed returns []float32{0.1, 0.2} — non-nil
	deps.embed = noopEmbed

	types, lines := collectEvents(req, deps)

	if len(types) != 2 || types[0] != "chunk" || types[1] != "done" {
		t.Fatalf("quick-reply-emb: unexpected event sequence %v", types)
	}

	if len(capturedEmb) == 0 {
		t.Error("quick-reply-emb: saveLog received nil/empty embedding, want non-nil (Fix 1)")
	}

	// done logID should be 99 (from our saveLog above)
	var logID int64
	if err := eventData(lines, 1, &logID); err != nil {
		t.Fatalf("parse done data: %v", err)
	}
	if logID != 99 {
		t.Errorf("quick-reply-emb: done logID = %d, want 99", logID)
	}
}

// ---------------------------------------------------------------------------
// Test: Fix 2 — streamLLM error emits apology + done(0) and stops
// ---------------------------------------------------------------------------

// TestStreamFlow_LLMError verifies that when streamLLM returns an error the
// handler emits: status(searching), sources, status(composing), chunk(apology),
// done(0) — and NO suggestions or notices after (Fix 2).
func TestStreamFlow_LLMError(t *testing.T) {
	req := StreamChatRequest{
		Text: "how to create PO",
		BU:   "test_bu",
		Lang: "th",
	}
	chunks := []services.RetrievedChunk{
		{Path: "docs/po.md", Title: "Purchase Order", Content: "PO content here"},
	}
	deps := baseDeps()
	deps.classify = fakeClassify("tech_support", "")
	deps.embed = noopEmbed
	deps.retrieve = fakeRetrieve(chunks)
	deps.streamLLM = func(_ context.Context, _ string, _ []openrouter.ChatMessage, _ func(string)) (string, openrouter.Usage, error) {
		return "", openrouter.Usage{}, errors.New("LLM timeout")
	}

	saveLogCalled := false
	deps.saveLog = func(_, _, _, _ string, _ []models.ChatSource, _ []float32) int64 {
		saveLogCalled = true
		return 0
	}

	types, lines := collectEvents(req, deps)

	// Expected: status(searching), sources, status(composing), chunk(apology), done(0)
	wantTypes := []string{"status", "sources", "status", "chunk", "done"}
	if len(types) != len(wantTypes) {
		t.Fatalf("llm-error: got types %v, want %v", types, wantTypes)
	}
	for i, want := range wantTypes {
		if types[i] != want {
			t.Errorf("llm-error: types[%d] = %q, want %q", i, types[i], want)
		}
	}

	// chunk should contain apology text
	var chunkData string
	if err := eventData(lines, 3, &chunkData); err != nil {
		t.Fatalf("llm-error: parse chunk data: %v", err)
	}
	if !strings.Contains(chunkData, "ขออภัยครับ") {
		t.Errorf("llm-error: chunk data = %q, want apology text", chunkData)
	}

	// done data should be 0
	var logID int64
	if err := eventData(lines, 4, &logID); err != nil {
		t.Fatalf("llm-error: parse done data: %v", err)
	}
	if logID != 0 {
		t.Errorf("llm-error: done logID = %d, want 0", logID)
	}

	// saveLog must NOT have been called (we return before saveLog in the error path)
	if saveLogCalled {
		t.Error("llm-error: saveLog was called, want no call on LLM error")
	}
}

// errEmbed returns a transient embedding error (review finding #5).
func errEmbed(_ string) ([]float32, int, error) {
	return nil, 0, errors.New("embed boom")
}

// TestStreamFlow_EmbedError verifies a transient embedding failure emits an
// error apology + done(0) and does NOT persist a misleading "no info" answer.
func TestStreamFlow_EmbedError(t *testing.T) {
	req := StreamChatRequest{Text: "answerable question", BU: "test_bu", Lang: "th"}
	deps := baseDeps()
	deps.classify = fakeClassify("tech_support", "")
	deps.embed = errEmbed
	saveCalled := false
	deps.saveLog = func(_, _, _, _ string, _ []models.ChatSource, _ []float32) int64 {
		saveCalled = true
		return 0
	}
	types, lines := collectEvents(req, deps)

	wantTypes := []string{"status", "chunk", "done"} // searching, apology, done(0)
	if len(types) != len(wantTypes) {
		t.Fatalf("embed-error: types %v, want %v", types, wantTypes)
	}
	var chunkData string
	_ = eventData(lines, 1, &chunkData)
	if !strings.Contains(chunkData, "ขออภัยครับ") {
		t.Errorf("embed-error: chunk = %q, want apology", chunkData)
	}
	var logID int64
	_ = eventData(lines, 2, &logID)
	if logID != 0 {
		t.Errorf("embed-error: done logID = %d, want 0", logID)
	}
	if saveCalled {
		t.Error("embed-error: saveLog must not be called (no misleading persist)")
	}
}

// TestStreamFlow_FallbackModel verifies that when the primary model fails before
// emitting anything, the configured fallback model is retried (review finding #7).
func TestStreamFlow_FallbackModel(t *testing.T) {
	req := StreamChatRequest{Text: "q", BU: "test_bu", Lang: "th"}
	chunks := []services.RetrievedChunk{{Path: "p.md", Title: "P", Content: "c"}}
	deps := baseDeps()
	deps.classify = fakeClassify("tech_support", "")
	deps.embed = noopEmbed
	deps.retrieve = fakeRetrieve(chunks)
	deps.model = "primary-model"
	deps.fallbackModel = "fallback-model"
	deps.streamLLM = func(_ context.Context, model string, _ []openrouter.ChatMessage, onChunk func(string)) (string, openrouter.Usage, error) {
		if model == "primary-model" {
			return "", openrouter.Usage{}, errors.New("primary down")
		}
		onChunk("fallback answer")
		return "stop", openrouter.Usage{}, nil
	}
	deps.saveLog = fixedSaveLog(7)
	types, lines := collectEvents(req, deps)

	// Must NOT be the error path: last two events are chunk(answer) then done(7).
	if types[len(types)-1] != "done" {
		t.Fatalf("fallback: last type = %q, want done", types[len(types)-1])
	}
	var logID int64
	_ = eventData(lines, len(lines)-1, &logID)
	if logID != 7 {
		t.Errorf("fallback: done logID = %d, want 7 (fallback succeeded)", logID)
	}
	joined := strings.Join(lines, "")
	if !strings.Contains(joined, "fallback answer") {
		t.Error("fallback: expected the fallback model's answer in the stream")
	}
	if strings.Contains(joined, "เกิดข้อผิดพลาดในการสร้างคำตอบ") {
		t.Error("fallback: error apology emitted despite a working fallback model")
	}
}

// TestBuildContextFromChunks_RuneSafeTruncation verifies multibyte Thai content
// is truncated on a rune boundary (review finding #8) — no broken UTF-8.
func TestBuildContextFromChunks_RuneSafeTruncation(t *testing.T) {
	thai := strings.Repeat("ก", 3000) // 3000 Thai runes (9000 bytes)
	chunks := []services.RetrievedChunk{{Path: "p.md", Title: "P", Content: thai}}
	ctx, _ := buildContextFromChunks(chunks, 1_000_000, 2000) // maxChunkContent = 2000 runes
	if !utf8.ValidString(ctx) {
		t.Error("context is not valid UTF-8 — byte-slice truncation split a Thai rune")
	}
	if got := strings.Count(ctx, "ก"); got != 2000 {
		t.Errorf("truncated to %d ก runes, want 2000", got)
	}
}
