package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/new-carmen/backend/internal/config"
)

// TranslationService translates wiki content using Google Cloud Translation API v2.
type TranslationService struct {
	apiKey     string
	enabled    bool
	httpClient *http.Client
}

// TranslateRequest is the request body for Google Translation API v2.
type translateRequest struct {
	Q      []string `json:"q"`
	Source string   `json:"source"`
	Target string   `json:"target"`
	Format string   `json:"format,omitempty"` // "text" or "html"
}

// TranslateResponse is the response from Google Translation API v2.
type translateResponse struct {
	Data struct {
		Translations []struct {
			TranslatedText string `json:"translatedText"`
		} `json:"translations"`
	} `json:"data"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// NewTranslationService creates a new TranslationService.
// Safe to call before config.Load() (returns disabled service).
func NewTranslationService() *TranslationService {
	apiKey := ""
	enabled := false
	if config.AppConfig != nil {
		cfg := config.AppConfig.Translation
		apiKey = cfg.APIKey
		enabled = cfg.Enabled && cfg.APIKey != ""
	}
	return &TranslationService{
		apiKey:     apiKey,
		enabled:    enabled,
		httpClient: &http.Client{},
	}
}

// IsEnabled returns whether translation is enabled.
func (s *TranslationService) IsEnabled() bool {
	return s.enabled
}

// Translate translates text from source to target language.
// Uses Google Cloud Translation API v2 REST endpoint.
func (s *TranslationService) Translate(ctx context.Context, text string, source, target string) (string, error) {
	if !s.enabled || text == "" {
		return text, nil
	}
	if source == target {
		return text, nil
	}

	// Google API has a limit per request; for long content we send as single string
	reqBody := translateRequest{
		Q:      []string{text},
		Source: source,
		Target: target,
		Format: "text",
	}
	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	apiURL := "https://translation.googleapis.com/language/translate/v2?key=" + url.QueryEscape(s.apiKey)
	req, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("translate request: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	var tr translateResponse
	if err := json.Unmarshal(data, &tr); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	if tr.Error != nil {
		return "", fmt.Errorf("translation API error %d: %s", tr.Error.Code, tr.Error.Message)
	}

	if len(tr.Data.Translations) == 0 {
		return text, nil
	}

	return tr.Data.Translations[0].TranslatedText, nil
}

// TranslateWikiContent translates title, description, and content.
func (s *TranslationService) TranslateWikiContent(ctx context.Context, title, description, content string, source, target string) (translatedTitle, translatedDesc, translatedContent string, err error) {
	if !s.enabled || source == target {
		return title, description, content, nil
	}

	translatedTitle = title
	translatedDesc = description
	translatedContent = content

	if title != "" {
		translatedTitle, err = s.Translate(ctx, title, source, target)
		if err != nil {
			return "", "", "", fmt.Errorf("translate title: %w", err)
		}
	}

	if description != "" {
		translatedDesc, err = s.Translate(ctx, description, source, target)
		if err != nil {
			return "", "", "", fmt.Errorf("translate description: %w", err)
		}
	}

	if content != "" {
		// For markdown, translate as text; Google often preserves structure
		translatedContent, err = s.Translate(ctx, content, source, target)
		if err != nil {
			return "", "", "", fmt.Errorf("translate content: %w", err)
		}
	}

	return translatedTitle, translatedDesc, translatedContent, nil
}

// NormalizeLocale normalizes locale to a supported target (e.g. "en", "th").
func NormalizeLocale(locale string) string {
	locale = strings.TrimSpace(strings.ToLower(locale))
	if locale == "" {
		return "th"
	}
	// Support common variants
	if strings.HasPrefix(locale, "en") {
		return "en"
	}
	if strings.HasPrefix(locale, "th") {
		return "th"
	}
	return locale
}
