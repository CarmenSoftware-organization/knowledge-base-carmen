package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/constants"
	"github.com/new-carmen/backend/internal/security"
)

func BUContext() fiber.Handler {
	return func(c *fiber.Ctx) error {
		bu := c.Query("bu")
		if bu == "" {
			bu = c.Get("X-BU-Slug")
		}
		if bu == "" {
			bu = constants.DefaultBU
		}
		if !security.ValidateSchema(bu) {
			bu = constants.DefaultBU
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
