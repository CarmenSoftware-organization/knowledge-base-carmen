package make

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/new-carmen/backend/internal/config"
)

// Client เรียก Make scenario ผ่าน Custom Webhook (แบบ request–response)
type Client struct {
	webhookURL string
	apiKey     string // ส่งใน header x-make-apikey ถ้ามี
	http       *http.Client
}

// RouteRequest body ที่ส่งไป Make
type RouteRequest struct {
	Question  string             `json:"question"`
	Documents []RouteDocEntry    `json:"documents"`
}

// RouteDocEntry รายการเอกสารให้ Make เลือก path
type RouteDocEntry struct {
	Path  string `json:"path"`
	Title string `json:"title"`
}

// RouteResponse รูปแบบที่ Make ต้องคืน (ให้ตรงกับ QuestionRouterResult)
type RouteResponse struct {
	IsAmbiguous bool              `json:"is_ambiguous"`
	Candidates  []RouteCandidate  `json:"candidates"`
}

// RouteCandidate แนวทาง path ที่ Make เลือก
type RouteCandidate struct {
	Path   string  `json:"path"`
	Reason string  `json:"reason,omitempty"`
	Score  float32 `json:"score,omitempty"`
}

func NewClient() *Client {
	cfg := config.AppConfig.Make
	return &Client{
		webhookURL: cfg.WebhookURL,
		apiKey:     cfg.WebhookAPIKey,
		http: &http.Client{
			Timeout: 25 * time.Second,
		},
	}
}

// RouteQuestion ส่ง question + documents ไป Make webhook แล้วคืน JSON string (is_ambiguous + candidates)
// ให้ layer ข้างบน unmarshal เป็น QuestionRouterResult ได้
func (c *Client) RouteQuestion(question string, documents []RouteDocEntry) (string, error) {
	if c.webhookURL == "" {
		return "", fmt.Errorf("make webhook URL is not set")
	}

	body := RouteRequest{
		Question:  question,
		Documents: documents,
	}
	data, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("make: marshal request failed: %w", err)
	}

	req, err := http.NewRequest("POST", c.webhookURL, bytes.NewReader(data))
	if err != nil {
		return "", fmt.Errorf("make: create request failed: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		req.Header.Set("x-make-apikey", c.apiKey)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("make: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("make: webhook returned status %d", resp.StatusCode)
	}

	var parsed RouteResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return "", fmt.Errorf("make: decode response failed: %w", err)
	}

	// คืนเป็น JSON string ให้ service ไป unmarshal เป็น QuestionRouterResult
	out, err := json.Marshal(parsed)
	if err != nil {
		return "", fmt.Errorf("make: marshal response failed: %w", err)
	}
	return string(out), nil
}
