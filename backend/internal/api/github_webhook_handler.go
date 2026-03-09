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
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/services"
)

// GitHubWebhookHandler handles incoming GitHub push webhook events.
type GitHubWebhookHandler struct {
	syncService     *services.WikiSyncService
	indexingService *services.IndexingService
	logService      *services.ActivityLogService
}

type gitHubPushPayload struct {
	Ref    string `json:"ref"`
	Pusher struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	} `json:"pusher"`
	Commits []struct {
		ID        string   `json:"id"`
		Message   string   `json:"message"`
		Author    struct {
			Name  string `json:"name"`
			Email string `json:"email"`
		} `json:"author"`
		Added    []string `json:"added"`
		Removed  []string `json:"removed"`
		Modified []string `json:"modified"`
	} `json:"commits"`
}

func NewGitHubWebhookHandler() *GitHubWebhookHandler {
	return &GitHubWebhookHandler{
		syncService:     services.NewWikiSyncService(),
		indexingService: services.NewIndexingService(),
		logService:      services.NewActivityLogService(),
	}
}


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

	// Log detailed changes
	username := payload.Pusher.Name
	if username == "" {
		username = "GitHub Webhook"
	}

	for _, commit := range payload.Commits {

		if len(commit.Added) > 0 {
			h.logService.Log("", username, "สร้างไฟล์วิกิใหม่", "wiki", map[string]interface{}{
				"status": "POST",
				"files": commit.Added,
				"author": commit.Author.Name,
			}, c.Get("User-Agent"))
		}
		if len(commit.Modified) > 0 {
			h.logService.Log("", username, "อัปเดตไฟล์วิกิ", "wiki", map[string]interface{}{
				"status": "PUT",
				"files": commit.Modified,
				"author": commit.Author.Name,
			}, c.Get("User-Agent"))
		}
		if len(commit.Removed) > 0 {
			h.logService.Log("", username, "ลบไฟล์วิกิ", "wiki", map[string]interface{}{
				"status": "DELETE",
				"files": commit.Removed,
				"author": commit.Author.Name,
			}, c.Get("User-Agent"))
		}
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
		defer cancel()

		var bus []models.BusinessUnit
		if err := database.DB.Find(&bus).Error; err != nil {
			log.Printf("[webhook] failed to fetch BUs: %v", err)
			return
		}

		for _, bu := range bus {
			log.Printf("[webhook] starting indexing for BU: %s", bu.Slug)
			if err := h.indexingService.IndexAll(ctx, bu.Slug); err != nil {
				log.Printf("[webhook] indexing error for %s: %v", bu.Slug, err)
			}
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
