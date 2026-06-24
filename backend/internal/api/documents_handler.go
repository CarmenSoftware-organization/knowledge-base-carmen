package api

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/middleware"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/models"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/security"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type DocumentsHandler struct{}

// NewDocumentsHandler constructs a DocumentsHandler.
func NewDocumentsHandler() *DocumentsHandler {
	return &DocumentsHandler{}
}

// List handles GET /api/documents — returns the request BU's documents with their
// chunk counts, ordered by path.
func (h *DocumentsHandler) List(c *fiber.Ctx) error {
	bu := middleware.GetBU(c)
	if !security.ValidateSchema(bu) {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBU, "invalid bu parameter")
	}
	buID, err := database.BUIDForSlug(bu)
	if err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBU, err.Error())
	}
	if buID == uuid.Nil {
		return response.OK(c, []models.DocumentSummary{})
	}
	var rows []models.DocumentSummary
	sql := `
		SELECT d.id, d.path, d.title, d.source, d.created_at, d.updated_at,
			(SELECT COUNT(*) FROM public.document_chunks c WHERE c.doc_id = d.id) AS chunk_count
		FROM public.documents d
		WHERE d.bu_id = ?
		ORDER BY d.path ASC, d.id ASC
	`
	if err := database.DB.Raw(sql, buID).Scan(&rows).Error; err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	if rows == nil {
		rows = []models.DocumentSummary{}
	}
	return response.OK(c, rows)
}
