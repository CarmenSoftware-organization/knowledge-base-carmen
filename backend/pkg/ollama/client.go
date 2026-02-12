package ollama

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/new-carmen/backend/internal/config"
)

type Client struct {
	BaseURL string
	Model   string
	client  *http.Client
}

/* =========================
   Chat (ใช้แทน Generate)
   ========================= */

type ChatRequest struct {
	Model    string        `json:"model"`
	Messages []ChatMessage `json:"messages"`
	Stream   bool          `json:"stream"`
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatResponse struct {
	Message struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"message"`
	Done bool `json:"done"`
}

/* =========================
   Analyze (logic เดิม)
   ========================= */

type AnalyzeResponse struct {
	IsAmbiguous bool     `json:"is_ambiguous"`
	Reason      string   `json:"reason,omitempty"`
	Candidates  []string `json:"candidates,omitempty"`
}

/* =========================
   Embeddings
   ========================= */

type EmbeddingsRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
}

type EmbeddingsResponse struct {
	Embedding []float32 `json:"embedding"`
}

/* =========================
   Constructor
   ========================= */

func httpClientForOllama() *http.Client {
	cfg := config.AppConfig.Ollama
	if !cfg.InsecureSkipVerify {
		return &http.Client{}
	}
	return &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}
}

func NewClient() *Client {
	cfg := config.AppConfig.Ollama
	return &Client{
		BaseURL: cfg.URL,
		Model:   cfg.ChatModel,
		client:  httpClientForOllama(),
	}
}

func NewEmbedClient() *Client {
	cfg := config.AppConfig.Ollama
	return &Client{
		BaseURL: cfg.URL,
		Model:   cfg.EmbedModel,
		client:  httpClientForOllama(),
	}
}

/* =========================
   Core Chat Method (ตัวหลัก)
   ========================= */

func (c *Client) chat(prompt string) (string, error) {
	reqBody := ChatRequest{
		Model:  c.Model,
		Stream: false,
		Messages: []ChatMessage{
			{Role: "user", Content: prompt},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal chat request: %w", err)
	}

	resp, err := c.client.Post(
		fmt.Sprintf("%s/api/chat", c.BaseURL),
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return "", fmt.Errorf("failed to send chat request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("ollama chat error %d: %s", resp.StatusCode, string(body))
	}

	var result ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode chat response: %w", err)
	}

	return result.Message.Content, nil
}

/* =========================
   Public API (ใช้เหมือนเดิม)
   ========================= */

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
	return c.chat(prompt)
}

func (c *Client) AnalyzeQuestionClarity(question string) (*AnalyzeResponse, error) {
	prompt := fmt.Sprintf(
		"Analyze if this question is ambiguous or unclear: '%s'. "+
			"Respond with JSON only in this format: "+
			"{\"is_ambiguous\": true/false, \"reason\": \"...\", \"candidates\": [...]}",
		question,
	)

	response, err := c.chat(prompt)
	if err != nil {
		return nil, err
	}

	var analyzeResp AnalyzeResponse
	if err := json.Unmarshal([]byte(response), &analyzeResp); err != nil {
		// fallback: ถือว่าไม่ ambiguous
		return &AnalyzeResponse{IsAmbiguous: false}, nil
	}

	return &analyzeResp, nil
}

func (c *Client) GenerateClarifyingQuestion(question string, candidates []string) (string, error) {
	list := ""
	for i, c := range candidates {
		if i > 0 {
			list += ", "
		}
		list += fmt.Sprintf("%d. %s", i+1, c)
	}

	prompt := fmt.Sprintf(
		"Generate a clarifying question for this ambiguous question: '%s'. "+
			"Possible meanings: %s.",
		question, list,
	)

	return c.chat(prompt)
}

/* =========================
   Embedding (ไม่แตะ)
   ========================= */

func (c *Client) Embedding(text string) ([]float32, error) {
	reqBody := EmbeddingsRequest{
		Model:  c.Model,
		Prompt: text,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal embeddings request: %w", err)
	}

	resp, err := c.client.Post(
		fmt.Sprintf("%s/api/embeddings", c.BaseURL),
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to send embeddings request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read embeddings response: %w", err)
	}

	if resp.StatusCode >= 300 {
		snippet := string(body)
		if len(snippet) > 300 {
			snippet = snippet[:300] + "..."
		}
		return nil, fmt.Errorf("ollama embeddings API error %d: %s", resp.StatusCode, snippet)
	}

	var embResp EmbeddingsResponse
	if err := json.Unmarshal(body, &embResp); err != nil {
		snippet := string(body)
		if len(snippet) > 300 {
			snippet = snippet[:300] + "..."
		}
		return nil, fmt.Errorf("failed to unmarshal embeddings response: %w (body: %s)", err, snippet)
	}

	if len(embResp.Embedding) == 0 {
		snippet := strings.TrimSpace(string(body))
		if len(snippet) > 400 {
			snippet = snippet[:400] + "..."
		}
		return nil, fmt.Errorf("ollama returned empty embedding (model=%s, response: %s)", c.Model, snippet)
	}

	return embResp.Embedding, nil
}
