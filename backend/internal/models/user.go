// โมเดล User / Role — ยังไม่ใช้ (เปิดเมื่อมี DB)
package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID           uint64         `gorm:"primaryKey" json:"id"`
	Email        string         `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string         `gorm:"not null" json:"-"`
	Name         string         `json:"name"`
	Status       string         `json:"status"`
	Roles        []Role         `gorm:"many2many:user_roles;" json:"roles"`
	Documents    []Document     `gorm:"foreignKey:OwnerID" json:"documents,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type Role struct {
	ID    uint   `gorm:"primaryKey" json:"id"`
	Name  string `gorm:"uniqueIndex;not null" json:"name"`
	Users []User `gorm:"many2many:user_roles;" json:"users,omitempty"`
}

type UserRole struct {
	UserID uint64 `gorm:"primaryKey" json:"user_id"`
	RoleID uint   `gorm:"primaryKey" json:"role_id"`
}
