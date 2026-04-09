package models

import (
	"time"

	"gorm.io/gorm"
)

// BusinessUnit represents a business unit in the system (e.g., carmen, blueledgers)
type BusinessUnit struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"unique;not null" json:"name"`
	Slug        string         `gorm:"unique;not null" json:"slug"`
	Description string         `json:"description"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for BusinessUnit to be in public schema
func (BusinessUnit) TableName() string {
	return "public.business_units"
}

// ActivityLog records events within the system
type ActivityLog struct {
	ID        uint64          `gorm:"primaryKey" json:"id"`
	BUID      *uint           `gorm:"column:bu_id" json:"bu_id"`
	UserID    string          `gorm:"column:user_id" json:"user_id"` 
	Action    string          `gorm:"column:action;not null" json:"action"`
	Category  string          `gorm:"column:category;not null" json:"category"` 
	Details   interface{}     `gorm:"column:details;type:jsonb" json:"details"`
	UserAgent string          `gorm:"column:user_agent" json:"user_agent"`
	Timestamp time.Time       `gorm:"column:timestamp;default:now()" json:"timestamp"`
	CreatedAt time.Time       `gorm:"column:created_at" json:"created_at"`
	
	// Association
	BusinessUnit *BusinessUnit `gorm:"foreignKey:BUID" json:"business_unit,omitempty"`
}

// TableName specifies the table name for ActivityLog to be in public schema
func (ActivityLog) TableName() string {
	return "public.activity_logs"
}
