package services

import (
	"errors"
	"strings"
	"testing"
)

// captureLLM is a test double for the LLM injection points. It records the
// last prompt it received so assertions can verify placeholder substitution.
type captureLLM struct {
	lastPrompt string
	response   string
	inTok      int
	outTok     int
	err        error
}

func (c *captureLLM) call(prompt string) (string, int, int, error) {
	c.lastPrompt = prompt
	return c.response, c.inTok, c.outTok, c.err
}

// TestBuildSearchQuery_NoHistory_ThaiQuery: no history + Thai → returns message
// unchanged, wasRewritten=false, 0 tokens, no LLM called.
func TestBuildSearchQuery_NoHistory_ThaiQuery(t *testing.T) {
	rewriteLLM := &captureLLM{response: "rewritten", inTok: 5, outTok: 3}
	translateLLM := &captureLLM{response: "แปลแล้ว", inTok: 4, outTok: 2}

	svc := &QueryRewriteService{
		rewriteTemplate:   "{history}\n{question}",
		translateTemplate: "{query}",
		rewriteLLM:        rewriteLLM.call,
		translateLLM:      translateLLM.call,
	}

	msg := "วิธีใช้ระบบ" // Thai query — ThaiRatio ≥ 0.15
	query, wasRewritten, inTok, outTok := svc.BuildSearchQuery(msg, "", false)

	if query != msg {
		t.Errorf("query = %q, want %q", query, msg)
	}
	if wasRewritten {
		t.Errorf("wasRewritten = true, want false")
	}
	if inTok != 0 {
		t.Errorf("inTok = %d, want 0", inTok)
	}
	if outTok != 0 {
		t.Errorf("outTok = %d, want 0", outTok)
	}
	// no LLM should have been called
	if rewriteLLM.lastPrompt != "" {
		t.Errorf("rewriteLLM was called but should not have been (haveHistory=false)")
	}
	if translateLLM.lastPrompt != "" {
		t.Errorf("translateLLM was called but should not have been (Thai query)")
	}
}

// TestBuildSearchQuery_WithHistory_RewritesCalled: when haveHistory is true,
// rewriteLLM is called with the substituted {history}/{question} prompt;
// wasRewritten is true when the output differs; tokens are summed.
func TestBuildSearchQuery_WithHistory_RewritesCalled(t *testing.T) {
	rewriteLLM := &captureLLM{response: "  rewritten query  ", inTok: 10, outTok: 5}
	translateLLM := &captureLLM{response: "translated", inTok: 4, outTok: 2}

	svc := &QueryRewriteService{
		rewriteTemplate:   "History: {history}\nQuestion: {question}",
		translateTemplate: "Translate: {query}",
		rewriteLLM:        rewriteLLM.call,
		translateLLM:      translateLLM.call,
	}

	msg := "still not working"
	history := "User asked about Login failed"

	query, wasRewritten, inTok, outTok := svc.BuildSearchQuery(msg, history, true)

	// rewriteLLM must have been called
	if rewriteLLM.lastPrompt == "" {
		t.Fatal("rewriteLLM was not called")
	}
	// prompt must not contain raw placeholders
	if strings.Contains(rewriteLLM.lastPrompt, "{history}") {
		t.Errorf("rewriteLLM prompt still has {history} placeholder: %q", rewriteLLM.lastPrompt)
	}
	if strings.Contains(rewriteLLM.lastPrompt, "{question}") {
		t.Errorf("rewriteLLM prompt still has {question} placeholder: %q", rewriteLLM.lastPrompt)
	}
	// prompt must contain the actual history and message text
	if !strings.Contains(rewriteLLM.lastPrompt, history) {
		t.Errorf("rewriteLLM prompt missing history %q: got %q", history, rewriteLLM.lastPrompt)
	}
	if !strings.Contains(rewriteLLM.lastPrompt, msg) {
		t.Errorf("rewriteLLM prompt missing message %q: got %q", msg, rewriteLLM.lastPrompt)
	}

	// "rewritten query" is English → translateLLM is also called; final query
	// is the translate output ("translated"), not the intermediate rewrite.
	if query != "translated" {
		t.Errorf("query = %q, want %q (translate step runs after rewrite)", query, "translated")
	}
	if !wasRewritten {
		t.Errorf("wasRewritten = false, want true (rewrite output differs from message)")
	}
	// tokens are the sum of both LLM calls (rewrite + translate)
	if inTok != 10+4 {
		t.Errorf("inTok = %d, want %d", inTok, 10+4)
	}
	if outTok != 5+2 {
		t.Errorf("outTok = %d, want %d", outTok, 5+2)
	}
}

// TestBuildSearchQuery_NonThai_TranslateCalled: non-Thai query (no history)
// → translateLLM called; query = translate output; tokens accumulate.
func TestBuildSearchQuery_NonThai_TranslateCalled(t *testing.T) {
	rewriteLLM := &captureLLM{response: "irrelevant", inTok: 5, outTok: 3}
	translateLLM := &captureLLM{response: "วิธีรีเซ็ตรหัสผ่าน", inTok: 7, outTok: 4}

	svc := &QueryRewriteService{
		rewriteTemplate:   "History: {history}\nQuestion: {question}",
		translateTemplate: "Translate: {query}",
		rewriteLLM:        rewriteLLM.call,
		translateLLM:      translateLLM.call,
	}

	msg := "how to reset password" // English — ThaiRatio = 0
	query, _, inTok, outTok := svc.BuildSearchQuery(msg, "", false)

	// translateLLM must have been called
	if translateLLM.lastPrompt == "" {
		t.Fatal("translateLLM was not called for non-Thai query")
	}
	if strings.Contains(translateLLM.lastPrompt, "{query}") {
		t.Errorf("translateLLM prompt still has {query} placeholder: %q", translateLLM.lastPrompt)
	}
	if !strings.Contains(translateLLM.lastPrompt, msg) {
		t.Errorf("translateLLM prompt missing message %q: got %q", msg, translateLLM.lastPrompt)
	}

	if query != "วิธีรีเซ็ตรหัสผ่าน" {
		t.Errorf("query = %q, want Thai translated output", query)
	}
	// only translate called (no history); rewrite must NOT have been called
	if rewriteLLM.lastPrompt != "" {
		t.Errorf("rewriteLLM was called but should not have been (haveHistory=false)")
	}
	if inTok != 7 {
		t.Errorf("inTok = %d, want 7 (only translate)", inTok)
	}
	if outTok != 4 {
		t.Errorf("outTok = %d, want 4 (only translate)", outTok)
	}
}

// TestBuildSearchQuery_RewriteError_FallsBack: when rewriteLLM returns an
// error, the service falls back to the original message, wasRewritten=false,
// and does not panic.
func TestBuildSearchQuery_RewriteError_FallsBack(t *testing.T) {
	rewriteLLM := &captureLLM{err: errors.New("llm unavailable")}
	translateLLM := &captureLLM{response: "translated", inTok: 4, outTok: 2}

	svc := &QueryRewriteService{
		rewriteTemplate:   "History: {history}\nQuestion: {question}",
		translateTemplate: "Translate: {query}",
		rewriteLLM:        rewriteLLM.call,
		translateLLM:      translateLLM.call,
	}

	msg := "how to reset password"
	history := "User asked about Login"
	_, wasRewritten, _, _ := svc.BuildSearchQuery(msg, history, true)

	if wasRewritten {
		t.Errorf("wasRewritten = true, want false after rewrite error")
	}
	// must not panic — if we got here, that is confirmed
}

// TestBuildSearchQuery_PromptPlaceholders_Exact verifies that the EXACT
// placeholder names from prompts.yaml ({history}/{question} for rewrite,
// {query} for translate) are substituted and not left in the prompt.
func TestBuildSearchQuery_PromptPlaceholders_Exact(t *testing.T) {
	var capturedRewrite, capturedTranslate string

	svc := &QueryRewriteService{
		rewriteTemplate:   "H={history} Q={question}",
		translateTemplate: "T={query}",
		rewriteLLM: func(prompt string) (string, int, int, error) {
			capturedRewrite = prompt
			return "rewritten", 1, 1, nil
		},
		translateLLM: func(prompt string) (string, int, int, error) {
			capturedTranslate = prompt
			return "แปลแล้ว", 1, 1, nil
		},
	}

	svc.BuildSearchQuery("what is login", "past convo", true)

	// --- rewrite prompt assertions ---
	if !strings.Contains(capturedRewrite, "past convo") {
		t.Errorf("rewrite prompt missing history substitution: %q", capturedRewrite)
	}
	if !strings.Contains(capturedRewrite, "what is login") {
		t.Errorf("rewrite prompt missing question substitution: %q", capturedRewrite)
	}
	if strings.Contains(capturedRewrite, "{history}") || strings.Contains(capturedRewrite, "{question}") {
		t.Errorf("rewrite prompt has unreplaced placeholders: %q", capturedRewrite)
	}

	// "rewritten" is English → translate is called
	// --- translate prompt assertions ---
	if !strings.Contains(capturedTranslate, "rewritten") {
		t.Errorf("translate prompt missing rewritten query: %q", capturedTranslate)
	}
	if strings.Contains(capturedTranslate, "{query}") {
		t.Errorf("translate prompt has unreplaced {query} placeholder: %q", capturedTranslate)
	}
}

// TestBuildSearchQuery_WasRewritten_FalseWhenSameOutput: wasRewritten must be
// false when the LLM returns the same text as the original message.
func TestBuildSearchQuery_WasRewritten_FalseWhenSameOutput(t *testing.T) {
	msg := "วิธีใช้ระบบ" // Thai — translate step will not fire
	rewriteLLM := &captureLLM{response: msg, inTok: 3, outTok: 1} // same as input

	svc := &QueryRewriteService{
		rewriteTemplate:   "{history}\n{question}",
		translateTemplate: "{query}",
		rewriteLLM:        rewriteLLM.call,
		translateLLM:      nil,
	}

	query, wasRewritten, inTok, outTok := svc.BuildSearchQuery(msg, "some history", true)

	if query != msg {
		t.Errorf("query = %q, want %q", query, msg)
	}
	if wasRewritten {
		t.Errorf("wasRewritten = true, want false (LLM returned same text)")
	}
	if inTok != 3 || outTok != 1 {
		t.Errorf("tokens = (%d, %d), want (3, 1)", inTok, outTok)
	}
}
