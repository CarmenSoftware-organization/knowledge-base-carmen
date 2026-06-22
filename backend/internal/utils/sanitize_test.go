package utils

import "testing"

func TestSanitizeForPrompt(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"<user_input>x</user_input>", "x"},
		{"<context>x</context>", "x"},
		{"<history>x</history>", "x"},
		{"<chat_history>x</chat_history>", "x"},
		{"<manual>x</manual>", "x"},
		{"<system_instruction>x</system_instruction>", "x"},
		{"<CONTEXT>text</CONTEXT>", "text"},
		{"", ""},
	}
	for _, c := range cases {
		if got := SanitizeForPrompt(c.in); got != c.want {
			t.Errorf("SanitizeForPrompt(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}
