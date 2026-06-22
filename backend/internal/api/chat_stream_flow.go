package api

import (
	"context"
	"log"
	"strings"

	"github.com/new-carmen/backend/internal/chatconfig"
	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/services"
	"github.com/new-carmen/backend/internal/utils"
	"github.com/new-carmen/backend/pkg/openrouter"
)

// streamDeps holds all injectable dependencies for streamFlow.
// All fields are plain functions so tests can provide fakes without any
// network, database, or LLM calls.
type streamDeps struct {
	// classify returns an IntentResult for message/lang/haveHistory.
	classify func(message, lang string, haveHistory bool) services.IntentResult
	// buildSearchQuery rewrites/translates the query for retrieval.
	buildSearchQuery func(message, historyText string, haveHistory bool) (query string, wasRewritten bool, inTok, outTok int)
	// embed converts text to a float32 vector (second return is token count).
	embed func(text string) ([]float32, int, error)
	// retrieve performs hybrid vector+keyword search and returns ranked chunks.
	retrieve func(bu, question string, emb []float32) ([]services.RetrievedChunk, error)
	// streamLLM streams a chat completion, calling onChunk for each delta.
	// Returns (finishReason, Usage, error).
	streamLLM func(ctx context.Context, model string, msgs []openrouter.ChatMessage, onChunk func(string)) (string, openrouter.Usage, error)
	// checkBudget reports whether the daily limit has not been exceeded and
	// increments the counter.  Returns false when the limit is already reached.
	checkBudget func(limit int) bool
	// saveLog persists the Q&A and returns the new chat_history row id.
	// bu: BU slug, userID: raw (will be hashed internally via defaultSaveLog),
	// question: raw (will be PII-masked).
	saveLog func(bu, userID, question, answer string, sources []models.ChatSource, emb []float32) int64
	// prompts are the loaded YAML prompt templates (BASE_PROMPT etc.).
	prompts chatconfig.Prompts
	// dailyLimit is the configured DailyRequestLimit (0 = unlimited).
	dailyLimit int
	// model is the LLM model name; empty falls back to the client default.
	model string
	// maxContextChars and maxChunkContent tune how much context to pass to LLM.
	maxContextChars int
	maxChunkContent int
}

// quickReplyIntents is the set of intent types that are answered with a canned
// response — no retrieval or LLM needed.
var quickReplyIntents = map[string]bool{
	"greeting":     true,
	"thanks":       true,
	"out_of_scope": true,
	"company_info": true,
	"capabilities": true,
}

// streamFlow runs the full native streaming orchestration and calls emit for
// each NDJSON line.  It is designed to be called from a Fiber streaming handler;
// in tests, emit is a simple append-to-slice function.
//
// Event sequence:
//  1. Budget gate
//  2. Intent classify
//  3. Quick-reply branch (greeting/thanks/out_of_scope/company_info/capabilities)
//  4. Locale + historyText build
//  5. Analyzing status (only when haveHistory)
//  6. buildSearchQuery
//  7. Searching status
//  8. embed + retrieve
//  9. Zero-results branch
//  10. Sources event
//  11. Composing status
//  12. Build context + messages, stream LLM with [SUGGESTIONS] withholding
//  13. After stream: flush remaining clean text, emit suggestions if any
//  14. Truncation / empty notices
//  15. saveLog; done(logID)
func streamFlow(ctx context.Context, req StreamChatRequest, deps streamDeps, emit func(string)) {
	// ---------- 1. Budget gate ----------
	if !deps.checkBudget(deps.dailyLimit) {
		emit(streamEvent("chunk", "_(ขออภัยครับ ระบบมีการใช้งานเกินกำหนดสำหรับวันนี้ กรุณาลองใหม่พรุ่งนี้)_"))
		emit(streamEvent("done", 0))
		return
	}

	// ---------- 2. Intent classify ----------
	haveHistory := len(req.History) > 0
	intRes := deps.classify(req.Text, req.Lang, haveHistory)

	// ---------- 3. Quick-reply branch ----------
	if quickReplyIntents[intRes.Type] {
		canned := intRes.CannedResponse
		if canned == "" {
			canned = "_(ขออภัย ไม่สามารถตอบคำถามนี้ได้)_"
		}
		emit(streamEvent("chunk", canned))
		logID := deps.saveLog(req.BU, req.Username, req.Text, canned, nil, nil)
		emit(streamEvent("done", logID))
		return
	}

	// ---------- 4. Locale + history text ----------
	locale := services.GetLocale(req.Lang)
	historyText := buildHistoryText(req.History)

	// ---------- 5. Analyzing status (only when history is present) ----------
	if haveHistory {
		emit(streamEvent("status", locale.StatusAnalyzing))
	}

	// ---------- 6. buildSearchQuery ----------
	searchQuery, _, _, _ := deps.buildSearchQuery(req.Text, historyText, haveHistory)
	if searchQuery == "" {
		searchQuery = req.Text
	}

	// ---------- 7. Searching status ----------
	emit(streamEvent("status", locale.StatusSearching))

	// ---------- 8. embed + retrieve ----------
	var emb []float32
	emb, _, _ = deps.embed(searchQuery)
	var chunks []services.RetrievedChunk
	if emb != nil {
		chunks, _ = deps.retrieve(req.BU, searchQuery, emb)
	}

	// ---------- 9. Zero-results branch ----------
	if len(chunks) == 0 {
		noInfo := noInfoApology(req.Lang)
		emit(streamEvent("chunk", noInfo))
		logID := deps.saveLog(req.BU, req.Username, req.Text, noInfo, nil, emb)
		emit(streamEvent("done", logID))
		return
	}

	// ---------- 10. Sources ----------
	sources := chunksToSources(chunks)
	emit(streamEvent("sources", sources))

	// ---------- 11. Composing status ----------
	emit(streamEvent("status", locale.StatusComposing))

	// ---------- 12. Build context + messages ----------
	maxCC := deps.maxContextChars
	if maxCC <= 0 {
		maxCC = 8000
	}
	maxCK := deps.maxChunkContent
	if maxCK <= 0 {
		maxCK = 2000
	}
	contextStr, _ := buildContextFromChunks(chunks, maxCC, maxCK)
	messages := services.BuildChatMessages(deps.prompts, req.Lang, contextStr, historyText, req.Text)

	// ---------- 13. Stream with [SUGGESTIONS] withholding ----------
	// Accumulate the full LLM output and emit chunk deltas only for the portion
	// before [SUGGESTIONS].  Because the tag can split across deltas, we buffer
	// from the first '[' onward and re-check on every new delta.
	var (
		full       strings.Builder // accumulates entire LLM output
		emittedLen int             // bytes of *clean* text already emitted as chunks
		tagFound   bool            // true once "[SUGGESTIONS]" has been seen in the stream
	)

	const suggTag = "[SUGGESTIONS]"

	onChunk := func(delta string) {
		if tagFound {
			// After the tag is confirmed — just accumulate; do not emit.
			full.WriteString(delta)
			return
		}

		full.WriteString(delta)
		current := full.String()

		// Check if the tag is now fully present in the accumulated text.
		tagIdx := strings.Index(current, suggTag)
		if tagIdx >= 0 {
			tagFound = true
			// Emit only the clean portion (before the tag) that hasn't been emitted yet.
			cleanPart := current[:tagIdx]
			if len(cleanPart) > emittedLen {
				emit(streamEvent("chunk", cleanPart[emittedLen:]))
				emittedLen = len(cleanPart)
			}
			return
		}

		// Tag not yet fully arrived.  Emit up to the last '[' (which could be
		// the start of a partial "[SUGGESTIONS]" tag).
		safeEnd := strings.LastIndex(current, "[")
		if safeEnd < 0 {
			safeEnd = len(current) // no '[' at all — safe to emit everything
		}
		if safeEnd > emittedLen {
			emit(streamEvent("chunk", current[emittedLen:safeEnd]))
			emittedLen = safeEnd
		}
	}

	finishReason, _, _ := deps.streamLLM(ctx, deps.model, messages, onChunk)

	// ---------- 14. Flush remaining clean text, suggestions, notices ----------
	fullText := full.String()
	clean, suggestions := services.ExtractSuggestions(fullText)

	// Emit any clean text that the streaming loop held back.
	if len(clean) > emittedLen {
		emit(streamEvent("chunk", clean[emittedLen:]))
	}

	if len(suggestions) > 0 {
		emit(streamEvent("suggestions", suggestions))
	}

	// Truncation notice
	if finishReason == "length" || finishReason == "max_tokens" {
		emit(streamEvent("chunk", services.TruncationNotice(req.Lang)))
	}

	// Empty response notice
	if strings.TrimSpace(clean) == "" {
		emit(streamEvent("chunk", services.EmptyResponseNotice(req.Lang)))
	}

	// ---------- 15. saveLog; done ----------
	logID := deps.saveLog(req.BU, req.Username, req.Text, clean, sources, emb)
	emit(streamEvent("done", logID))
}

// buildHistoryText converts the history slice into the plain text format that
// QueryRewriteService and HumanMessage expect.
func buildHistoryText(history []StreamHistoryItem) string {
	if len(history) == 0 {
		return ""
	}
	var b strings.Builder
	for _, h := range history {
		b.WriteString(h.Sender)
		b.WriteString(": ")
		b.WriteString(h.Message)
		b.WriteString("\n")
	}
	return strings.TrimRight(b.String(), "\n")
}

// chunksToSources converts retrieved chunks to the ChatSource slice used by
// the sources stream event and the log save.
func chunksToSources(chunks []services.RetrievedChunk) []models.ChatSource {
	out := make([]models.ChatSource, 0, len(chunks))
	for _, ch := range chunks {
		title := strings.TrimSpace(ch.Title)
		if title == "" {
			title = ch.Path
		}
		out = append(out, models.ChatSource{ArticleID: ch.Path, Title: title})
	}
	return out
}

// noInfoApology returns a language-appropriate "no information found" message.
func noInfoApology(lang string) string {
	if lang == "en" {
		return "_(I'm sorry, I couldn't find relevant information in the knowledge base for your question. Please try rephrasing or contact support.)_"
	}
	return "_(ขออภัยครับ ไม่พบข้อมูลที่เกี่ยวข้องในคู่มือสำหรับคำถามนี้ กรุณาลองถามใหม่หรือติดต่อทีมสนับสนุน)_"
}

// defaultSaveLog builds a saveLog function backed by a real ChatHistoryService.
// question will be PII-masked and userID will be hashed before persistence
// (hash happens inside ChatHistoryService.SaveWithID).
func defaultSaveLog(svc *services.ChatHistoryService) func(bu, userID, question, answer string, sources []models.ChatSource, emb []float32) int64 {
	return func(bu, userID, question, answer string, sources []models.ChatSource, emb []float32) (logID int64) {
		// Logging must never crash an in-flight stream: a DB outage should
		// degrade to log_id 0, not panic and drop the user's answer.
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[chat] stream save log panic recovered: %v", r)
				logID = 0
			}
		}()
		maskedQ := utils.MaskPII(question)
		buID, err := svc.GetBUIDFromSlug(bu)
		if err != nil || buID == 0 {
			return 0
		}
		id, err := svc.SaveWithID(buID, userID, maskedQ, answer, sources, emb)
		if err != nil {
			return 0
		}
		return id
	}
}

// newStreamDepsFromHandler wires up streamDeps from a real ChatHandler.
// Task 6 calls this to build the deps for the Fiber streaming handler.
func newStreamDepsFromHandler(h *ChatHandler, dailyLimit, maxContextChars, maxChunkContent int, model string, prompts chatconfig.Prompts) streamDeps {
	return streamDeps{
		classify:         h.intentRouter.Classify,
		buildSearchQuery: h.rewrite.BuildSearchQuery,
		embed: func(text string) ([]float32, int, error) {
			return h.embedLLM.EmbeddingWithTokens(text)
		},
		retrieve: h.retrieval.Retrieve,
		streamLLM: func(ctx context.Context, model string, msgs []openrouter.ChatMessage, onChunk func(string)) (string, openrouter.Usage, error) {
			return h.llm.StreamAnswer(ctx, model, msgs, onChunk)
		},
		checkBudget:     h.budget.CheckAndIncrement,
		saveLog:         defaultSaveLog(h.historyService),
		prompts:         prompts,
		dailyLimit:      dailyLimit,
		model:           model,
		maxContextChars: maxContextChars,
		maxChunkContent: maxChunkContent,
	}
}
