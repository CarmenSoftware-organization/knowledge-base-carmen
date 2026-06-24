// เอาไว้เช็คว่า backend ยัง OK ไหม (status: "ok")
package api

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/models"
	"github.com/gofiber/fiber/v2"
)

type SystemHandler struct{}

// NewSystemHandler constructs a SystemHandler.
func NewSystemHandler() *SystemHandler {
	return &SystemHandler{}
}

// Status GET /api/system/status
func (h *SystemHandler) Status(c *fiber.Ctx) error {
	return c.JSON(models.SystemStatusResponse{
		Status:  "ok",
		Message: "",
	})
}
