package api

import (
	"strings"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/constants"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/models"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/security"
	"github.com/gofiber/fiber/v2"
)

type BusinessUnitHandler struct{}

// NewBusinessUnitHandler constructs a BusinessUnitHandler.
func NewBusinessUnitHandler() *BusinessUnitHandler {
	return &BusinessUnitHandler{}
}

// List returns all business unit rows from public.business_units.
func (h *BusinessUnitHandler) List(c *fiber.Ctx) error {
	var bus []models.BusinessUnit
	if err := database.DB.Table("public.business_units").Find(&bus).Error; err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, "failed to fetch business units: "+err.Error())
	}
	if bus == nil {
		bus = []models.BusinessUnit{}
	}
	return response.OK(c, bus)
}

type provisionBURequest struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type deprovisionBURequest struct {
	Slug string `json:"slug"`
}

// Provision creates/updates a BU row. Documents/chunks are shared public tables keyed by bu_id — no schema is created.
func (h *BusinessUnitHandler) Provision(c *fiber.Ctx) error {
	var req provisionBURequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, "invalid JSON body")
	}

	slug := strings.TrimSpace(strings.ToLower(req.Slug))
	if !security.ValidateSchema(slug) {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidSlug, "invalid slug")
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = strings.ToUpper(slug)
	}
	description := strings.TrimSpace(req.Description)

	tx := database.DB.Begin()
	if tx.Error != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, tx.Error.Error())
	}

	if err := tx.Exec(`
		INSERT INTO public.business_units (name, slug, description)
		VALUES (?, ?, ?)
		ON CONFLICT (slug) DO UPDATE
		SET name = EXCLUDED.name,
		    description = EXCLUDED.description,
		    updated_at = NOW()
	`, name, slug, description).Error; err != nil {
		tx.Rollback()
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, "upsert business unit: "+err.Error())
	}

	if err := tx.Commit().Error; err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}

	return response.OK(c, models.ProvisionResult{Slug: slug, Name: name, Description: description})
}

// Deprovision deletes a BU row; documents/chunks cascade-delete via FK.
func (h *BusinessUnitHandler) Deprovision(c *fiber.Ctx) error {
	var req deprovisionBURequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, "invalid JSON body")
	}

	slug := strings.TrimSpace(strings.ToLower(req.Slug))
	if !security.ValidateSchema(slug) {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidSlug, "invalid slug")
	}
	if slug == constants.DefaultBU {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeCannotDeprovisionDefault, "cannot deprovision default bu")
	}

	tx := database.DB.Begin()
	if tx.Error != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, tx.Error.Error())
	}

	if err := tx.Exec(`DELETE FROM public.business_units WHERE slug = ?`, slug).Error; err != nil {
		tx.Rollback()
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, "delete business unit: "+err.Error())
	}

	if err := tx.Commit().Error; err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}

	return response.OK(c, models.DeprovisionResult{Slug: slug})
}
