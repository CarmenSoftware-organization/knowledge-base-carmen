// POST /webhook/github — ยังไม่ใช้ (เปิดเมื่อมี DB)
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
	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/services"
)

type GitHubWebhookHandler struct {
	indexingService *services.IndexingService
	syncService     *services.WikiSyncService
}

func NewGitHubWebhookHandler() *GitHubWebhookHandler {
	return &GitHubWebhookHandler{
		indexingService: services.NewIndexingService(),
		syncService:     services.NewWikiSyncService(),
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

	var payload models.GitHubPushPayload
	if err := c.BodyParser(&payload); err != nil {
		// fallback ถ้า BodyParser ใช้ rawBody อยู่แล้วก็ถือว่า error จริง
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

	// 1) git pull อัปเดตโฟลเดอร์ wiki-content → frontend เรียก API ได้ข้อมูลใหม่
	if err := h.syncService.Sync(); err != nil {
		log.Printf("[webhook] wiki sync (git pull) error: %v", err)
		// ยังทำ index ต่อได้
	}

	// 2) (ถ้าต้องการให้ backend index เข้า Chroma เอง ให้เปิดส่วนนี้)
	// ตอนนี้ปิดไว้ เพราะใช้ Chroma Cloud GitHub sync อยู่แล้ว ไม่อยาก index ซ้ำซ้อน
	// if err := h.indexingService.ProcessGitHubPush(&payload); err != nil {
	// 	log.Printf("[webhook] indexing error: %v", err)
	// 	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
	// 		"error": err.Error(),
	// 	})
	// }

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

