// Category repository ใช้ database.DB — ยังไม่ใช้ (เปิดเมื่อมี DB)
package storage

import (
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/models"
	"gorm.io/gorm"
)

type CategoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository() *CategoryRepository {
	return &CategoryRepository{db: database.DB}
}

func (r *CategoryRepository) ListAll() ([]models.Category, error) {
	var list []models.Category
	err := r.db.Order("sort_order ASC, name ASC").Find(&list).Error
	return list, err
}

func (r *CategoryRepository) GetByID(id uint64) (*models.Category, error) {
	var c models.Category
	err := r.db.First(&c, id).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *CategoryRepository) CountPublicDocumentsByCategory(categoryID uint64) (int64, error) {
	var n int64
	err := database.DB.Model(&models.Document{}).
		Where("category_id = ? AND is_public = ?", categoryID, true).
		Count(&n).Error
	return n, err
}
