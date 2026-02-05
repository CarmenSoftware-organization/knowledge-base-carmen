package chromadb

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/new-carmen/backend/internal/config"
)

type Client struct {
	BaseURL    string
	Collection string
	apiKey     string
	tenant     string
	database   string
	client     *http.Client
}

type AddRequest struct {
	IDs       []string                 `json:"ids"`
	Documents []string                 `json:"documents"`
	Metadatas []map[string]interface{} `json:"metadatas,omitempty"`
}

type QueryRequest struct {
	QueryTexts []string `json:"query_texts"`
	NResults   int      `json:"n_results"`
	Include    []string `json:"include,omitempty"`
}

type QueryResponse struct {
	IDs       [][]string                 `json:"ids"`
	Documents [][]string                 `json:"documents"`
	Distances [][]float64                `json:"distances"`
	Metadatas [][]map[string]interface{} `json:"metadatas"`
}

func NewClient() *Client {
	cfg := config.AppConfig.ChromaDB
	return &Client{
		BaseURL:    cfg.URL,
		Collection: cfg.Collection,
		apiKey:     cfg.APIKey,
		tenant:     cfg.Tenant,
		database:   cfg.Database,
		client:     &http.Client{},
	}
}

func (c *Client) Add(ids []string, documents []string, metadatas []map[string]interface{}) error {
	reqBody := AddRequest{
		IDs:       ids,
		Documents: documents,
		Metadatas: metadatas,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/api/v1/collections/%s/add", c.BaseURL, c.Collection)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		req.Header.Set("X-Chroma-Api-Key", c.apiKey)
	}
	if c.tenant != "" {
		req.Header.Set("X-Chroma-Tenant", c.tenant)
	}
	if c.database != "" {
		req.Header.Set("X-Chroma-Database", c.database)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("chromadb error: %s", string(body))
	}

	return nil
}

func (c *Client) Query(queryText string, nResults int) (*QueryResponse, error) {
	reqBody := QueryRequest{
		QueryTexts: []string{queryText},
		NResults:   nResults,
		Include:    []string{"documents", "metadatas", "distances"},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/api/v1/collections/%s/query", c.BaseURL, c.Collection)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		req.Header.Set("X-Chroma-Api-Key", c.apiKey)
	}
	if c.tenant != "" {
		req.Header.Set("X-Chroma-Tenant", c.tenant)
	}
	if c.database != "" {
		req.Header.Set("X-Chroma-Database", c.database)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var queryResp QueryResponse
	if err := json.Unmarshal(body, &queryResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &queryResp, nil
}

func (c *Client) CreateCollection(name string) error {
	reqBody := map[string]interface{}{
		"name": name,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/api/v1/collections", c.BaseURL)
	resp, err := c.client.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("chromadb error: %s", string(body))
	}

	return nil
}
