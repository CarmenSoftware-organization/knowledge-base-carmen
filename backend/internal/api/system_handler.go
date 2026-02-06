// เอาไว้เช็คว่า backend ยัง OK ไหม (status: "ok")
package api

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/models"
)

type SystemHandler struct{}

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
