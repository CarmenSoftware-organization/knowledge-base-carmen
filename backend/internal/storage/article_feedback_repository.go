// Article feedback repository ใช้ database.DB — ยังไม่ใช้ (เปิดเมื่อมี DB)
package storage

import (
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/models"
	"gorm.io/gorm"
)

type ArticleFeedbackRepository struct {
	db *gorm.DB
}

func NewArticleFeedbackRepository() *ArticleFeedbackRepository {
	return &ArticleFeedbackRepository{db: database.DB}
}

func (r *ArticleFeedbackRepository) Create(f *models.ArticleFeedback) error {
	return r.db.Create(f).Error
}
