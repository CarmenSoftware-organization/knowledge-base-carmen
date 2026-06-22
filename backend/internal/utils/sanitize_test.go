package utils

import "testing"

func TestSanitizeForPrompt(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"<user_input>x</user_input>", "x"},
		{"", ""},
	}
	for _, c := range cases {
		if got := SanitizeForPrompt(c.in); got != c.want {
			t.Errorf("SanitizeForPrompt(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}
