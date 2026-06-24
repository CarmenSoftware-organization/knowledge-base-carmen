package middleware

import (
	"crypto/subtle"
	"strings"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
	"github.com/gofiber/fiber/v2"
)

// secureEqual reports whether a and b match using a constant-time comparison.
func secureEqual(a, b string) bool {
	if len(a) == 0 || len(b) == 0 {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

// RequireAdminKey rejects requests whose X-Admin-Key header does not match the configured admin key.
func RequireAdminKey(c *fiber.Ctx) error {
	expected := strings.TrimSpace(config.AppConfig.Server.AdminAPIKey)
	if !secureEqual(c.Get("X-Admin-Key"), expected) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	return c.Next()
}

// RequireInternalAPIKey rejects requests whose X-Internal-API-Key header does not match the configured internal key.
func RequireInternalAPIKey(c *fiber.Ctx) error {
	expected := strings.TrimSpace(config.AppConfig.Server.InternalAPIKey)
	if !secureEqual(c.Get("X-Internal-API-Key"), expected) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	return c.Next()
}
