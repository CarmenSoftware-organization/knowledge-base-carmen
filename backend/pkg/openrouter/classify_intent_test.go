package openrouter

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestClassifyIntent(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		// Decode request to verify temperature and max_tokens
		var req intentCompletionsRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if req.Temperature != 0 {
			http.Error(w, "expected temperature=0", http.StatusBadRequest)
			return
		}
		if req.MaxTokens != 20 {
			http.Error(w, "expected max_tokens=20", http.StatusBadRequest)
			return
		}

		resp := intentCompletionsResponse{}
		resp.Choices = []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		}{{}}
		resp.Choices[0].Message.Content = " GREETING "
		resp.Usage.PromptTokens = 50
		resp.Usage.CompletionTokens = 1

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	c := &Client{
		APIBase:    srv.URL,
		ChatModel:  "test-model",
		httpClient: &http.Client{Timeout: 5 * time.Second},
	}

	content, inTok, outTok, err := c.ClassifyIntent("hello test prompt")
	if err != nil {
		t.Fatalf("ClassifyIntent error: %v", err)
	}
	if content != "GREETING" {
		t.Errorf("content = %q, want %q", content, "GREETING")
	}
	if inTok != 50 {
		t.Errorf("inTok = %d, want 50", inTok)
	}
	if outTok != 1 {
		t.Errorf("outTok = %d, want 1", outTok)
	}
}
