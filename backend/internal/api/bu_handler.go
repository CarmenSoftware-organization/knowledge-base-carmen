package api

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/constants"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/security"
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

type provisionBURequest struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type deprovisionBURequest struct {
	Slug string `json:"slug"`
}

// Provision creates/updates a BU and ensures schema + BU tables exist.
func (h *BusinessUnitHandler) Provision(c *fiber.Ctx) error {
	var req provisionBURequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid JSON body"})
	}

	slug := strings.TrimSpace(strings.ToLower(req.Slug))
	if !security.ValidateSchema(slug) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid slug"})
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = strings.ToUpper(slug)
	}
	description := strings.TrimSpace(req.Description)

	tx := database.DB.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": tx.Error.Error()})
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
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "upsert business unit: " + err.Error()})
	}

	createSchemaSQL := fmt.Sprintf(`CREATE SCHEMA IF NOT EXISTS "%s"`, slug)
	if err := tx.Exec(createSchemaSQL).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "create schema: " + err.Error()})
	}

	if err := tx.Exec(`SELECT create_bu_tables(?)`, slug).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "create bu tables: " + err.Error()})
	}

	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"ok":          true,
		"message":     "business unit provisioned",
		"slug":        slug,
		"name":        name,
		"description": description,
	})
}

// Deprovision removes a BU from business_units and drops its schema.
func (h *BusinessUnitHandler) Deprovision(c *fiber.Ctx) error {
	var req deprovisionBURequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid JSON body"})
	}

	slug := strings.TrimSpace(strings.ToLower(req.Slug))
	if !security.ValidateSchema(slug) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid slug"})
	}
	if slug == constants.DefaultBU {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot deprovision default bu"})
	}

	tx := database.DB.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": tx.Error.Error()})
	}

	if err := tx.Exec(`DELETE FROM public.business_units WHERE slug = ?`, slug).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "delete business unit: " + err.Error()})
	}

	dropSchemaSQL := fmt.Sprintf(`DROP SCHEMA IF EXISTS "%s" CASCADE`, slug)
	if err := tx.Exec(dropSchemaSQL).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "drop schema: " + err.Error()})
	}

	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"ok":      true,
		"message": "business unit deprovisioned",
		"slug":    slug,
	})
}
