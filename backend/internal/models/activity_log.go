package models

import (
	"time"

	"gorm.io/gorm"
)

// BusinessUnit represents a business unit in the system (e.g., carmen, inventory)
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
	ID        uint64         `gorm:"primaryKey" json:"id"`
	BUID      *uint          `json:"bu_id"`
	UserID    string         `json:"user_id"` // Store user reference as text for now
	Action    string         `gorm:"not null" json:"action"`
	Category  string         `gorm:"not null" json:"category"` // wiki, system, admin
	Details   interface{}    `gorm:"type:jsonb" json:"details"`
	Timestamp time.Time      `gorm:"default:now()" json:"timestamp"`
	CreatedAt time.Time      `json:"created_at"`
	
	// Association
	BusinessUnit *BusinessUnit `gorm:"foreignKey:BUID" json:"business_unit,omitempty"`
}

// TableName specifies the table name for ActivityLog to be in public schema
func (ActivityLog) TableName() string {
	return "public.activity_logs"
}
