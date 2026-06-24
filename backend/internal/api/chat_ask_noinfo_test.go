package api

import (
	"strings"
	"testing"
)

// The /ask flow must mirror the streaming flow's zero-results guard: when
// retrieval returns no chunks, answer with a language-appropriate "no info"
// message and empty sources instead of letting the LLM hallucinate from an
// empty context.
func TestAskNoInfoResponse_ThaiQuestion(t *testing.T) {
	resp := askNoInfoResponse("ระบบนี้ใช้ทำอะไร มีฟีเจอร์อะไรบ้าง")

	if len(resp.Sources) != 0 {
		t.Errorf("Sources = %d, want 0", len(resp.Sources))
	}
	if !strings.Contains(resp.Answer, "ไม่พบข้อมูลที่เกี่ยวข้อง") {
		t.Errorf("Answer = %q, want Thai no-info message", resp.Answer)
	}
}

func TestAskNoInfoResponse_EnglishQuestion(t *testing.T) {
	resp := askNoInfoResponse("what does this system do")

	if len(resp.Sources) != 0 {
		t.Errorf("Sources = %d, want 0", len(resp.Sources))
	}
	if !strings.Contains(resp.Answer, "couldn't find relevant information") {
		t.Errorf("Answer = %q, want English no-info message", resp.Answer)
	}
}
