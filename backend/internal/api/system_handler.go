package api

import (
	"github.com/gofiber/fiber/v2"
	domain "github.com/new-carmen/backend/internal/domain"
)

type SystemHandler struct{}

func NewSystemHandler() *SystemHandler {
	return &SystemHandler{}
}

// Status GET /api/system/status
func (h *SystemHandler) Status(c *fiber.Ctx) error {
	return c.JSON(domain.SystemStatusResponse{
		Status:  "ok",
		Message: "",
	})
}
