package openrouter

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/new-carmen/backend/internal/config"
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

func (c *Client) Embedding(text string) ([]float32, error) {
	reqBody := EmbeddingsRequest{
		Model: c.EmbedModel,
		Input: []string{text},
	}

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

	if len(res.Data) == 0 {
		return nil, fmt.Errorf("empty embedding response")
	}

	return res.Data[0].Embedding, nil
}
