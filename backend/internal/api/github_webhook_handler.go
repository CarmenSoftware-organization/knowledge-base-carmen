package api

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/services"
)

// GitHubWebhookHandler handles incoming GitHub push webhook events.
type GitHubWebhookHandler struct {
	syncService     *services.WikiSyncService
	indexingService *services.IndexingService
}

type gitHubPushPayload struct {
	Ref string `json:"ref"`
}

func NewGitHubWebhookHandler() *GitHubWebhookHandler {
	return &GitHubWebhookHandler{
		syncService:     services.NewWikiSyncService(),
		indexingService: services.NewIndexingService(),
	}
}

// HandlePush processes a GitHub push event: verifies the signature, checks the
// branch, triggers a git pull, and queues a background re-index.
func (h *GitHubWebhookHandler) HandlePush(c *fiber.Ctx) error {
	if c.Get("X-GitHub-Event") != "push" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unsupported event"})
	}

	cfg := config.AppConfig.GitHub
	rawBody := c.Body()

	if cfg.WebhookSecret != "" {
		if !verifyGitHubSignature(cfg.WebhookSecret, rawBody, c.Get("X-Hub-Signature-256")) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid signature"})
		}
	}

	var payload gitHubPushPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	expectedRef := "refs/heads/" + cfg.WebhookBranch
	if payload.Ref != expectedRef {
		log.Printf("[webhook] ignoring push on %s (expected %s)", payload.Ref, expectedRef)
		return c.JSON(fiber.Map{"message": "ignored (branch mismatch)"})
	}

	if err := h.syncService.Sync(); err != nil {
		log.Printf("[webhook] sync error: %v", err)
	}

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		if err := h.indexingService.IndexAll(ctx); err != nil {
			log.Printf("[webhook] indexing error: %v", err)
		}
	}()

	return c.JSON(fiber.Map{"message": "webhook processed"})
}

// verifyGitHubSignature validates the HMAC-SHA256 signature from GitHub.
func verifyGitHubSignature(secret string, body []byte, header string) bool {
	const prefix = "sha256="
	if !strings.HasPrefix(header, prefix) {
		return false
	}
	msgMAC, err := hex.DecodeString(header[len(prefix):])
	if err != nil {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	if _, err := io.Copy(mac, strings.NewReader(string(body))); err != nil {
		return false
	}
	return hmac.Equal(msgMAC, mac.Sum(nil))
}
