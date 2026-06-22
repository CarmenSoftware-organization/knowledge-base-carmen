package services

import "testing"

func TestRegexIntent(t *testing.T) {
	cases := []struct {
		name        string
		msg         string
		haveHistory bool
		want        string
		matched     bool
	}{
		{"thai greeting", "สวัสดีครับ", false, "greeting", true},
		{"english hi", "hi", false, "greeting", true},
		{"good morning", "good morning", false, "greeting", true},
		{"thai thanks", "ขอบคุณค่ะ", false, "thanks", true},
		{"thank you", "thank you", false, "thanks", true},
		{"capabilities", "ทำอะไรได้บ้าง", false, "capabilities", true},
		{"confusion no history", "งง", false, "confusion", true},
		{"confusion WITH history skipped", "งง", true, "", false},
		{"real question no match", "how do I post an AP invoice?", false, "", false},
		{"trims and lowercases", "  HELLO  ", false, "greeting", true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, ok := RegexIntent(c.msg, c.haveHistory)
			if ok != c.matched || got != c.want {
				t.Errorf("RegexIntent(%q,%v) = (%q,%v), want (%q,%v)", c.msg, c.haveHistory, got, ok, c.want, c.matched)
			}
		})
	}
}
