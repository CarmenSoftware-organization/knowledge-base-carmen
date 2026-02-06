// รับ GitHub Webhook (event push), เช็ค branch, แล้วสั่งให้ไป git pull repo wiki-content ผ่าน WikiSyncService
package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"log"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/services"
)

type GitHubWebhookHandler struct {
	syncService *services.WikiSyncService
}

// gitHubPushPayload ใช้เพื่อตรวจ branch
type gitHubPushPayload struct {
	Ref string `json:"ref"`
}

func NewGitHubWebhookHandler() *GitHubWebhookHandler {
	return &GitHubWebhookHandler{
		syncService: services.NewWikiSyncService(),
	}
}

// HandlePush รับ GitHub push webhook และ trigger indexing
func (h *GitHubWebhookHandler) HandlePush(c *fiber.Ctx) error {
	event := c.Get("X-GitHub-Event")
	if event != "push" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "unsupported event",
		})
	}

	cfg := config.AppConfig.GitHub

	// อ่าน raw body สำหรับตรวจ HMAC และ parse ทีเดียว
	rawBody := c.Body()

	// ถ้าตั้ง GITHUB_WEBHOOK_SECRET ไว้ ให้ตรวจ HMAC
	if cfg.WebhookSecret != "" {
		signature := c.Get("X-Hub-Signature-256")
		if !verifyGitHubSignature(cfg.WebhookSecret, rawBody, signature) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid signature",
			})
		}
	}

	var payload gitHubPushPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid payload",
		})
	}

	// ตรวจ branch ให้ตรงกับที่ config กำหนด
	expectedRef := "refs/heads/" + cfg.WebhookBranch
	if payload.Ref != expectedRef {
		log.Printf("[webhook] ignore push on ref %s (expected %s)", payload.Ref, expectedRef)
		return c.JSON(fiber.Map{
			"message": "ignored (branch mismatch)",
		})
	}

	//git pull อัปเดตโฟลเดอร์ wiki-content → frontend เรียก API ได้ข้อมูลใหม่
	if err := h.syncService.Sync(); err != nil {
		log.Printf("[webhook] wiki sync (git pull) error: %v", err)
	}

	return c.JSON(fiber.Map{
		"message": "webhook processed (wiki-content pulled; Chroma Cloud sync handles vectors)",
	})
}

func verifyGitHubSignature(secret string, body []byte, signatureHeader string) bool {
	if signatureHeader == "" {
		return false
	}

	const prefix = "sha256="
	if !strings.HasPrefix(signatureHeader, prefix) {
		return false
	}

	signatureHex := signatureHeader[len(prefix):]
	msgMAC, err := hex.DecodeString(signatureHex)
	if err != nil {
		return false
	}

	mac := hmac.New(sha256.New, []byte(secret))
	if _, err := io.Copy(mac, strings.NewReader(string(body))); err != nil {
		return false
	}
	expectedMAC := mac.Sum(nil)
	return hmac.Equal(msgMAC, expectedMAC)
}

