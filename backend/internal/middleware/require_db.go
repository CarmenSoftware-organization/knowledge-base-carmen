package middleware

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"
	"github.com/gofiber/fiber/v2"
)

// RequireDB answers 503 DB_UNAVAILABLE while the database is unreachable, so
// DB-backed routes fail cleanly in wiki-only mode instead of panicking.
func RequireDB(c *fiber.Ctx) error {
	if !database.Ready() {
		return response.Fail(c, fiber.StatusServiceUnavailable, response.CodeDBUnavailable, "database temporarily unavailable")
	}
	return c.Next()
}
