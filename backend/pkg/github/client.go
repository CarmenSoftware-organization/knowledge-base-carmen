package github

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/new-carmen/backend/internal/config"
)

type Client struct {
	Token      string
	Owner      string
	Repo       string
	Branch     string
	APIBaseURL string
	client     *http.Client
}

type FileContent struct {
	Path    string
	Content string
	Type    string
}

type TreeItem struct {
	Path string `json:"path"`
	Type string `json:"type"`
	SHA  string `json:"sha"`
}

func NewClient() *Client {
	cfg := config.AppConfig.GitHub
	return &Client{
		Token:      cfg.Token,
		Owner:      cfg.Owner,
		Repo:       cfg.Repo,
		Branch:     cfg.Branch,
		APIBaseURL: strings.TrimRight(cfg.APIBaseURL, "/"),
		client:     &http.Client{},
	}
}

func (c *Client) GetFileContent(path string) (*FileContent, error) {
	base := c.APIBaseURL
	if base == "" {
		base = config.DefaultGitHubAPIBaseURL()
	}
	url := fmt.Sprintf(
		"%s/repos/%s/%s/contents/%s?ref=%s",
		base,
		c.Owner, c.Repo, path, c.Branch,
	)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	if c.Token != "" {
		req.Header.Set("Authorization", fmt.Sprintf("token %s", c.Token))
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github API error: %d", resp.StatusCode)
	}

	var result struct {
		Content string `json:"content"`
		Type    string `json:"type"`
		Path    string `json:"path"`
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	// Decode base64 content
	decoded, err := base64.StdEncoding.DecodeString(strings.ReplaceAll(result.Content, "\n", ""))
	if err != nil {
		return nil, fmt.Errorf("failed to decode content: %w", err)
	}

	return &FileContent{
		Path:    result.Path,
		Content: string(decoded),
		Type:    result.Type,
	}, nil
}

func (c *Client) ListMarkdownFiles() ([]string, error) {
	base := c.APIBaseURL
	if base == "" {
		base = config.DefaultGitHubAPIBaseURL()
	}
	url := fmt.Sprintf(
		"%s/repos/%s/%s/git/trees/%s?recursive=1",
		base,
		c.Owner, c.Repo, c.Branch,
	)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	if c.Token != "" {
		req.Header.Set("Authorization", fmt.Sprintf("token %s", c.Token))
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github API error: %d", resp.StatusCode)
	}

	var result struct {
		Tree []TreeItem `json:"tree"`
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	var markdownFiles []string
	for _, item := range result.Tree {
		if item.Type == "blob" && filepath.Ext(item.Path) == ".md" {
			markdownFiles = append(markdownFiles, item.Path)
		}
	}

	return markdownFiles, nil
}
