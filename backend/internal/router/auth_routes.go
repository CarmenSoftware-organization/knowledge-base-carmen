// /api/auth (register, login) — ยังไม่ใช้ (เปิดเมื่อมี DB ใน routes.go)
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
)

func RegisterAuth(app *fiber.App) {
	authHandler := api.NewAuthHandler()
	auth := app.Group("/api/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)
}
