package middleware

import (
	"strings"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/constants"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/security"
	"github.com/gofiber/fiber/v2"
)

// BUContext resolves the BU slug from query/header (falling back to the default), validates it, and stores it in Locals.
func BUContext() fiber.Handler {
	return func(c *fiber.Ctx) error {
		bu := strings.TrimSpace(c.Query("bu"))
		if bu == "" {
			bu = strings.TrimSpace(c.Get("X-BU-Slug"))
		}
		if bu == "" {
			bu = constants.DefaultBU
		}
		bu = strings.ToLower(bu)
		if !security.ValidateSchema(bu) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid bu"})
		}
		c.Locals("bu", bu)
		return c.Next()
	}
}

// GetBU returns the BU slug stored in Locals, or the default BU when unset.
func GetBU(c *fiber.Ctx) string {
	bu, ok := c.Locals("bu").(string)
	if !ok || bu == "" {
		return constants.DefaultBU
	}
	return bu
}
