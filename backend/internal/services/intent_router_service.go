package services

import (
	"fmt"
	"log"
	"regexp"
	"strings"
	"sync"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/chatconfig"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/utils"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/pkg/openrouter"
)

// IntentResult holds the output of the intent classification pipeline.
type IntentResult struct {
	Type            string
	CannedResponse  string
	LLMInputTokens  int
	LLMOutputTokens int
	EmbedTokens     int    // prompt-token count from the intent embedding call
	Source          string
}

// IntentRouterService orchestrates the three-tier intent classification:
// regex → vector → LLM. All functional dependencies are injectable for testing.
type IntentRouterService struct {
	idx         *IntentIndex
	tuning      chatconfig.IntentTuning
	embedOne    func(string) ([]float32, int, error)
	classifyLLM func(prompt string) (intent string, inTok, outTok int, err error)
	intents     map[string]chatconfig.Intent
	embedBatch  func([]string) ([][]float32, error)
	idxOnce     sync.Once
}

var intentKeywords = []string{
	"GREETING", "THANKS", "COMPANY_INFO", "CAPABILITIES",
	"OUT_OF_SCOPE", "CONFUSION", "TECH_SUPPORT",
}

var intentSplit = regexp.MustCompile(`[\s.,!?-]+`)

func defaultIntentTuning() chatconfig.IntentTuning {
	return chatconfig.IntentTuning{
		DefaultThreshold: 0.90, SoftZoneMin: 0.75, SoftZoneVotes: 2,
		CategoryThresholds: map[string]float64{
			"greeting": 0.90, "thanks": 0.90, "company_info": 0.82,
			"capabilities": 0.88, "out_of_scope": 0.88, "confusion": 0.92,
		},
	}
}

// ParseIntentWord extracts the first recognized intent category word from an
// LLM reply. Splits on whitespace/punctuation, uppercases each token, and
// returns the lowercase keyword if recognized; "" otherwise.
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

// BuildIntentPrompt assembles the LLM classification prompt, optionally
// embedding a semantic hint from the vector tier when score >= softZoneMin.
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

// NewIntentRouterService builds a production IntentRouterService. It loads
// tuning and intents from the CHAT_CONFIG_DIR-aware config directory (cheap,
// no network) and wires up the live embedOne and classifyLLM functions.
// The vector index is built lazily on the first classification request via
// ensureIndex() so that server startup never blocks on the LLM endpoint.
func NewIntentRouterService() *IntentRouterService {
	dir := ConfigDir()
	tuning := defaultIntentTuning()
	if t, err := chatconfig.LoadTuning(dir); err == nil {
		tuning = t.Intent
	} else {
		log.Printf("[intent] tuning load failed, using defaults: %v", err)
	}

	if config.AppConfig == nil {
		return &IntentRouterService{tuning: tuning}
	}

	client := openrouter.NewClient()
	s := &IntentRouterService{
		tuning:      tuning,
		embedOne:    client.EmbeddingWithTokens,
		classifyLLM: client.ClassifyIntent,
		embedBatch:  client.EmbeddingBatch,
	}

	if intents, err := chatconfig.LoadIntents(dir); err != nil {
		log.Printf("[intent] intents load failed: %v", err)
	} else {
		s.intents = intents
	}

	return s
}

// ensureIndex lazily builds the vector index on the first call. It is
// race-safe via sync.Once. If idx was injected directly (tests), it is a no-op.
func (s *IntentRouterService) ensureIndex() {
	s.idxOnce.Do(func() {
		if s.idx != nil { // already injected (tests) — do not rebuild
			return
		}
		if s.intents == nil || s.embedBatch == nil {
			return
		}
		idx, err := BuildIntentIndex(s.intents, s.tuning, s.embedBatch)
		if err != nil {
			log.Printf("[intent] lazy index build failed (regex+LLM only): %v", err)
			return
		}
		s.idx = idx
	})
}

// Classify runs the three-tier pipeline: regex → vector → LLM.
func (s *IntentRouterService) Classify(message, lang string, haveHistory bool) IntentResult {
	// Tier 1 — regex fast-track
	if intent, ok := RegexIntent(message, haveHistory); ok {
		return IntentResult{Type: intent, CannedResponse: s.canned(intent, lang), Source: "regex"}
	}

	// Tier 2 — vector index
	s.ensureIndex()
	var vecBestIntent string
	var vecBestScore float64
	embedTokens := 0
	if s.idx != nil && s.embedOne != nil {
		if emb, tok, err := s.embedOne(message); err == nil {
			embedTokens = tok
			if m, ok := s.idx.Match(emb, haveHistory); ok {
				return IntentResult{
					Type:           m.Intent,
					CannedResponse: s.canned(m.Intent, lang),
					EmbedTokens:    embedTokens,
					Source:         m.Source,
				}
			}
			// Capture the top vector result to use as a hint for the LLM prompt.
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
		return IntentResult{
			Type:            "tech_support",
			LLMInputTokens:  inTok,
			LLMOutputTokens: outTok,
			EmbedTokens:     embedTokens,
			Source:          "llm",
		}
	}
	return IntentResult{
		Type:            intent,
		CannedResponse:  s.canned(intent, lang),
		LLMInputTokens:  inTok,
		LLMOutputTokens: outTok,
		EmbedTokens:     embedTokens,
		Source:          "llm",
	}
}

// canned returns the pre-written response for the given intent and language,
// or "" if the index is not available or no canned response exists.
func (s *IntentRouterService) canned(intent, lang string) string {
	if s.idx != nil {
		return s.idx.Canned(intent, lang)
	}
	return ""
}
