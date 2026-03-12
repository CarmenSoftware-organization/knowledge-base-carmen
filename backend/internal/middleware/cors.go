package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/new-carmen/backend/internal/config"
)

func CORS() fiber.Handler {
	origins := config.AppConfig.Server.CORSOrigins
	allowAll := strings.TrimSpace(origins) == "" || origins == "*"

	return cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool {
			if allowAll || origin == "" {
				return true
			}
			for _, o := range strings.Split(origins, ",") {
				if strings.TrimSpace(o) == origin {
					return true
				}
			}
			return false
		},
		AllowMethods:     "GET,POST,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	})
}
