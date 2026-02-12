// ใช้ดึง context จาก pgvector + ส่งให้ Ollama ตอบ → ใช้ทำ chatbot
package api

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/utils"
	"github.com/new-carmen/backend/pkg/ollama"
)

type ChatHandler struct {
	llm       *ollama.Client
	embedLLM  *ollama.Client
}

func NewChatHandler() *ChatHandler {
	return &ChatHandler{
		llm:      ollama.NewClient(),       // ใช้ ChatModel
		embedLLM: ollama.NewEmbedClient(), // ใช้ EmbedModel
	}
}

func (h *ChatHandler) Ask(c *fiber.Ctx) error {
	var req models.ChatAskRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	q := strings.TrimSpace(req.Question)
	if q == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "question is required"})
	}

	// 1) สร้าง embedding ของคำถาม
	emb, err := h.embedLLM.Embedding(q)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "failed to create embedding: " + err.Error(),
			"answer":  "",
			"sources": []models.ChatSource{},
		})
	}

	embStr := utils.Float32SliceToPgVector(emb)

	// 2) ดึง context จาก Postgres/pgvector — กรอง path ตาม topic ที่ infer จากคำถาม (data-driven ไม่ hardcode case)
	type chunkRow struct {
		Path    string
		Title   string
		Content string
	}
	pathFilter := buildPathFilterFromQuestion(q)
	query := `
SELECT d.path, d.title, dc.content
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
` + pathFilter + `
ORDER BY dc.embedding <-> ?::vector
LIMIT 10
`
	var rows []chunkRow
	if err := database.DB.Raw(query, embStr).Scan(&rows).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "failed to query vector index: " + err.Error(),
			"answer":  "",
			"sources": []models.ChatSource{},
		})
	}

	// 3) รวม context เป็นข้อความยาวให้ LLM ใช้ตอบ
	var contextBuilder strings.Builder
	sources := make([]models.ChatSource, 0)
	const maxContextChars = 8000 // กัน prompt ยาวเกินจน Ollama / proxy timeout
	for i, row := range rows {
		// ตัดเนื้อหาให้สั้นลงต่อชิ้น
		content := row.Content
		if len(content) > 2000 {
			content = content[:2000]
		}

		if contextBuilder.Len() >= maxContextChars {
			break
		}

		contextBuilder.WriteString("\n--- Context ")
		contextBuilder.WriteString(strconv.Itoa(i + 1))
		contextBuilder.WriteString(" ---\n")
		contextBuilder.WriteString(content)
		contextBuilder.WriteString("\n")

		title := strings.TrimSpace(row.Title)
		if title == "" {
			title = row.Path
		}
		sources = append(sources, models.ChatSource{
			ArticleID: row.Path,
			Title:     title,
		})
	}
	context := contextBuilder.String()

	// 4) ให้ Ollama สร้างคำตอบจาก context + question
	answer, err := h.llm.GenerateAnswer(context, q)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "failed to generate answer: " + err.Error(),
			"answer":  "",
			"sources": sources,
		})
	}

	return c.JSON(models.ChatAskResponse{
		Answer:  answer,
		Sources: sources,
	})
}

// topicPathRule กำหนดว่าเมื่อคำถามมีคำใน keywords ใดคำหนึ่ง ให้กรอง path ตาม patterns (ILIKE)
type topicPathRule struct {
	Keywords []string // มีคำใดคำหนึ่งในคำถาม (lowercase สำหรับอังกฤษ)
	Patterns []string // d.path ILIKE pattern อย่างน้อยหนึ่งอัน (ใช้ OR)
}

var topicPathRules = []topicPathRule{
	{Keywords: []string{"vendor", "ap-vendor", "ผู้ขาย", "ร้านค้า"}, Patterns: []string{"%vendor%", "%ผู้ขาย%", "%ร้านค้า%"}},
	{Keywords: []string{"configuration", "company profile", "chart of account", "department", "currency", "payment type", "permission", "cf-", "ตั้งค่า", "ผู้ใช้", "user"}, Patterns: []string{"%configuration%", "%CF-%"}},
	{Keywords: []string{" ar ", "ar-", "ar invoice", "ar receipt", "ลูกค้า", "receipt", "contract", "folio", "ใบเสร็จ"}, Patterns: []string{"%AR-%", "%/ar/%"}},
	{Keywords: []string{" ap ", "ap-", "ap invoice", "ap payment", "เจ้าหนี้", "cheque", "wht", "หัก ณ ที่จ่าย", "input tax", "ภาษีซื้อ"}, Patterns: []string{"%AP-%", "%/ap/%"}},
	{Keywords: []string{"asset", "สินทรัพย์", "as-", "ทะเบียนสินทรัพย์", "asset register", "asset disposal"}, Patterns: []string{"%AS-%", "%asset%"}},
	{Keywords: []string{" gl ", "gl ", "general ledger", "journal voucher", "voucher", "บัญชีแยกประเภท", "ผังบัญชี", "allocation", "amortization", "budget", "recurring"}, Patterns: []string{"%gl%", "%c-%"}},
}

func buildPathFilterFromQuestion(question string) string {
	qLower := strings.ToLower(question)
	for _, rule := range topicPathRules {
		for _, kw := range rule.Keywords {
			if strings.Contains(qLower, strings.ToLower(kw)) || strings.Contains(question, kw) {
				parts := make([]string, len(rule.Patterns))
				for i, p := range rule.Patterns {
					parts[i] = "d.path ILIKE '" + strings.ReplaceAll(p, "'", "''") + "'"
				}
				return "WHERE (" + strings.Join(parts, " OR ") + ")"
			}
		}
	}
	return ""
}
