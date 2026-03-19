package nlptest

import (
	"testing"

	"github.com/new-carmen/backend/internal/nlp"
)

func TestPreprocess(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"empty", "", ""},
		{"whitespace", "   ", ""},
		{"simple", "วิธีทำ", "วิธีทำ"},
		{"stop words removed", "วิธี การ ทำ", ""},
		{"mixed", "วิธี บันทึก ใบเสร็จ", "บันทึก ใบเสร็จ"},
		{"dot removal", "ภ.ง.ด. 53", "ภงด 53"},
		{"trailing dot", "invoice.", "invoice"},
		{"lowercase", "INVOICE Receipt", "invoice receipt"},
		{"english stop", "how to use the system", "use system"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := nlp.Preprocess(tt.input)
			if got != tt.expected {
				t.Errorf("Preprocess(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestExpandQuery(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		contains []string
	}{
		{"empty", "", nil},
		{"whitespace", "   ", nil},
		{"single word", "ลูกหนี้", []string{"ลูกหนี้", "AR", "Account Receivable", "ลูกหนี้การค้า"}},
		{"ap expands", "ap invoice", []string{"ap", "AP", "เจ้าหนี้", "invoice", "ใบกำกับ"}},
		{"no synonym", "xyz", []string{"xyz"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := nlp.ExpandQuery(tt.input)
			for _, want := range tt.contains {
				found := false
				for _, g := range got {
					if g == want {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("ExpandQuery(%q) = %v, want to contain %q", tt.input, got, want)
				}
			}
		})
	}
}

func TestExpandQueryDedupe(t *testing.T) {
	got := nlp.ExpandQuery("ap ap")
	if len(got) == 0 {
		t.Fatal("expected non-empty result")
	}
	seen := make(map[string]bool)
	for _, s := range got {
		if seen[s] {
			t.Errorf("duplicate term in result: %q", s)
		}
		seen[s] = true
	}
}
