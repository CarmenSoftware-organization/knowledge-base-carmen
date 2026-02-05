// หมวดหมู่ ใช้ storage — ยังไม่ใช้ (เปิดเมื่อมี DB)
package services

import (
	"strconv"

	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/storage"
)

type CategoryService struct {
	catRepo *storage.CategoryRepository
	docRepo *storage.DocumentRepository
}

func NewCategoryService() *CategoryService {
	return &CategoryService{
		catRepo: storage.NewCategoryRepository(),
		docRepo: storage.NewDocumentRepository(),
	}
}

func (s *CategoryService) ListCategories() ([]models.CategoryPublic, error) {
	cats, err := s.catRepo.ListAll()
	if err != nil {
		return nil, err
	}
	out := make([]models.CategoryPublic, 0, len(cats))
	for _, c := range cats {
		count, _ := s.catRepo.CountPublicDocumentsByCategory(c.ID)
		out = append(out, models.CategoryPublic{
			ID:           strconv.FormatUint(c.ID, 10),
			Name:         c.Name,
			Icon:         c.Icon,
			ArticleCount: int(count),
		})
	}
	return out, nil
}

func (s *CategoryService) GetCategoryByID(id uint64) (*models.Category, error) {
	return s.catRepo.GetByID(id)
}

// ListArticlesByCategory สำหรับ GET /api/categories/:id/articles
func (s *CategoryService) ListArticlesByCategory(categoryID uint64, sort string, limit, offset int) ([]models.Document, int64, error) {
	return s.docRepo.ListPublicByCategory(categoryID, sort, limit, offset)
}
