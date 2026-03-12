package models

type ChatAskRequest struct {
	Question      string `json:"question"`
	PreferredPath string `json:"preferredPath,omitempty"`
}

type ChatSource struct {
	ArticleID string `json:"articleId"`
	Title     string `json:"title"`
}

type ChatAskResponse struct {
	Answer             string                 `json:"answer"`
	Sources            []ChatSource           `json:"sources"`
	NeedDisambiguation bool                   `json:"needDisambiguation,omitempty"`
	Options            []DisambiguationOption `json:"options,omitempty"`
}

type DisambiguationOption struct {
	Path   string  `json:"path"`
	Title  string  `json:"title"`
	Reason string  `json:"reason"`
	Score  float64 `json:"score"`
}

// RecordHistoryRequest is used by Python chatbot to save Q&A to DB after stream completes
type RecordHistoryRequest struct {
	BU       string        `json:"bu"`
	UserID   string        `json:"user_id"`
	Question string        `json:"question"`
	Answer   string        `json:"answer"`
	Sources  []ChatSource  `json:"sources"`
}

type RouteResult struct {
	Candidates []RouteCandidate `json:"candidates"`
}

type RouteCandidate struct {
	Path   string  `json:"path"`
	Reason string  `json:"reason"`
	Score  float64 `json:"score"`
}
