package utils

import "regexp"

// piiPattern pairs a compiled regex with its replacement token.
type piiPattern struct {
	re          *regexp.Regexp
	replacement string
}

// _piiPatterns mirrors the Python pii.py patterns in the exact same order.
// Order matters: national-id / card patterns appear before generic digit runs.
var _piiPatterns = []piiPattern{
	// 1. Email addresses (case-insensitive)
	{regexp.MustCompile(`(?i)[\w.%+\-]+@[\w\-]+\.[\w.\-]+`), "[email]"},
	// 2. Thai mobile (06x / 08x / 09x — 10 digits, with optional dashes/spaces)
	{regexp.MustCompile(`\b0[689]\d[\s\-]?\d{3}[\s\-]?\d{4}\b`), "[phone]"},
	// 3. Generic 10-digit with dashes/spaces  e.g. 955-584-4455
	{regexp.MustCompile(`\b\d{3}[\s\-]\d{3}[\s\-]\d{4}\b`), "[phone]"},
	// 4. International phone with country code  e.g. +66812345678 / +66-81-234-5678
	{regexp.MustCompile(`\+\d{1,3}[\s\-]?\d{1,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4}\b`), "[phone]"},
	// 5. Thai national ID with hyphens or spaces  1-2345-67890-12-3
	{regexp.MustCompile(`\b\d{1}[\s\-]\d{4}[\s\-]\d{5}[\s\-]\d{2}[\s\-]\d{1}\b`), "[national-id]"},
	// 6. 13 consecutive digits (national ID without separator)
	{regexp.MustCompile(`\b\d{13}\b`), "[national-id]"},
	// 7. Visa/Mastercard 16 digits — groups of 4 separated by space or dash
	{regexp.MustCompile(`\b\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}\b`), "[card]"},
	// 8. Visa/Mastercard 16 digits — no separator
	{regexp.MustCompile(`\b\d{16}\b`), "[card]"},
	// 9. Amex 15 digits — 4-6-5 format with space or dash
	{regexp.MustCompile(`\b\d{4}[\s\-]\d{6}[\s\-]\d{5}\b`), "[card]"},
}

// MaskPII replaces PII patterns in text with safe placeholder tokens.
// Patterns are applied in order; safe to call on any string — returns
// the original if nothing matches. Empty text is returned as-is.
func MaskPII(text string) string {
	if text == "" {
		return text
	}
	for _, p := range _piiPatterns {
		text = p.re.ReplaceAllString(text, p.replacement)
	}
	return text
}
