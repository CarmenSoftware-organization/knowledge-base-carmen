// CRUD เอกสาร ใช้ storage — ยังไม่ใช้ (เปิดเมื่อมี DB)
package services

import (
	"errors"

	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/storage"
)

type DocumentService struct {
	docRepo *storage.DocumentRepository
}

func NewDocumentService() *DocumentService {
	return &DocumentService{
		docRepo: storage.NewDocumentRepository(),
	}
}

type CreateDocumentRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	IsPublic    bool   `json:"is_public"`
	OwnerID     uint64 `json:"owner_id"`
}

type UpdateDocumentRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	IsPublic    bool   `json:"is_public"`
}

type CreateVersionRequest struct {
	DocumentID  uint64 `json:"document_id"`
	Content     string `json:"content"`
	ContentHTML string `json:"content_html"`
	FilePath    string `json:"file_path"`
	CreatedBy   uint64 `json:"created_by"`
}

func (s *DocumentService) CreateDocument(req CreateDocumentRequest) (*models.Document, error) {
	document := &models.Document{
		Title:       req.Title,
		Description: req.Description,
		OwnerID:     req.OwnerID,
		Status:      "draft",
		IsPublic:    req.IsPublic,
	}

	if err := s.docRepo.Create(document); err != nil {
		return nil, err
	}

	return document, nil
}

func (s *DocumentService) GetDocument(id uint64) (*models.Document, error) {
	return s.docRepo.GetByID(id)
}

func (s *DocumentService) UpdateDocument(id uint64, req UpdateDocumentRequest) (*models.Document, error) {
	document, err := s.docRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	document.Title = req.Title
	document.Description = req.Description
	document.Status = req.Status
	document.IsPublic = req.IsPublic

	if err := s.docRepo.Update(document); err != nil {
		return nil, err
	}

	return document, nil
}

func (s *DocumentService) DeleteDocument(id uint64) error {
	return s.docRepo.Delete(id)
}

func (s *DocumentService) AddVersion(req CreateVersionRequest) (*models.DocumentVersion, error) {
	// Get latest version
	latest, err := s.docRepo.GetLatestVersion(req.DocumentID)
	versionNum := 1
	if err == nil && latest != nil {
		versionNum = latest.Version + 1
	}

	version := &models.DocumentVersion{
		DocumentID:  req.DocumentID,
		Version:     versionNum,
		Content:     req.Content,
		ContentHTML: req.ContentHTML,
		FilePath:    req.FilePath,
		CreatedBy:   req.CreatedBy,
	}

	if err := s.docRepo.AddVersion(version); err != nil {
		return nil, err
	}

	return version, nil
}

func (s *DocumentService) SetPermission(documentID, userID uint64, permission string) error {
	perm := &models.DocumentPermission{
		DocumentID: documentID,
		UserID:     userID,
		Permission: permission,
	}

	return s.docRepo.SetPermission(perm)
}

func (s *DocumentService) CheckPermission(documentID, userID uint64, requiredPermission string) (bool, error) {
	document, err := s.docRepo.GetByID(documentID)
	if err != nil {
		return false, err
	}

	// Owner has all permissions
	if document.OwnerID == userID {
		return true, nil
	}

	// Public documents can be read by anyone
	if document.IsPublic && requiredPermission == "read" {
		return true, nil
	}

	// Check specific permission
	perm, err := s.docRepo.GetPermission(documentID, userID)
	if err != nil {
		return false, nil
	}

	switch requiredPermission {
	case "read":
		return perm.Permission == "read" || perm.Permission == "write" || perm.Permission == "admin", nil
	case "write":
		return perm.Permission == "write" || perm.Permission == "admin", nil
	case "admin":
		return perm.Permission == "admin", nil
	default:
		return false, errors.New("invalid permission type")
	}
}
