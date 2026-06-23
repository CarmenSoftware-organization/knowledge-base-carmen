package api

import (
	"context"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/export"
)

const maxExportBodyBytes = 2 * 1024 * 1024

// ExportHandler renders chat answers to PDF. Renderer is nil when Gotenberg is
// not configured, in which case PDF returns 503.
type ExportHandler struct {
	Renderer     export.Renderer
	Deps         export.Deps
	ImageBaseURL string
}

type exportPDFRequest struct {
	HTML string `json:"html"`
}

// PDF handles POST /api/export/pdf — body {html}. Returns application/pdf.
func (h *ExportHandler) PDF(c *fiber.Ctx) error {
	if len(c.Body()) > maxExportBodyBytes {
		return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{"error": "html too large"})
	}
	var req exportPDFRequest
	if err := c.BodyParser(&req); err != nil || req.HTML == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "html is required"})
	}
	if h.Renderer == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "export unavailable"})
	}

	ctx, cancel := context.WithTimeout(c.UserContext(), 30*time.Second)
	defer cancel()

	embedded := export.EmbedSafeImages(ctx, req.HTML, h.ImageBaseURL, h.Deps)
	full := export.WrapHTML(embedded)
	pdf, err := h.Renderer.RenderPDF(ctx, full)
	if err != nil {
		log.Printf("PDF export error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Export failed"})
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", `attachment; filename="carmen-export.pdf"`)
	return c.Send(pdf)
}
