package router

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api"
	"github.com/gofiber/fiber/v2"
)

// RegisterWebhook wires the POST /webhook/github push webhook route.
func RegisterWebhook(app *fiber.App) {
	githubWebhookHandler := api.NewGitHubWebhookHandler()
	app.Post("/webhook/github", githubWebhookHandler.HandlePush)
}
