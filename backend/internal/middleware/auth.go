// Auth + Role middleware (JWT) — ยังไม่ใช้ (เปิดเมื่อมี DB + ลง route ที่ต้อง login)
package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/utils"
)

func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authorization header required",
			})
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid authorization header format",
			})
		}

		claims, err := utils.ValidateToken(tokenString)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		// Store claims in context
		c.Locals("user_id", claims.UserID)
		c.Locals("email", claims.Email)
		c.Locals("roles", claims.Roles)

		return c.Next()
	}
}

func RoleMiddleware(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		roles, ok := c.Locals("roles").([]string)
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "No roles found",
			})
		}

		roleMap := make(map[string]bool)
		for _, role := range roles {
			roleMap[role] = true
		}

		for _, allowedRole := range allowedRoles {
			if roleMap[allowedRole] {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Insufficient permissions",
		})
	}
}
