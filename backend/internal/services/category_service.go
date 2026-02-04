package services

import (
	"strconv"

	domain "github.com/new-carmen/backend/internal/domain"
	"github.com/new-carmen/backend/internal/repositories"
)

type CategoryService struct {
	catRepo *repositories.CategoryRepository
	docRepo *repositories.DocumentRepository
}

func NewCategoryService() *CategoryService {
	return &CategoryService{
		catRepo: repositories.NewCategoryRepository(),
		docRepo: repositories.NewDocumentRepository(),
	}
}

func (s *CategoryService) ListCategories() ([]domain.CategoryPublic, error) {
	cats, err := s.catRepo.ListAll()
	if err != nil {
		return nil, err
	}
	out := make([]domain.CategoryPublic, 0, len(cats))
	for _, c := range cats {
		count, _ := s.catRepo.CountPublicDocumentsByCategory(c.ID)
		out = append(out, domain.CategoryPublic{
			ID:           strconv.FormatUint(c.ID, 10),
			Name:         c.Name,
			Icon:         c.Icon,
			ArticleCount: int(count),
		})
	}
	return out, nil
}

func (s *CategoryService) GetCategoryByID(id uint64) (*domain.Category, error) {
	return s.catRepo.GetByID(id)
}

// ListArticlesByCategory สำหรับ GET /api/categories/:id/articles
func (s *CategoryService) ListArticlesByCategory(categoryID uint64, sort string, limit, offset int) ([]domain.Document, int64, error) {
	return s.docRepo.ListPublicByCategory(categoryID, sort, limit, offset)
}
