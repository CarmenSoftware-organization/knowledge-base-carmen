package services

import (
	"testing"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/chatconfig"
)

func TestMatchedRuleCount(t *testing.T) {
	rules := []chatconfig.PathRule{
		{Keywords: []string{"vendor", "ผู้ขาย"}, Patterns: []string{"%vendor%"}},
		{Keywords: []string{"ap", "เจ้าหนี้"}, Patterns: []string{"%ap-%", "%/ap/%"}},
	}
	if got := MatchedRuleCount("how to add a vendor and ap invoice", rules); got != 2 {
		t.Errorf("both rules matched: got %d, want 2", got)
	}
	if got := MatchedRuleCount("unrelated question about weather", rules); got != 0 {
		t.Errorf("no rules matched: got %d, want 0", got)
	}
}

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
