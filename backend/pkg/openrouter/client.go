package openrouter

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
)

type Client struct {
	APIBase    string
	APIKey     string
	ChatModel  string
	EmbedModel string
	httpClient *http.Client
}

type EmbeddingsRequest struct {
	Model string   `json:"model"`
	Input []string `json:"input"`
}

type EmbeddingsResponse struct {
	Data []struct {
		Embedding []float32 `json:"embedding"`
		Index     int       `json:"index"`
	} `json:"data"`
	Model string `json:"model"`
	Usage struct {
		PromptTokens int `json:"prompt_tokens"`
		TotalTokens  int `json:"total_tokens"`
	} `json:"usage"`
}

type chatCompletionsRequest struct {
	Model    string `json:"model"`
	Messages []struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"messages"`
}

type chatCompletionsResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func NewClient() *Client {
	cfg := config.AppConfig.LLM
	timeout := time.Duration(cfg.TimeoutSec) * time.Second
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	return &Client{
		APIBase:    cfg.APIBase,
		APIKey:     cfg.APIKey,
		ChatModel:  cfg.ChatModel,
		EmbedModel: cfg.EmbedModel,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c *Client) GenerateAnswer(context string, question string) (string, error) {
	prompt := fmt.Sprintf(
		`คุณเป็นผู้ช่วยตอบคำถามจากคู่มือ Carmen Cloud
- ตอบจาก Context ด้านล่างเท่านั้น ถ้าไม่มีข้อมูลที่ตรงกัน ให้ตอบสั้นๆ ว่าไม่พบข้อมูลที่เกี่ยวข้องในคู่มือ
- ตอบแบบสรุปกระชับ (เป็นหัวข้อหรือขั้นตอนสั้นๆ) ไม่ต้องยาว ไม่ต้องซ้ำคำถาม
- ห้ามคัดลอกหรือใส่ข้อความเช่น "--- Context ---" หรือ "Context 1/2/3" ลงในคำตอบ ให้มีแต่เนื้อหาสรุปเท่านั้น

Context:
%s

Question: %s

Answer (สรุปเท่านั้น ไม่มีคำว่า Context):`,
		context, question,
	)

	reqBody := chatCompletionsRequest{Model: c.ChatModel}
	reqBody.Messages = append(reqBody.Messages, struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}{
		Role:    "user",
		Content: prompt,
	})
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", strings.TrimRight(c.APIBase, "/")+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.APIKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("openrouter error %d: %s", resp.StatusCode, string(body))
	}

	var res chatCompletionsResponse
	if err := json.Unmarshal(body, &res); err != nil {
		return "", fmt.Errorf("unmarshal response: %w", err)
	}
	if len(res.Choices) == 0 {
		return "", fmt.Errorf("empty chat response")
	}
	return strings.TrimSpace(res.Choices[0].Message.Content), nil
}

// ChatMessage is a single role/content turn sent to the chat completions API.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Usage holds token accounting returned on the final streaming frame.
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
}

type streamRequest struct {
	Model         string        `json:"model"`
	Messages      []ChatMessage `json:"messages"`
	Stream        bool          `json:"stream"`
	StreamOptions struct {
		IncludeUsage bool `json:"include_usage"`
	} `json:"stream_options"`
}

type streamFrame struct {
	Choices []struct {
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
		FinishReason *string `json:"finish_reason"`
	} `json:"choices"`
	Usage *Usage `json:"usage"`
}

// StreamAnswer streams a chat completion, invoking onChunk for each content
// delta. It returns the last finish_reason seen and the usage frame (if any).
func (c *Client) StreamAnswer(ctx context.Context, model string, messages []ChatMessage, onChunk func(delta string)) (string, Usage, error) {
	if model == "" {
		model = c.ChatModel
	}
	reqBody := streamRequest{Model: model, Messages: messages, Stream: true}
	reqBody.StreamOptions.IncludeUsage = true
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", Usage{}, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST",
		strings.TrimRight(c.APIBase, "/")+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", Usage{}, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")
	if c.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.APIKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", Usage{}, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return "", Usage{}, fmt.Errorf("openrouter error %d: %s", resp.StatusCode, string(body))
	}

	var (
		finishReason string
		usage        Usage
	)
	reader := bufio.NewReader(resp.Body)
	for {
		line, err := reader.ReadString('\n')
		if len(line) > 0 {
			trimmed := strings.TrimSpace(line)
			if strings.HasPrefix(trimmed, "data:") {
				payload := strings.TrimSpace(strings.TrimPrefix(trimmed, "data:"))
				if payload == "[DONE]" {
					break
				}
				var frame streamFrame
				if jsonErr := json.Unmarshal([]byte(payload), &frame); jsonErr == nil {
					for _, ch := range frame.Choices {
						if ch.Delta.Content != "" && onChunk != nil {
							onChunk(ch.Delta.Content)
						}
						if ch.FinishReason != nil && *ch.FinishReason != "" {
							finishReason = *ch.FinishReason
						}
					}
					if frame.Usage != nil {
						usage = *frame.Usage
					}
				}
			}
		}
		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return finishReason, usage, fmt.Errorf("read stream: %w", err)
		}
	}
	return finishReason, usage, nil
}

// EmbeddingWithTokens returns the embedding plus the prompt-token count from the response usage.
func (c *Client) EmbeddingWithTokens(text string) ([]float32, int, error) {
	reqBody := EmbeddingsRequest{
		Model: c.EmbedModel,
		Input: []string{text},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, 0, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", strings.TrimRight(c.APIBase, "/")+"/embeddings", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, 0, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.APIKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode >= 300 {
		return nil, 0, fmt.Errorf("openrouter error %d: %s", resp.StatusCode, string(body))
	}

	var res EmbeddingsResponse
	if err := json.Unmarshal(body, &res); err != nil {
		return nil, 0, fmt.Errorf("unmarshal response: %w", err)
	}

	if len(res.Data) == 0 {
		return nil, 0, fmt.Errorf("empty embedding response")
	}

	return res.Data[0].Embedding, res.Usage.PromptTokens, nil
}

func (c *Client) Embedding(text string) ([]float32, error) {
	v, _, err := c.EmbeddingWithTokens(text)
	return v, err
}

// EmbeddingBatch embeds multiple texts in a single request, returning vectors
// ordered to match the input (by the response's Index field).
func (c *Client) EmbeddingBatch(texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return [][]float32{}, nil
	}
	reqBody := EmbeddingsRequest{Model: c.EmbedModel, Input: texts}
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}
	req, err := http.NewRequest("POST", strings.TrimRight(c.APIBase, "/")+"/embeddings", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.APIKey)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("openrouter error %d: %s", resp.StatusCode, string(body))
	}
	var res EmbeddingsResponse
	if err := json.Unmarshal(body, &res); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}
	if len(res.Data) != len(texts) {
		return nil, fmt.Errorf("embedding count mismatch: got %d want %d", len(res.Data), len(texts))
	}
	sort.Slice(res.Data, func(i, j int) bool { return res.Data[i].Index < res.Data[j].Index })
	out := make([][]float32, len(res.Data))
	for i := range res.Data {
		out[i] = res.Data[i].Embedding
	}
	return out, nil
}
