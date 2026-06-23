package export

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"
)

// Renderer turns a full HTML document into PDF bytes.
type Renderer interface {
	RenderPDF(ctx context.Context, html string) ([]byte, error)
}

// GotenbergClient renders via a Gotenberg Chromium service.
type GotenbergClient struct {
	BaseURL string
	HTTP    *http.Client
}

func NewGotenbergClient(baseURL string) *GotenbergClient {
	return &GotenbergClient{BaseURL: baseURL, HTTP: &http.Client{Timeout: 60 * time.Second}}
}

var gotenbergFields = map[string]string{
	"paperWidth":      "8.27",  // A4 width in inches
	"paperHeight":     "11.69", // A4 height in inches
	"marginTop":       "0.79",  // 20mm
	"marginBottom":    "0.79",
	"marginLeft":      "0.59", // 15mm
	"marginRight":     "0.59",
	"printBackground": "true",
}

func (g *GotenbergClient) RenderPDF(ctx context.Context, html string) ([]byte, error) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, err := w.CreateFormFile("files", "index.html")
	if err != nil {
		return nil, err
	}
	if _, err := fw.Write([]byte(html)); err != nil {
		return nil, err
	}
	for k, v := range gotenbergFields {
		if err := w.WriteField(k, v); err != nil {
			return nil, err
		}
	}
	if err := w.Close(); err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, g.BaseURL+"/forms/chromium/convert/html", &buf)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())

	resp, err := g.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("gotenberg %d: %s", resp.StatusCode, string(b))
	}
	return io.ReadAll(resp.Body)
}
