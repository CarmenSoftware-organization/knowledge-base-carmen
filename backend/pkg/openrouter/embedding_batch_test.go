package openrouter

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestEmbeddingBatch(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// Return two vectors, deliberately out of order by index to test sorting.
		w.Write([]byte(`{"data":[{"embedding":[0.3,0.4],"index":1},{"embedding":[0.1,0.2],"index":0}],"usage":{"prompt_tokens":5}}`))
	}))
	defer srv.Close()

	c := &Client{APIBase: srv.URL, EmbedModel: "m", httpClient: &http.Client{Timeout: 5 * time.Second}}
	vecs, err := c.EmbeddingBatch([]string{"a", "b"})
	if err != nil {
		t.Fatalf("EmbeddingBatch: %v", err)
	}
	if len(vecs) != 2 {
		t.Fatalf("len = %d, want 2", len(vecs))
	}
	if vecs[0][0] != 0.1 || vecs[1][0] != 0.3 {
		t.Errorf("vectors not ordered by index: %v", vecs)
	}
}

func TestEmbeddingBatch_Empty(t *testing.T) {
	c := &Client{}
	vecs, err := c.EmbeddingBatch(nil)
	if err != nil || len(vecs) != 0 {
		t.Errorf("empty input: got (%v,%v)", vecs, err)
	}
}
