package securitytest

import (
	"testing"

	"github.com/new-carmen/backend/internal/security"
)

func TestValidateSchema(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{"valid carmen", "carmen", true},
		{"valid bu_123", "bu_123", true},
		{"valid single char", "a", true},
		{"valid underscore start", "_private", true},
		{"empty", "", false},
		{"sql injection", "carmen; DROP TABLE documents;--", false},
		{"hyphen", "car-men", false},
		{"number start", "123abc", false},
		{"special chars", "schema.public", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := security.ValidateSchema(tt.input)
			if got != tt.expected {
				t.Errorf("ValidateSchema(%q) = %v, want %v", tt.input, got, tt.expected)
			}
		})
	}
}
