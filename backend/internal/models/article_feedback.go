// โมเดล feedback บทความ — ยังไม่ใช้ (เปิดเมื่อมี DB)
package models

import (
	"time"
)

type ArticleFeedback struct {
	ID         uint64    `gorm:"primaryKey" json:"id"`
	DocumentID uint64    `gorm:"not null;index" json:"document_id"` 
	Helpful    bool      `gorm:"not null" json:"helpful"`
	CreatedAt time.Time `json:"created_at"`
}

func (ArticleFeedback) TableName() string {
	return "article_feedbacks"
}
