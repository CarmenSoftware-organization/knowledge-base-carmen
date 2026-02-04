package models

import (
	"time"

	"gorm.io/gorm"
)

type Document struct {
	ID            uint64               `gorm:"primaryKey" json:"id"`
	Title         string               `gorm:"not null" json:"title"`
	Description   string               `gorm:"type:text" json:"description"`
	OwnerID       uint64               `gorm:"not null" json:"owner_id"`
	Owner         User                 `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
	CategoryID    *uint64              `json:"category_id"`                    
	Category      *Category            `gorm:"foreignKey:CategoryID" json:"-"` 
	Status        string               `json:"status"`                         
	IsPublic      bool                 `gorm:"default:false" json:"is_public"`
	Tags          string               `gorm:"type:text" json:"tags"`         
	Versions      []DocumentVersion    `gorm:"foreignKey:DocumentID" json:"versions,omitempty"`
	Permissions   []DocumentPermission `gorm:"foreignKey:DocumentID" json:"permissions,omitempty"`
	CreatedAt     time.Time            `json:"created_at"`
	UpdatedAt     time.Time            `json:"updated_at"`
	DeletedAt     gorm.DeletedAt       `gorm:"index" json:"-"`
}

type DocumentVersion struct {
	ID          uint64    `gorm:"primaryKey" json:"id"`
	DocumentID  uint64    `gorm:"not null" json:"document_id"`
	Document    Document  `gorm:"foreignKey:DocumentID" json:"document,omitempty"`
	Version     int       `gorm:"not null" json:"version"`
	Content     string    `gorm:"type:text" json:"content"`
	ContentHTML string    `gorm:"type:text" json:"content_html"`
	FilePath    string    `json:"file_path"`
	CreatedBy   uint64    `gorm:"not null" json:"created_by"`
	Creator     User      `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type DocumentPermission struct {
	DocumentID uint64   `gorm:"primaryKey" json:"document_id"`
	Document   Document `gorm:"foreignKey:DocumentID" json:"document,omitempty"`
	UserID     uint64   `gorm:"primaryKey" json:"user_id"`
	User       User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Permission string   `gorm:"not null" json:"permission"` // read, write, admin
}
