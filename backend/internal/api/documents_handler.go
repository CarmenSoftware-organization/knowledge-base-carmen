package api

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/middleware"
	"github.com/new-carmen/backend/internal/security"
)

type DocumentsHandler struct{}

func NewDocumentsHandler() *DocumentsHandler {
	return &DocumentsHandler{}
}

type documentRow struct {
	ID         int64   `json:"id"`
	Path       string  `json:"path"`
	Title      string  `json:"title"`
	Source     string  `json:"source"`
	ChunkCount *int64  `json:"chunk_count,omitempty"`
	CreatedAt  *string `json:"created_at,omitempty"`
	UpdatedAt  *string `json:"updated_at,omitempty"`
}

func (h *DocumentsHandler) List(c *fiber.Ctx) error {
	bu := middleware.GetBU(c)
	if !security.ValidateSchema(bu) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid bu parameter"})
	}
	buID, err := database.BUIDForSlug(bu)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if buID == 0 {
		return c.JSON(fiber.Map{"items": []documentRow{}})
	}
	var rows []documentRow
	sql := `
		SELECT d.id, d.path, d.title, d.source, d.created_at, d.updated_at,
			(SELECT COUNT(*) FROM public.document_chunks c WHERE c.doc_id = d.id) AS chunk_count
		FROM public.documents d
		WHERE d.bu_id = ?
		ORDER BY d.path ASC, d.id ASC
	`
	err = database.DB.Raw(sql, buID).Scan(&rows).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	if rows == nil {
		rows = []documentRow{}
	}
	return c.JSON(fiber.Map{
		"items": rows,
	})
}
