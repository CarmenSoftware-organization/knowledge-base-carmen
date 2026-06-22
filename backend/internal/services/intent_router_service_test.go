package services

import (
	"strings"
	"testing"

	"github.com/new-carmen/backend/internal/chatconfig"
	"github.com/new-carmen/backend/internal/utils"
)

func TestParseIntentWord(t *testing.T) {
	cases := map[string]string{
		"GREETING":                    "greeting",
		"  thanks  ":                  "thanks",
		"The answer is TECH_SUPPORT.": "tech_support",
		"banana":                      "",
		"":                            "",
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
		tuning: intentTuning(),
		idx:    nil, // no vector tier → straight to LLM
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
