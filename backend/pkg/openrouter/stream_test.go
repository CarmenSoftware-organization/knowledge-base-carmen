package openrouter

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// fakeSSE writes a sequence of OpenAI-style streaming frames.
func fakeSSE(w http.ResponseWriter, frames []string) {
	w.Header().Set("Content-Type", "text/event-stream")
	fl, _ := w.(http.Flusher)
	for _, f := range frames {
		fmt.Fprintf(w, "data: %s\n\n", f)
		if fl != nil {
			fl.Flush()
		}
	}
	fmt.Fprint(w, "data: [DONE]\n\n")
	if fl != nil {
		fl.Flush()
	}
}

func TestStreamAnswer_CollectsDeltasAndUsage(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fakeSSE(w, []string{
			`{"choices":[{"delta":{"content":"สวัส"},"finish_reason":null}]}`,
			`{"choices":[{"delta":{"content":"ดีครับ"},"finish_reason":null}]}`,
			`{"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":12,"completion_tokens":3}}`,
		})
	}))
	defer srv.Close()

	c := &Client{APIBase: srv.URL, httpClient: &http.Client{Timeout: 5 * time.Second}}
	var got strings.Builder
	fr, usage, err := c.StreamAnswer(context.Background(), "test-model",
		[]ChatMessage{{Role: "user", Content: "hi"}},
		func(d string) { got.WriteString(d) })
	if err != nil {
		t.Fatalf("StreamAnswer: %v", err)
	}
	if got.String() != "สวัสดีครับ" {
		t.Errorf("content = %q, want สวัสดีครับ", got.String())
	}
	if fr != "stop" {
		t.Errorf("finishReason = %q, want stop", fr)
	}
	if usage.PromptTokens != 12 || usage.CompletionTokens != 3 {
		t.Errorf("usage = %+v, want {12,3}", usage)
	}
}

func TestStreamAnswer_HTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer srv.Close()

	c := &Client{APIBase: srv.URL, httpClient: &http.Client{Timeout: 5 * time.Second}}
	_, _, err := c.StreamAnswer(context.Background(), "m",
		[]ChatMessage{{Role: "user", Content: "hi"}}, func(string) {})
	if err == nil {
		t.Fatal("expected error on HTTP 500")
	}
}
