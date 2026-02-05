// Entry point — ตอนปิด DB จะรันแค่ GET /health + GET /api/system/status
package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/config"
	// "github.com/new-carmen/backend/internal/database"
	// "github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/router"
)

func main() {
	// Load configuration
	if err := config.Load(); err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// --- ปิดไว้เมื่อยังไม่มี DB/role (Wiki เป็น admin อยู่แล้ว)
	// เปิดเมื่อพร้อมใช้ DB: เปิด block นี้ + เปิด block ใน internal/router/routes.go ด้วย ---
	// if err := database.Connect(); err != nil {
	// 	log.Fatal("Failed to connect to database:", err)
	// }
	// defer database.Close()
	// if err := database.Migrate(
	// 	&models.User{},
	// 	&models.Role{},
	// 	&models.Category{},
	// 	&models.Document{},
	// 	&models.DocumentVersion{},
	// 	&models.DocumentPermission{},
	// 	&models.ArticleFeedback{},
	// ); err != nil {
	// 	log.Fatal("Failed to migrate database:", err)
	// }

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName: "New Carmen Backend",
	})

	// Setup routes
	router.SetupRoutes(app)

	// Start server
	port := config.AppConfig.Server.Port
	if err := app.Listen(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
