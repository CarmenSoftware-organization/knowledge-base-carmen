package utils

import (
	"regexp"
	"strings"
)

var xmlTagRe = regexp.MustCompile(`(?i)</?(user_input|context|history|chat_history|manual|system_instruction)[^>]*>`)

// SanitizeForPrompt strips XML-ish injection tags from user-supplied text
// before it is embedded in an LLM prompt.
func SanitizeForPrompt(text string) string {
	if text == "" {
		return ""
	}
	return strings.TrimSpace(xmlTagRe.ReplaceAllString(text, ""))
}
