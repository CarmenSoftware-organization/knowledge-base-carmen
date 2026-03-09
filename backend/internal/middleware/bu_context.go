package middleware

import (
	"github.com/gofiber/fiber/v2"
)

func BUContext() fiber.Handler {
	return func(c *fiber.Ctx) error {
		bu := c.Query("bu")
		if bu == "" {
			bu = c.Get("X-BU-Slug")
		}
		if bu == "" {
			bu = "carmen" // Default to carmen
		}
		c.Locals("bu", bu)
		return c.Next()
	}
}

func GetBU(c *fiber.Ctx) string {
	bu, ok := c.Locals("bu").(string)
	if !ok || bu == "" {
		return "carmen"
	}
	return bu
}
