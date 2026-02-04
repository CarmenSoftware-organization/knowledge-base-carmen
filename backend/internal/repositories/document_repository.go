package repositories

import (
	"github.com/new-carmen/backend/internal/database"
	domain "github.com/new-carmen/backend/internal/domain"
	"gorm.io/gorm"
)

type DocumentRepository struct {
	db *gorm.DB
}

func NewDocumentRepository() *DocumentRepository {
	return &DocumentRepository{
		db: database.DB,
	}
}

func (r *DocumentRepository) Create(document *domain.Document) error {
	return r.db.Create(document).Error
}

func (r *DocumentRepository) GetByID(id uint64) (*domain.Document, error) {
	var document domain.Document
	err := r.db.Preload("Owner").Preload("Versions").Preload("Permissions").
		First(&document, id).Error
	if err != nil {
		return nil, err
	}
	return &document, nil
}

func (r *DocumentRepository) GetByOwnerID(ownerID uint64) ([]domain.Document, error) {
	var documents []domain.Document
	err := r.db.Where("owner_id = ?", ownerID).Find(&documents).Error
	return documents, err
}

func (r *DocumentRepository) Update(document *domain.Document) error {
	return r.db.Save(document).Error
}

func (r *DocumentRepository) Delete(id uint64) error {
	return r.db.Delete(&domain.Document{}, id).Error
}

func (r *DocumentRepository) AddVersion(version *domain.DocumentVersion) error {
	return r.db.Create(version).Error
}

func (r *DocumentRepository) GetLatestVersion(documentID uint64) (*domain.DocumentVersion, error) {
	var version domain.DocumentVersion
	err := r.db.Where("document_id = ?", documentID).
		Order("version DESC").First(&version).Error
	if err != nil {
		return nil, err
	}
	return &version, nil
}

func (r *DocumentRepository) SetPermission(permission *domain.DocumentPermission) error {
	return r.db.Save(permission).Error
}

func (r *DocumentRepository) GetPermission(documentID, userID uint64) (*domain.DocumentPermission, error) {
	var permission domain.DocumentPermission
	err := r.db.Where("document_id = ? AND user_id = ?", documentID, userID).
		First(&permission).Error
	if err != nil {
		return nil, err
	}
	return &permission, nil
}

func (r *DocumentRepository) Search(query string, limit, offset int) ([]domain.Document, int64, error) {
	var documents []domain.Document
	var total int64

	queryBuilder := r.db.Model(&domain.Document{}).
		Where("title ILIKE ? OR description ILIKE ? OR tags ILIKE ?", "%"+query+"%", "%"+query+"%", "%"+query+"%")

	if err := queryBuilder.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := queryBuilder.Limit(limit).Offset(offset).Find(&documents).Error
	return documents, total, err
}

// SearchPublic ค้นหาเฉพาะ is_public = true, พร้อม Preload Category
func (r *DocumentRepository) SearchPublic(query string, limit, offset int) ([]domain.Document, int64, error) {
	var documents []domain.Document
	var total int64
	q := r.db.Model(&domain.Document{}).Where("is_public = ?", true).
		Where("title ILIKE ? OR description ILIKE ? OR tags ILIKE ?", "%"+query+"%", "%"+query+"%", "%"+query+"%")
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Preload("Category").Limit(limit).Offset(offset).Find(&documents).Error
	return documents, total, err
}

// --- Public API: เฉพาะ is_public = true ---

func (r *DocumentRepository) ListPublic(limit, offset int) ([]domain.Document, int64, error) {
	var list []domain.Document
	var total int64
	q := r.db.Model(&domain.Document{}).Where("is_public = ?", true)
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Preload("Category").Order("updated_at DESC").Limit(limit).Offset(offset).Find(&list).Error
	return list, total, err
}

func (r *DocumentRepository) ListPublicByCategory(categoryID uint64, sort string, limit, offset int) ([]domain.Document, int64, error) {
	var list []domain.Document
	var total int64
	q := r.db.Model(&domain.Document{}).Where("is_public = ? AND category_id = ?", true, categoryID)
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	switch sort {
	case "popular":
		// TODO: order by feedback count if we have it; for now same as latest
		q = q.Order("updated_at DESC")
	case "az", "a-z":
		q = q.Order("title ASC")
	default:
		q = q.Order("updated_at DESC") // latest
	}
	err := q.Preload("Category").Limit(limit).Offset(offset).Find(&list).Error
	return list, total, err
}

func (r *DocumentRepository) GetPublicByID(id uint64) (*domain.Document, error) {
	var doc domain.Document
	err := r.db.Preload("Category").Where("id = ? AND is_public = ?", id, true).First(&doc).Error
	if err != nil {
		return nil, err
	}
	return &doc, nil
}

// ListPublicTitles for search suggest
func (r *DocumentRepository) ListPublicTitles(limit int) ([]struct {
	ID    uint64
	Title string
}, error) {
	var out []struct {
		ID    uint64
		Title string
	}
	err := r.db.Model(&domain.Document{}).Select("id, title").
		Where("is_public = ?", true).Limit(limit).Find(&out).Error
	return out, err
}

// ListPublicRelated returns other public documents (same category first, then by updated_at)
func (r *DocumentRepository) ListPublicRelated(documentID uint64, categoryID *uint64, limit int) ([]domain.Document, error) {
	var list []domain.Document
	q := r.db.Where("is_public = ? AND id != ?", true, documentID)
	if categoryID != nil && *categoryID > 0 {
		q = q.Where("category_id = ?", *categoryID)
	}
	err := q.Order("updated_at DESC").Limit(limit).Find(&list).Error
	return list, err
}
