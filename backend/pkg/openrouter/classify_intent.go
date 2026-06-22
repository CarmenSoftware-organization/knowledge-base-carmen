package openrouter

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/new-carmen/backend/internal/config"
)

// intentCompletionsRequest is the request body for the intent classification
// endpoint. Uses dedicated structs (not chatCompletionsRequest) so we can
// include temperature and max_tokens fields.
type intentCompletionsRequest struct {
	Model     string                `json:"model"`
	Messages  []intentChatMessage   `json:"messages"`
	Temperature float64             `json:"temperature"`
	MaxTokens   int                 `json:"max_tokens"`
}

type intentChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type intentCompletionsResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
	} `json:"usage"`
}

// Complete sends a one-shot chat completion using the IntentModel (falls back
// to ChatModel), temperature 0, and the given maxTokens limit. It is the
// single HTTP entry-point for all single-turn completions (intent, rewrite,
// translate). Returns trimmed content and usage token counts.
func (c *Client) Complete(prompt string, maxTokens int) (content string, inTok int, outTok int, err error) {
	model := c.ChatModel
	if config.AppConfig != nil && config.AppConfig.LLM.IntentModel != "" {
		model = config.AppConfig.LLM.IntentModel
	}

	reqBody := intentCompletionsRequest{
		Model:       model,
		Temperature: 0,
		MaxTokens:   maxTokens,
		Messages: []intentChatMessage{
			{Role: "user", Content: prompt},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", 0, 0, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", strings.TrimRight(c.APIBase, "/")+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", 0, 0, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.APIKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", 0, 0, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", 0, 0, fmt.Errorf("read response: %w", err)
	}
	if resp.StatusCode >= 300 {
		return "", 0, 0, fmt.Errorf("openrouter error %d: %s", resp.StatusCode, string(body))
	}

	var res intentCompletionsResponse
	if err := json.Unmarshal(body, &res); err != nil {
		return "", 0, 0, fmt.Errorf("unmarshal response: %w", err)
	}
	if len(res.Choices) == 0 {
		return "", 0, 0, fmt.Errorf("empty intent response")
	}

	return strings.TrimSpace(res.Choices[0].Message.Content), res.Usage.PromptTokens, res.Usage.CompletionTokens, nil
}

// ClassifyIntent sends a single-turn chat completion request for intent
// classification. It uses the dedicated IntentModel if configured, otherwise
// falls back to ChatModel. Returns the trimmed response content and token counts.
// max_tokens is fixed at 20 — sufficient for one-word intent labels.
func (c *Client) ClassifyIntent(prompt string) (content string, inTok int, outTok int, err error) {
	return c.Complete(prompt, 20)
}
