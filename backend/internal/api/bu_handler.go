package api

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/models"
)

type BusinessUnitHandler struct{}

func NewBusinessUnitHandler() *BusinessUnitHandler {
	return &BusinessUnitHandler{}
}

func (h *BusinessUnitHandler) List(c *fiber.Ctx) error {
	var bus []models.BusinessUnit
	if err := database.DB.Table("public.business_units").Find(&bus).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch business units: " + err.Error(),
		})
	}
	return c.JSON(fiber.Map{
		"items": bus,
	})
}
