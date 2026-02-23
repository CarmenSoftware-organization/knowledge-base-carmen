package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/api"
)

func RegisterWebhook(app *fiber.App) {
	githubWebhookHandler := api.NewGitHubWebhookHandler()
	app.Post("/webhook/github", githubWebhookHandler.HandlePush)
}
