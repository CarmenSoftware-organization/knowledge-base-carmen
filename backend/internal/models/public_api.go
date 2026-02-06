// struct สำหรับ shape ของ request/response ที่ API ใช้ เช่น model ที่ chat_handler / system_handler ใช้เป็น JSON
package models

// --- Chat API ---
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

// --- System API ---
// GET /api/system/status
type SystemStatusResponse struct {
	Status  string `json:"status"`  
	Message string `json:"message,omitempty"`
}
