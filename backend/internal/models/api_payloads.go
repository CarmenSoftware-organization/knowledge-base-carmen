package models

import "github.com/google/uuid"

// DocumentSummary is one row of GET /api/documents (promoted from the api package).
type DocumentSummary struct {
	ID         uuid.UUID `json:"id"`
	Path       string    `json:"path"`
	Title      string    `json:"title"`
	Source     string    `json:"source"`
	ChunkCount *int64    `json:"chunk_count,omitempty"`
	CreatedAt  *string   `json:"created_at,omitempty"`
	UpdatedAt  *string   `json:"updated_at,omitempty"`
}

// ProvisionResult is the data for POST /api/business-units/provision.
type ProvisionResult struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// DeprovisionResult is the data for POST /api/business-units/deprovision.
type DeprovisionResult struct {
	Slug string `json:"slug"`
}

// ActivitySummary is the data for GET /api/activity/summary.
type ActivitySummary struct {
	Period string      `json:"period"`
	Items  interface{} `json:"items"`
}

// StatusResult is a simple {status} acknowledgement (chat feedback).
type StatusResult struct {
	Status string `json:"status"`
}

// ClearResult is the data for DELETE /api/chat/clear/:room_id.
type ClearResult struct {
	Status string `json:"status"`
	RoomID string `json:"room_id"`
}

// MessageResult is a simple {message} acknowledgement (index rebuild start).
type MessageResult struct {
	Message string `json:"message"`
}

// ReindexOneResult is the data for POST /api/index/rebuild/one.
type ReindexOneResult struct {
	BU      string `json:"bu"`
	Path    string `json:"path"`
	Message string `json:"message"`
}

// ReindexStatus is the data for GET /api/index/rebuild/status.
type ReindexStatus struct {
	BU            string `json:"bu"`
	Running       bool   `json:"running"`
	StartedAt     string `json:"started_at"`
	RunningForSec int64  `json:"running_for_sec"`
}

// ReindexUnlock is the data for POST /api/index/rebuild/unlock.
type ReindexUnlock struct {
	BU         string `json:"bu"`
	WasRunning bool   `json:"was_running"`
	Message    string `json:"message"`
}

// RecordHistoryResult is the data for POST /api/chat/record-history.
type RecordHistoryResult struct {
	ID      string `json:"id,omitempty"`
	Skipped string `json:"skipped,omitempty"`
}

// IntentTestResult is the data for POST /api/chat/intent-test.
type IntentTestResult struct {
	Type            string `json:"type"`
	Source          string `json:"source"`
	CannedResponse  string `json:"canned_response"`
	EmbedTokens     int    `json:"embed_tokens"`
	LLMInputTokens  int    `json:"llm_input_tokens"`
	LLMOutputTokens int    `json:"llm_output_tokens"`
}
