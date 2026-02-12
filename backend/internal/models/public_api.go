// struct สำหรับ shape ของ request/response ที่ API ใช้ เช่น model ที่ chat_handler / system_handler ใช้เป็น JSON
package models

// --- Chat API ---
// POST /api/chat/ask
type ChatAskRequest struct {
	Question      string `json:"question"`
	// PreferredPath ใช้ในรอบที่ 2 เมื่อผู้ใช้เลือกหมวด/เอกสารที่ต้องการเองแล้ว
	PreferredPath string `json:"preferredPath,omitempty"`
}

type ChatSource struct {
	ArticleID string `json:"articleId"`
	Title     string `json:"title"`
}

// DisambiguationOption ใช้ส่งตัวเลือกกลับไปให้ frontend เวลาคำถามกำกวม
type DisambiguationOption struct {
	Path   string  `json:"path"`
	Title  string  `json:"title,omitempty"`
	Reason string  `json:"reason,omitempty"`
	Score  float32 `json:"score,omitempty"`
}

type ChatAskResponse struct {
	Answer  string       `json:"answer"`
	Sources []ChatSource `json:"sources"`

	// ถ้าคำถามกำกวมให้ตั้งค่านี้เป็น true และใส่ Options
	NeedDisambiguation bool                   `json:"needDisambiguation,omitempty"`
	Options            []DisambiguationOption `json:"options,omitempty"`
}

// --- System API ---
// GET /api/system/status
type SystemStatusResponse struct {
	Status  string `json:"status"`  
	Message string `json:"message,omitempty"`
}
