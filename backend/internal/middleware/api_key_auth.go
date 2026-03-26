package middleware

import (
	"crypto/subtle"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/config"
)

func secureEqual(a, b string) bool {
	if len(a) == 0 || len(b) == 0 {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

func RequireAdminKey(c *fiber.Ctx) error {
	expected := strings.TrimSpace(config.AppConfig.Server.AdminAPIKey)
	if !secureEqual(c.Get("X-Admin-Key"), expected) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	return c.Next()
}

func RequireInternalAPIKey(c *fiber.Ctx) error {
	expected := strings.TrimSpace(config.AppConfig.Server.InternalAPIKey)
	if !secureEqual(c.Get("X-Internal-API-Key"), expected) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	return c.Next()
}
