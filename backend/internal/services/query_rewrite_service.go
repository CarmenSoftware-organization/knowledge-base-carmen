package services

import (
	"log"
	"os"
	"strings"

	"github.com/new-carmen/backend/internal/chatconfig"
	"github.com/new-carmen/backend/internal/utils"
	"github.com/new-carmen/backend/pkg/openrouter"
)

// QueryRewriteService rewrites an ambiguous follow-up question into a
// standalone search query, then translates non-Thai queries to Thai so they
// match the Thai knowledge base.
//
// Both LLM calls are injected as plain functions so tests can replace them
// with fakes without touching any network.
type QueryRewriteService struct {
	rewriteTemplate   string
	translateTemplate string
	rewriteLLM        func(prompt string) (string, int, int, error)
	translateLLM      func(prompt string) (string, int, int, error)
}

// configDirForRewrite returns the chat config directory.
// Reuses the same CHAT_CONFIG_DIR-aware logic already used by retrieval_service.go.
func configDirForRewrite() string {
	if d := os.Getenv("CHAT_CONFIG_DIR"); d != "" {
		return d
	}
	return chatconfig.DefaultDir()
}

// NewQueryRewriteService loads prompt templates from prompts.yaml and wires
// both LLM funcs to openrouter.ClassifyIntent (a single-turn chat completion
// that already returns content + token counts). If config load fails the
// service is returned with empty templates and a warning; it will not panic.
func NewQueryRewriteService() *QueryRewriteService {
	s := &QueryRewriteService{}

	dir := configDirForRewrite()
	prompts, err := chatconfig.LoadPrompts(dir)
	if err != nil {
		log.Printf("[query_rewrite] prompts load failed, rewrite/translate disabled: %v", err)
		return s
	}
	s.rewriteTemplate = prompts.RewritePrompt
	s.translateTemplate = prompts.TranslatePrompt

	client := openrouter.NewClient()
	s.rewriteLLM = client.ClassifyIntent
	s.translateLLM = client.ClassifyIntent

	return s
}

// BuildSearchQuery turns a potentially context-dependent message into a
// self-contained Thai search query ready for hybrid retrieval.
//
// Steps:
//  1. If haveHistory: call rewriteLLM with the REWRITE_PROMPT template
//     ({history} and {question} substituted). On success, update query;
//     wasRewritten = (result != original message). On error, log and keep
//     query = message (best-effort, never panics).
//  2. If ThaiRatio(query) < 0.15 (non-Thai text): call translateLLM with the
//     TRANSLATE_PROMPT template ({query} substituted). On success, update
//     query. On error, log and keep query unchanged.
//
// Returned tokens are the sum of both LLM calls.
func (s *QueryRewriteService) BuildSearchQuery(message, historyText string, haveHistory bool) (query string, wasRewritten bool, inTok, outTok int) {
	query = message
	wasRewritten = false

	// Step 1 — rewrite if we have conversation history.
	if haveHistory && s.rewriteLLM != nil && s.rewriteTemplate != "" {
		prompt := strings.ReplaceAll(s.rewriteTemplate, "{history}", historyText)
		prompt = strings.ReplaceAll(prompt, "{question}", message)

		result, iIn, iOut, err := s.rewriteLLM(prompt)
		if err != nil {
			log.Printf("[query_rewrite] rewrite LLM error (falling back to original): %v", err)
		} else {
			trimmed := strings.TrimSpace(result)
			wasRewritten = trimmed != message
			query = trimmed
			inTok += iIn
			outTok += iOut
		}
	}

	// Step 2 — translate if the (possibly rewritten) query is not Thai.
	if utils.ThaiRatio(query) < 0.15 && s.translateLLM != nil && s.translateTemplate != "" {
		prompt := strings.ReplaceAll(s.translateTemplate, "{query}", query)

		result, tIn, tOut, err := s.translateLLM(prompt)
		if err != nil {
			log.Printf("[query_rewrite] translate LLM error (keeping query as-is): %v", err)
		} else {
			query = strings.TrimSpace(result)
			inTok += tIn
			outTok += tOut
		}
	}

	return
}
