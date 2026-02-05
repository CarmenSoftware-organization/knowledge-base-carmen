// /api/admin group — ยังไม่ใช้ (เปิดเมื่อมี DB ใน routes.go)
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/middleware"
)

func RegisterAdmin(apiGroup fiber.Router) {
	_ = apiGroup.Group("/admin", middleware.RoleMiddleware("admin", "superadmin"))
	// Add admin routes here
}
