package models

import (
	"time"
)

// ArticleFeedback เก็บ feedback จากผู้ใช้ (Helpful / Not Helpful) ไม่ต้อง login
type ArticleFeedback struct {
	ID         uint64    `gorm:"primaryKey" json:"id"`
	DocumentID uint64    `gorm:"not null;index" json:"document_id"` // map กับ article id
	Helpful    bool      `gorm:"not null" json:"helpful"`
	CreatedAt time.Time `json:"created_at"`
}

func (ArticleFeedback) TableName() string {
	return "article_feedbacks"
}
