package repositories

import (
	"github.com/new-carmen/backend/internal/database"
	domain "github.com/new-carmen/backend/internal/domain"
	"gorm.io/gorm"
)

type ArticleFeedbackRepository struct {
	db *gorm.DB
}

func NewArticleFeedbackRepository() *ArticleFeedbackRepository {
	return &ArticleFeedbackRepository{db: database.DB}
}

func (r *ArticleFeedbackRepository) Create(f *domain.ArticleFeedback) error {
	return r.db.Create(f).Error
}
