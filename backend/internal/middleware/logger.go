package middleware

import (
	"strings"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

// Logger returns request-logging middleware: JSON format in production, colored human-readable format otherwise.
func Logger() fiber.Handler {
	isProd := config.AppConfig != nil && strings.EqualFold(config.AppConfig.Server.Environment, "production")
	if isProd {
		return logger.New(logger.Config{
			Format:     "{\"ts\":\"${time}\",\"rid\":\"${locals:requestid}\",\"status\":${status},\"latency\":\"${latency}\",\"method\":\"${method}\",\"path\":\"${path}\",\"ip\":\"${ip}\"}\n",
			TimeFormat: "2006-01-02T15:04:05.000Z07:00",
			TimeZone:   "Asia/Bangkok",
		})
	}

	return logger.New(logger.Config{
		Format:     "${time} | rid=${locals:requestid} | ${color}${status}${reset} | ${latency} | ${method} ${path} | ${ip}\n",
		TimeFormat: "15:04:05",
		TimeZone:   "Asia/Bangkok",
	})
}
