// Package services provides the prompt assembly and suggestions extraction
// service for the native Go chatbot. All locale strings and assembly rules
// are kept verbatim with the Python carmen-chatbot for parity.
package services

import (
	"encoding/json"
	"regexp"
	"strings"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/chatconfig"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/utils"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/pkg/openrouter"
)

// Locale holds all user-facing strings for a given language.
type Locale struct {
	StatusAnalyzing string
	StatusSearching string
	StatusComposing string
	Preface         string
	Instruction     string
}

// localeMap contains verbatim parity strings from the Python carmen-chatbot.
var localeMap = map[string]Locale{
	"th": {
		StatusAnalyzing: "กำลังวิเคราะห์คำถาม...",
		StatusSearching: "กำลังค้นหาและคัดกรองข้อมูล...",
		StatusComposing: "กำลังเรียบเรียงคำตอบ...",
		Preface:         "จากข้อมูลในคู่มือ",
		Instruction:     "Always respond in Thai language using natural, conversational Thai — as if you're a helpful colleague talking to someone, not reading from a manual. Use polite particles (ค่ะ/ครับ/นะคะ) naturally where they fit, not mechanically at the end of every sentence. Vary your sentence structure and word choices. This includes the [SUGGESTIONS] section — all 3 suggested questions MUST be written in Thai only. Never use Chinese or any other language.",
	},
	"en": {
		StatusAnalyzing: "Analyzing your question...",
		StatusSearching: "Searching and filtering data...",
		StatusComposing: "Composing response...",
		Preface:         "Based on the manual",
		Instruction:     "Always respond in English using natural, conversational language — warm and helpful, like a knowledgeable colleague, not a formal document. Vary your sentence structure and avoid stiff phrasing. If the provided manual (คู่มือ) is in Thai, translate the relevant information into natural, flowing English. Do NOT quote Thai text directly. This includes the [SUGGESTIONS] section — all 3 suggested questions MUST be written in English only.",
	},
}

// langNames maps language codes to their full English name used in the system prompt.
var langNames = map[string]string{
	"th": "Thai",
	"en": "English",
}

// truncationNotices are the verbatim truncation notice strings per language.
var truncationNotices = map[string]string{
	"th": "\n\n_(คำตอบนี้ยาวเกินกว่าที่ระบบจะแสดงได้ในครั้งเดียว หากต้องการข้อมูลเพิ่มเติม ลองถามแยกเป็นหัวข้อย่อย ๆ ได้เลยครับ)_",
	"en": "\n\n_(The response was too long to complete in one reply. Try asking about a specific part of the topic instead.)_",
}

// emptyResponseNotices are the verbatim empty-response notice strings per language.
var emptyResponseNotices = map[string]string{
	"th": "_(AI ไม่สามารถสร้างคำตอบได้ ขีดจำกัด token อาจน้อยเกินไปสำหรับคำถามนี้)_",
	"en": "_(The AI could not generate a response. The token limit may be too small for this question.)_",
}

// GetLocale returns the Locale for the given language code.
// Unknown or empty codes fall back to "th".
func GetLocale(lang string) Locale {
	if loc, ok := localeMap[lang]; ok {
		return loc
	}
	return localeMap["th"]
}

// TruncationNotice returns the verbatim truncation notice for lang (default th).
func TruncationNotice(lang string) string {
	if n, ok := truncationNotices[lang]; ok {
		return n
	}
	return truncationNotices["th"]
}

// EmptyResponseNotice returns the verbatim empty-response notice for lang (default th).
func EmptyResponseNotice(lang string) string {
	if n, ok := emptyResponseNotices[lang]; ok {
		return n
	}
	return emptyResponseNotices["th"]
}

// SystemMessage builds the system prompt from basePrompt and lang.
// Assembly (verbatim parity with Python build_messages):
//  1. Take the portion of basePrompt BEFORE "data_input:" and trim it.
//  2. Replace literal "the designated preface phrase" with '<preface>' (single-quoted).
//  3. Replace literal "the requested language" with LANG_NAMES[lang] (default Thai).
//  4. Append "\n\nIMPORTANT: " + locale.Instruction.
func SystemMessage(basePrompt, lang string) string {
	// Step 1: strip the data_input: tail
	parts := strings.SplitN(basePrompt, "data_input:", 2)
	systemBase := strings.TrimSpace(parts[0])

	// Step 2: substitute preface
	loc := GetLocale(lang)
	systemBase = strings.ReplaceAll(systemBase, "the designated preface phrase", "'"+loc.Preface+"'")

	// Step 3: substitute language name
	langName := langNames[lang]
	if langName == "" {
		langName = "Thai"
	}
	systemBase = strings.ReplaceAll(systemBase, "the requested language", langName)

	// Step 4: append instruction
	return systemBase + "\n\nIMPORTANT: " + loc.Instruction
}

// HumanMessage builds the user turn from context, chat history, and the
// (already-sanitized) message. Verbatim parity with Python build_messages.
func HumanMessage(context, history, message string) string {
	return "คู่มือ:\n<context>" + context + "</context>\n\nChat History:\n<chat_history>" + history + "</chat_history>\n\nQuestion: <user_input>" + message + "</user_input>\n\nAnswer:"
}

// BuildChatMessages assembles the two-message slice [system, user] ready for
// the LLM. The user message is sanitized before assembly.
func BuildChatMessages(prompts chatconfig.Prompts, lang, context, history, message string) []openrouter.ChatMessage {
	sanitized := utils.SanitizeForPrompt(message)
	return []openrouter.ChatMessage{
		{Role: "system", Content: SystemMessage(prompts.BasePrompt, lang)},
		{Role: "user", Content: HumanMessage(context, history, sanitized)},
	}
}

// suggestionsTagRe locates the [SUGGESTIONS] tag. The match start is used to
// split the clean answer; everything after the tag is processed separately.
var suggestionsTagRe = regexp.MustCompile(`(?s)\[SUGGESTIONS\]\s*(.+)`)

// suggestionsJSONRe extracts the first JSON array or object from a string
// (after fence-stripping). Non-greedy so it stops at the first complete
// bracket; the DOTALL flag handles multi-line.
var suggestionsJSONRe = regexp.MustCompile(`(?s)(\{.*\}|\[.*\])`)

// ExtractSuggestions splits a full LLM response into the clean answer and the
// parsed suggestions slice. Parity with Python _normalize_sugg leniency:
//   - tries json.Unmarshal into []string first
//   - falls back to []map[string]any, pulling "question" / "title" / "text"
//   - strips ``` fences from the captured JSON before parsing
//
// If there is no [SUGGESTIONS] tag, clean == full and suggestions == nil.
func ExtractSuggestions(full string) (clean string, suggestions []string) {
	loc := suggestionsTagRe.FindStringIndex(full)
	if loc == nil {
		return full, nil
	}

	// clean is everything before the [SUGGESTIONS] tag, trimmed
	clean = strings.TrimSpace(full[:loc[0]])

	// remainder is everything after "[SUGGESTIONS]" — may contain ``` fences
	remainder := full[loc[0]:]
	// strip the tag itself to get just the JSON region
	remainder = suggestionsTagRe.ReplaceAllString(remainder, "$1")

	// strip ``` fences (Python does this)
	rawJSON := strings.TrimSpace(remainder)
	rawJSON = strings.TrimPrefix(rawJSON, "```")
	rawJSON = strings.TrimSuffix(rawJSON, "```")
	rawJSON = strings.TrimSpace(rawJSON)

	// Find the first JSON array or object within rawJSON
	jLoc := suggestionsJSONRe.FindStringIndex(rawJSON)
	if jLoc != nil {
		rawJSON = rawJSON[jLoc[0]:jLoc[1]]
	}

	// Try []string first
	var arr []string
	if err := json.Unmarshal([]byte(rawJSON), &arr); err == nil {
		return clean, arr
	}

	// Fall back to []map[string]any
	var objs []map[string]any
	if err := json.Unmarshal([]byte(rawJSON), &objs); err == nil {
		result := make([]string, 0, len(objs))
		for _, obj := range objs {
			for _, key := range []string{"question", "title", "text"} {
				if v, ok := obj[key]; ok {
					if s, ok := v.(string); ok && s != "" {
						result = append(result, s)
						break
					}
				}
			}
		}
		if len(result) > 0 {
			return clean, result
		}
	}

	// Both parses failed
	return clean, nil
}
