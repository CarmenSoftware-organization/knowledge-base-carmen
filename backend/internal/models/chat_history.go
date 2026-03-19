package models

import (
	"time"
)

// ChatHistory stores Q&A for cache-by-similarity lookup
type ChatHistory struct {
	ID               int64       `gorm:"primaryKey" json:"id"`
	BUID             uint        `gorm:"column:bu_id;not null" json:"bu_id"`
	UserID           string      `gorm:"column:user_id" json:"user_id"`
	Question         string      `gorm:"column:question;not null" json:"question"`
	Answer           string      `gorm:"column:answer;not null" json:"answer"`
	Sources          interface{} `gorm:"column:sources;type:jsonb" json:"sources"`
	QuestionEmbedding string `gorm:"-" json:"-"` 
	CreatedAt        time.Time   `gorm:"column:created_at" json:"created_at"`

	BusinessUnit *BusinessUnit `gorm:"foreignKey:BUID" json:"business_unit,omitempty"`
}

// TableName specifies the table name
func (ChatHistory) TableName() string {
	return "public.chat_history"
}
