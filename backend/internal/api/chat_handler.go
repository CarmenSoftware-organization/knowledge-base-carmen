// ใช้ดึง context จาก Chroma + ส่งให้ Ollama ตอบ → ใช้ทำ chatbot
package api

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/pkg/chromadb"
	"github.com/new-carmen/backend/pkg/ollama"
)

type ChatHandler struct {
	chroma *chromadb.Client
	llm    *ollama.Client
}

func NewChatHandler() *ChatHandler {
	return &ChatHandler{
		chroma: chromadb.NewClient(),
		llm:    ollama.NewClient(),
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

	// 1) ดึง context จาก Chroma
	queryResp, err := h.chroma.Query(q, 5)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "failed to query ChromaDB: " + err.Error(),
			"answer":  "",
			"sources": []models.ChatSource{},
		})
	}

	// 2) รวม context เป็นข้อความยาวให้ LLM ใช้ตอบ
	var contextBuilder strings.Builder
	sources := make([]models.ChatSource, 0)
	if len(queryResp.Documents) > 0 {
		docs := queryResp.Documents[0]
		ids := []string{}
		if len(queryResp.IDs) > 0 {
			ids = queryResp.IDs[0]
		}

		for i, doc := range docs {
			contextBuilder.WriteString("\n--- Context ")
			contextBuilder.WriteString(strconv.Itoa(i + 1))
			contextBuilder.WriteString(" ---\n")
			contextBuilder.WriteString(doc)
			contextBuilder.WriteString("\n")

			lines := strings.Split(doc, "\n")
			title := strings.TrimSpace(lines[0])
			articleID := ""
			if i < len(ids) {
				articleID = ids[i]
			}
			if title != "" {
				sources = append(sources, models.ChatSource{
					ArticleID: articleID,
					Title:     title,
				})
			}
		}
	}
	context := contextBuilder.String()

	// 3) ให้ Ollama สร้างคำตอบจาก context + question
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
