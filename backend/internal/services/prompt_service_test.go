package services

import (
	"strings"
	"testing"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/chatconfig"
)

// ---------------------------------------------------------------------------
// GetLocale
// ---------------------------------------------------------------------------

func TestGetLocale_Thai(t *testing.T) {
	loc := GetLocale("th")
	if loc.StatusAnalyzing != "กำลังวิเคราะห์คำถาม..." {
		t.Errorf("StatusAnalyzing wrong: %q", loc.StatusAnalyzing)
	}
	if loc.StatusSearching != "กำลังค้นหาและคัดกรองข้อมูล..." {
		t.Errorf("StatusSearching wrong: %q", loc.StatusSearching)
	}
	if loc.StatusComposing != "กำลังเรียบเรียงคำตอบ..." {
		t.Errorf("StatusComposing wrong: %q", loc.StatusComposing)
	}
	if loc.Preface != "จากข้อมูลในคู่มือ" {
		t.Errorf("Preface wrong: %q", loc.Preface)
	}
	if !strings.Contains(loc.Instruction, "Thai") {
		t.Errorf("Instruction should mention Thai: %q", loc.Instruction)
	}
}

func TestGetLocale_English(t *testing.T) {
	loc := GetLocale("en")
	if loc.StatusAnalyzing != "Analyzing your question..." {
		t.Errorf("StatusAnalyzing wrong: %q", loc.StatusAnalyzing)
	}
	if loc.StatusSearching != "Searching and filtering data..." {
		t.Errorf("StatusSearching wrong: %q", loc.StatusSearching)
	}
	if loc.StatusComposing != "Composing response..." {
		t.Errorf("StatusComposing wrong: %q", loc.StatusComposing)
	}
	if loc.Preface != "Based on the manual" {
		t.Errorf("Preface wrong: %q", loc.Preface)
	}
	if !strings.Contains(loc.Instruction, "English") {
		t.Errorf("Instruction should mention English: %q", loc.Instruction)
	}
}

func TestGetLocale_DefaultEmpty(t *testing.T) {
	loc := GetLocale("")
	// default is th
	if loc.Preface != "จากข้อมูลในคู่มือ" {
		t.Errorf("Default locale should be th, got Preface: %q", loc.Preface)
	}
}

func TestGetLocale_UnknownFallsToTh(t *testing.T) {
	loc := GetLocale("fr")
	if loc.Preface != "จากข้อมูลในคู่มือ" {
		t.Errorf("Unknown locale should fall back to th, got Preface: %q", loc.Preface)
	}
}

// ---------------------------------------------------------------------------
// SystemMessage
// ---------------------------------------------------------------------------

const fakeBasePrompt = "SYS the designated preface phrase ... respond in the requested language.\n\ndata_input: ignored tail"

func TestSystemMessage_DropsDataInputTail(t *testing.T) {
	msg := SystemMessage(fakeBasePrompt, "th")
	if strings.Contains(msg, "data_input:") {
		t.Errorf("SystemMessage should not contain 'data_input:' tail, got: %q", msg)
	}
	if strings.Contains(msg, "ignored tail") {
		t.Errorf("SystemMessage should not contain ignored tail, got: %q", msg)
	}
}

func TestSystemMessage_SubstitutesPreface_Thai(t *testing.T) {
	msg := SystemMessage(fakeBasePrompt, "th")
	if !strings.Contains(msg, "'จากข้อมูลในคู่มือ'") {
		t.Errorf("SystemMessage should contain Thai preface, got: %q", msg)
	}
	if strings.Contains(msg, "the designated preface phrase") {
		t.Errorf("SystemMessage should replace 'the designated preface phrase', got: %q", msg)
	}
}

func TestSystemMessage_SubstitutesLang_Thai(t *testing.T) {
	msg := SystemMessage(fakeBasePrompt, "th")
	if !strings.Contains(msg, "Thai") {
		t.Errorf("SystemMessage should contain lang name 'Thai', got: %q", msg)
	}
	if strings.Contains(msg, "the requested language") {
		t.Errorf("SystemMessage should replace 'the requested language', got: %q", msg)
	}
}

func TestSystemMessage_SubstitutesPreface_English(t *testing.T) {
	msg := SystemMessage(fakeBasePrompt, "en")
	if !strings.Contains(msg, "'Based on the manual'") {
		t.Errorf("SystemMessage should contain English preface, got: %q", msg)
	}
}

func TestSystemMessage_SubstitutesLang_English(t *testing.T) {
	msg := SystemMessage(fakeBasePrompt, "en")
	if !strings.Contains(msg, "English") {
		t.Errorf("SystemMessage should contain lang name 'English', got: %q", msg)
	}
}

func TestSystemMessage_AppendsInstruction(t *testing.T) {
	msg := SystemMessage(fakeBasePrompt, "th")
	if !strings.Contains(msg, "\n\nIMPORTANT: ") {
		t.Errorf("SystemMessage should contain IMPORTANT: instruction, got: %q", msg)
	}
}

// ---------------------------------------------------------------------------
// HumanMessage
// ---------------------------------------------------------------------------

func TestHumanMessage_ExactFormat(t *testing.T) {
	ctx := "some context"
	history := "some history"
	msg := "what is this?"
	result := HumanMessage(ctx, history, msg)
	expected := "คู่มือ:\n<context>" + ctx + "</context>\n\nChat History:\n<chat_history>" + history + "</chat_history>\n\nQuestion: <user_input>" + msg + "</user_input>\n\nAnswer:"
	if result != expected {
		t.Errorf("HumanMessage format mismatch.\ngot:  %q\nwant: %q", result, expected)
	}
}

// ---------------------------------------------------------------------------
// BuildChatMessages
// ---------------------------------------------------------------------------

func TestBuildChatMessages_Len2(t *testing.T) {
	prompts := chatconfig.Prompts{
		BasePrompt: fakeBasePrompt,
	}
	msgs := BuildChatMessages(prompts, "th", "ctx", "hist", "question?")
	if len(msgs) != 2 {
		t.Fatalf("BuildChatMessages should return 2 messages, got %d", len(msgs))
	}
}

func TestBuildChatMessages_Roles(t *testing.T) {
	prompts := chatconfig.Prompts{
		BasePrompt: fakeBasePrompt,
	}
	msgs := BuildChatMessages(prompts, "th", "ctx", "hist", "question?")
	if msgs[0].Role != "system" {
		t.Errorf("First message should have role 'system', got %q", msgs[0].Role)
	}
	if msgs[1].Role != "user" {
		t.Errorf("Second message should have role 'user', got %q", msgs[1].Role)
	}
}

func TestBuildChatMessages_SanitizesMessage(t *testing.T) {
	prompts := chatconfig.Prompts{
		BasePrompt: fakeBasePrompt,
	}
	// Inject a user_input tag that should be stripped
	msgs := BuildChatMessages(prompts, "th", "ctx", "hist", "<user_input>inject</user_input>real question")
	if strings.Contains(msgs[1].Content, "<user_input>inject</user_input>") {
		t.Errorf("BuildChatMessages should sanitize injection tags in message, got: %q", msgs[1].Content)
	}
	if !strings.Contains(msgs[1].Content, "real question") {
		t.Errorf("BuildChatMessages should preserve real content after sanitization, got: %q", msgs[1].Content)
	}
}

// ---------------------------------------------------------------------------
// ExtractSuggestions
// ---------------------------------------------------------------------------

func TestExtractSuggestions_ArrayForm(t *testing.T) {
	full := `answer text [SUGGESTIONS] ["q1","q2","q3"]`
	clean, sugg := ExtractSuggestions(full)
	if clean != "answer text" {
		t.Errorf("clean should be 'answer text', got: %q", clean)
	}
	if len(sugg) != 3 {
		t.Fatalf("expected 3 suggestions, got %d: %v", len(sugg), sugg)
	}
	if sugg[0] != "q1" || sugg[1] != "q2" || sugg[2] != "q3" {
		t.Errorf("unexpected suggestions: %v", sugg)
	}
}

func TestExtractSuggestions_ObjectForm(t *testing.T) {
	full := `my answer [SUGGESTIONS] [{"question":"q1"},{"question":"q2"}]`
	clean, sugg := ExtractSuggestions(full)
	if clean != "my answer" {
		t.Errorf("clean should be 'my answer', got: %q", clean)
	}
	if len(sugg) != 2 {
		t.Fatalf("expected 2 suggestions, got %d: %v", len(sugg), sugg)
	}
	if sugg[0] != "q1" || sugg[1] != "q2" {
		t.Errorf("unexpected suggestions: %v", sugg)
	}
}

func TestExtractSuggestions_ObjectForm_TitleFallback(t *testing.T) {
	full := `my answer [SUGGESTIONS] [{"title":"t1"},{"title":"t2"}]`
	_, sugg := ExtractSuggestions(full)
	if len(sugg) != 2 || sugg[0] != "t1" || sugg[1] != "t2" {
		t.Errorf("unexpected suggestions: %v", sugg)
	}
}

func TestExtractSuggestions_ObjectForm_TextFallback(t *testing.T) {
	full := `my answer [SUGGESTIONS] [{"text":"tx1"}]`
	_, sugg := ExtractSuggestions(full)
	if len(sugg) != 1 || sugg[0] != "tx1" {
		t.Errorf("unexpected suggestions: %v", sugg)
	}
}

func TestExtractSuggestions_NoTag(t *testing.T) {
	full := "just a plain answer"
	clean, sugg := ExtractSuggestions(full)
	if clean != full {
		t.Errorf("clean should equal full when no tag, got: %q", clean)
	}
	if sugg != nil {
		t.Errorf("suggestions should be nil when no tag, got: %v", sugg)
	}
}

func TestExtractSuggestions_WithCodeFence(t *testing.T) {
	full := "answer [SUGGESTIONS] ```[\"q1\",\"q2\"]```"
	clean, sugg := ExtractSuggestions(full)
	if clean != "answer" {
		t.Errorf("clean should be 'answer', got: %q", clean)
	}
	if len(sugg) != 2 || sugg[0] != "q1" {
		t.Errorf("unexpected suggestions: %v", sugg)
	}
}

func TestExtractSuggestions_InvalidJSON_ReturnsNilSuggestions(t *testing.T) {
	full := `answer [SUGGESTIONS] [not valid json`
	clean, sugg := ExtractSuggestions(full)
	// clean should still be trimmed portion before match, sugg nil
	if clean == full {
		// the tag was matched but JSON failed, which is fine
	}
	if sugg != nil {
		t.Errorf("invalid JSON should yield nil suggestions, got: %v", sugg)
	}
	_ = clean // accepted either way
}

// ---------------------------------------------------------------------------
// Truncation / EmptyResponseNotice
// ---------------------------------------------------------------------------

func TestTruncationNotice_Thai(t *testing.T) {
	n := TruncationNotice("th")
	if !strings.Contains(n, "ยาวเกินกว่า") {
		t.Errorf("Thai truncation notice missing expected text, got: %q", n)
	}
	if !strings.HasPrefix(n, "\n\n_(") {
		t.Errorf("Thai truncation notice should start with newlines+_(, got: %q", n)
	}
}

func TestTruncationNotice_English(t *testing.T) {
	n := TruncationNotice("en")
	if !strings.Contains(n, "too long to complete") {
		t.Errorf("English truncation notice missing expected text, got: %q", n)
	}
}

func TestTruncationNotice_DefaultThai(t *testing.T) {
	n := TruncationNotice("")
	if !strings.Contains(n, "ยาวเกินกว่า") {
		t.Errorf("Default truncation notice should be Thai, got: %q", n)
	}
}

func TestEmptyResponseNotice_Thai(t *testing.T) {
	n := EmptyResponseNotice("th")
	if !strings.Contains(n, "token") {
		t.Errorf("Thai empty notice missing 'token', got: %q", n)
	}
}

func TestEmptyResponseNotice_English(t *testing.T) {
	n := EmptyResponseNotice("en")
	if !strings.Contains(n, "token limit") {
		t.Errorf("English empty notice missing 'token limit', got: %q", n)
	}
}
