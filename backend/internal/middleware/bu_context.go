package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/constants"
	"github.com/new-carmen/backend/internal/security"
)

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

func GetBU(c *fiber.Ctx) string {
	bu, ok := c.Locals("bu").(string)
	if !ok || bu == "" {
		return constants.DefaultBU
	}
	return bu
}
