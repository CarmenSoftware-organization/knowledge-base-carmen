package models

import (
	"time"

	"gorm.io/gorm"
)

type Category struct {
	ID        uint64         `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"not null" json:"name"`
	Icon      string         `json:"icon"` 
	SortOrder int            `gorm:"default:0" json:"sort_order"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	Documents []Document `gorm:"foreignKey:CategoryID" json:"-"`
}
func (Category) TableName() string {
	return "categories"
}
