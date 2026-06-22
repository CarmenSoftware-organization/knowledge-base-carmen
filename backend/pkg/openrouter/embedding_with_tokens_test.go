package openrouter

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestEmbeddingWithTokens(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"data":[{"embedding":[0.1,0.2,0.3],"index":0}],"usage":{"prompt_tokens":42,"total_tokens":42}}`))
	}))
	defer srv.Close()

	c := &Client{APIBase: srv.URL, EmbedModel: "m", httpClient: &http.Client{Timeout: 5 * time.Second}}
	vec, tokens, err := c.EmbeddingWithTokens("hello")
	if err != nil {
		t.Fatalf("EmbeddingWithTokens: %v", err)
	}
	if tokens != 42 {
		t.Errorf("prompt_tokens = %d, want 42", tokens)
	}
	if len(vec) != 3 || vec[0] != 0.1 {
		t.Errorf("unexpected embedding: %v", vec)
	}
}
