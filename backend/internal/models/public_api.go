// DTO request/response ของ Public API — ใช้อยู่ (SystemStatusResponse ใช้โดย GET /api/system/status)
package models
// POST /api/search
type SearchPublicRequest struct {
	Query string `json:"query"`
	Limit int    `json:"limit,omitempty"`
}

type SearchResultPublic struct {
	ID       string  `json:"id"`  
	Title    string  `json:"title"`
	Snippet  string  `json:"snippet"`
	Category string  `json:"category"`
	Path     string  `json:"path"`   
	Score    float64 `json:"score"`
}

type SearchPublicResponse struct {
	Results []SearchResultPublic `json:"results"`
}

// GET /api/categories
type CategoryPublic struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Icon         string `json:"icon"`
	ArticleCount int    `json:"articleCount"`
}

type CategoriesPublicResponse struct {
	Categories []CategoryPublic `json:"categories"`
}

// GET /api/articles/:id
type ArticlePublicResponse struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Content     string   `json:"content"` 
	Tags        []string `json:"tags"`
	LastUpdated string   `json:"lastUpdated"` // "2026-01-29"
}

// GET /api/articles/:id/toc
type TOCEntry struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Level int    `json:"level"` 
}

type ArticleTOCResponse struct {
	Items []TOCEntry `json:"items"`
}

// GET /api/articles/:id/related
type RelatedArticlePublic struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Path  string `json:"path"`
}

type RelatedArticlesResponse struct {
	Articles []RelatedArticlePublic `json:"articles"`
}

// POST /api/articles/:id/feedback
type ArticleFeedbackRequest struct {
	Helpful bool `json:"helpful"`
}

// POST /api/chat/ask
type ChatAskRequest struct {
	Question string `json:"question"`
}

type ChatSource struct {
	ArticleID string `json:"articleId"`
	Title     string `json:"title"`
}

type ChatAskResponse struct {
	Answer  string       `json:"answer"`
	Sources []ChatSource `json:"sources"`
}

// GET /api/system/status
type SystemStatusResponse struct {
	Status  string `json:"status"`  
	Message string `json:"message,omitempty"`
}
