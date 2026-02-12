package openclaw

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/new-carmen/backend/internal/config"
)

// Client เป็น HTTP client เล็ก ๆ สำหรับคุยกับ OpenClaw Gateway (OpenAI-compatible)
type Client struct {
	baseURL string
	token   string
	model   string
	http    *http.Client
}

func NewClient() *Client {
	cfg := config.AppConfig.OpenClaw
	return &Client{
		baseURL: cfg.URL,
		token:   cfg.Token,
		model:   cfg.Model,
		http: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

// ChatCompletionRequest/Response — แบบเบา ๆ ตาม OpenAI-compatible API
type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	Temperature float32       `json:"temperature,omitempty"`
}

type chatChoice struct {
	Message chatMessage `json:"message"`
}

type chatResponse struct {
	Choices []chatChoice `json:"choices"`
}

// RouteQuestion ส่ง prompt ไปให้ OpenClaw แล้วคาดหวังให้ตอบ JSON ตามที่เรากำหนดใน system prompt
// คืนเป็น string (raw JSON) ให้ layer ข้างบนไป unmarshal ต่อ
func (c *Client) RouteQuestion(prompt string) (string, error) {
	if c.baseURL == "" || c.token == "" {
		return "", fmt.Errorf("openclaw is not configured (missing URL or token)")
	}

	reqBody := chatRequest{
		Model: c.model,
		Messages: []chatMessage{
			{Role: "system", Content: "You are a routing assistant. Respond ONLY with compact JSON, no extra text."},
			{Role: "user", Content: prompt},
		},
		Temperature: 0,
	}

	data, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshal request failed: %w", err)
	}

	req, err := http.NewRequest("POST", c.baseURL+"/v1/chat/completions", bytes.NewReader(data))
	if err != nil {
		return "", fmt.Errorf("create request failed: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("openclaw request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("openclaw error status: %d", resp.StatusCode)
	}

	var parsed chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return "", fmt.Errorf("decode openclaw response failed: %w", err)
	}
	if len(parsed.Choices) == 0 {
		return "", fmt.Errorf("openclaw returned no choices")
	}

	return parsed.Choices[0].Message.Content, nil
}

