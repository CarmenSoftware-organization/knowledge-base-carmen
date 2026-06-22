package api

import (
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestStreamEvent(t *testing.T) {
	got := streamEvent("chunk", "สวัสดี")
	if !strings.HasSuffix(got, "\n") {
		t.Fatal("must end with newline")
	}
	want := `{"type":"chunk","data":"สวัสดี"}` + "\n"
	if got != want {
		t.Errorf("streamEvent = %q, want %q", got, want)
	}
	arr := streamEvent("suggestions", []string{"a", "b"})
	if arr != `{"type":"suggestions","data":["a","b"]}`+"\n" {
		t.Errorf("array event = %q", arr)
	}
}

func TestParseStreamRequest(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantErr    bool
		checkReq   func(req StreamChatRequest) bool
	}{
		{
			name:    "valid request",
			body:    `{"text":"hello","bu":"training_center"}`,
			wantErr: false,
			checkReq: func(req StreamChatRequest) bool {
				return req.Text == "hello" && req.BU == "training_center" &&
					req.DBSchema == "carmen" && req.Lang == "th"
			},
		},
		{
			name:    "empty text",
			body:    `{"text":"","bu":"training_center"}`,
			wantErr: true,
		},
		{
			name:    "text over 2000 chars",
			body:    `{"text":"` + strings.Repeat("a", 2001) + `","bu":"training_center"}`,
			wantErr: true,
		},
		{
			name:    "empty bu",
			body:    `{"text":"hello","bu":""}`,
			wantErr: true,
		},
		{
			name:    "explicit db_schema and lang",
			body:    `{"text":"hello","bu":"tc","db_schema":"custom","lang":"en"}`,
			wantErr: false,
			checkReq: func(req StreamChatRequest) bool {
				return req.DBSchema == "custom" && req.Lang == "en"
			},
		},
		{
			name:    "defaults applied",
			body:    `{"text":"hello","bu":"tc"}`,
			wantErr: false,
			checkReq: func(req StreamChatRequest) bool {
				return req.DBSchema == "carmen" && req.Lang == "th"
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := fiber.New()
			app.Post("/test", func(c *fiber.Ctx) error {
				req, err := parseStreamRequest(c)
				if err != nil {
					return c.Status(400).JSON(fiber.Map{"error": err.Error()})
				}
				if tt.checkReq != nil && !tt.checkReq(req) {
					t.Errorf("parseStreamRequest check failed for request %+v", req)
				}
				return c.JSON(req)
			})

			httpReq := httptest.NewRequest("POST", "/test", strings.NewReader(tt.body))
			httpReq.Header.Set("Content-Type", "application/json")

			resp, err := app.Test(httpReq, -1)
			if err != nil {
				t.Errorf("app.Test failed: %v", err)
			}
			defer resp.Body.Close()

			if tt.wantErr && resp.StatusCode != 400 {
				body, _ := io.ReadAll(resp.Body)
				t.Errorf("expected status 400 for error case, got %d (body: %s)", resp.StatusCode, string(body))
			}
			if !tt.wantErr && resp.StatusCode != 200 {
				body, _ := io.ReadAll(resp.Body)
				t.Errorf("expected status 200 for success case, got %d (body: %s)", resp.StatusCode, string(body))
			}
		})
	}
}
