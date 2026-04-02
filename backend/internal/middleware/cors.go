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
	allowOrigins := "*"
	if !allowAll {
		parts := make([]string, 0)
		for _, o := range strings.Split(origins, ",") {
			if t := strings.TrimSpace(o); t != "" {
				parts = append(parts, t)
			}
		}
		if len(parts) > 0 {
			allowOrigins = strings.Join(parts, ",")
		}
	}

	return cors.New(cors.Config{
		AllowOrigins:     allowOrigins,
		AllowMethods:     "GET,POST,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: !allowAll,
	})
}
