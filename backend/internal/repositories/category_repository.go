package repositories

import (
	"github.com/new-carmen/backend/internal/database"
	domain "github.com/new-carmen/backend/internal/domain"
	"gorm.io/gorm"
)

type CategoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository() *CategoryRepository {
	return &CategoryRepository{db: database.DB}
}

func (r *CategoryRepository) ListAll() ([]domain.Category, error) {
	var list []domain.Category
	err := r.db.Order("sort_order ASC, name ASC").Find(&list).Error
	return list, err
}

func (r *CategoryRepository) GetByID(id uint64) (*domain.Category, error) {
	var c domain.Category
	err := r.db.First(&c, id).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// CountPublicDocumentsByCategory นับเฉพาะ document ที่ is_public = true
func (r *CategoryRepository) CountPublicDocumentsByCategory(categoryID uint64) (int64, error) {
	var n int64
	err := database.DB.Model(&domain.Document{}).
		Where("category_id = ? AND is_public = ?", categoryID, true).
		Count(&n).Error
	return n, err
}
