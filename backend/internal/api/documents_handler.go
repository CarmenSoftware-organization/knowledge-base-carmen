
package api

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/database"
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
	var rows []documentRow
	err := database.DB.Raw(`
SELECT d.id, d.path, d.title, d.source, d.created_at, d.updated_at,
       (SELECT COUNT(*) FROM document_chunks c WHERE c.document_id = d.id) AS chunk_count
FROM documents d
ORDER BY d.path ASC, d.id ASC
`).Scan(&rows).Error
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
