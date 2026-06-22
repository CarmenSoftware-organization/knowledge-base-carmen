package api

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type StreamHistoryItem struct {
	Sender  string `json:"sender"`
	Message string `json:"message"`
}

type StreamChatRequest struct {
	Text         string              `json:"text"`
	BU           string              `json:"bu"`
	Username     string              `json:"username"`
	RoomID       string              `json:"room_id"`
	Model        string              `json:"model"`
	History      []StreamHistoryItem `json:"history"`
	DBSchema     string              `json:"db_schema"`
	Lang         string              `json:"lang"`
	ReferrerPage string              `json:"referrer_page"`
}

// streamEvent encodes one NDJSON stream line (compact JSON + newline).
// Uses a struct to ensure "type" key comes before "data" key in the JSON output.
func streamEvent(eventType string, data any) string {
	event := struct {
		Type string `json:"type"`
		Data any    `json:"data"`
	}{
		Type: eventType,
		Data: data,
	}
	b, err := json.Marshal(event)
	if err != nil {
		// data is always a string or []string in this codebase; fall back safely.
		event.Data = ""
		b, _ = json.Marshal(event)
	}
	return string(b) + "\n"
}

// parseStreamRequest parses and validates the stream chat request from the request body.
func parseStreamRequest(c *fiber.Ctx) (StreamChatRequest, error) {
	var req StreamChatRequest
	if err := c.BodyParser(&req); err != nil {
		return req, fmt.Errorf("invalid request body")
	}
	req.Text = strings.TrimSpace(req.Text)
	if n := len([]rune(req.Text)); n < 1 || n > 2000 {
		return req, fmt.Errorf("text must be 1–2000 chars")
	}
	if strings.TrimSpace(req.BU) == "" {
		return req, fmt.Errorf("bu is required")
	}
	if req.DBSchema == "" {
		req.DBSchema = "carmen"
	}
	if req.Lang != "en" {
		req.Lang = "th"
	}
	return req, nil
}
