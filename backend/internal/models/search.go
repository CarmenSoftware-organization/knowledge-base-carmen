// DTO ค้นหา / clarification — ยังไม่ใช้ (เปิดเมื่อมี DB)
package models

type SearchQuery struct {
	Query     string   `json:"query"`
	Filters   []string `json:"filters,omitempty"`
	Limit     int      `json:"limit,omitempty"`
	Offset    int      `json:"offset,omitempty"`
}

type SearchResult struct {
	DocumentID    uint64  `json:"document_id"`
	Title         string  `json:"title"`
	Snippet       string  `json:"snippet"`
	Relevance     float64 `json:"relevance"`
	Version       int     `json:"version"`
	CreatedAt     string  `json:"created_at"`
}

type SearchResponse struct {
	Results []SearchResult `json:"results"`
	Total   int            `json:"total"`
	Query   string         `json:"query"`
}

type ClarificationRequest struct {
	Question      string   `json:"question"`
	Candidates    []string `json:"candidates,omitempty"`
}

type ClarificationResponse struct {
	NeedsClarification bool     `json:"needs_clarification"`
	ClarifyingQuestion string   `json:"clarifying_question,omitempty"`
	Options            []string `json:"options,omitempty"`
}
