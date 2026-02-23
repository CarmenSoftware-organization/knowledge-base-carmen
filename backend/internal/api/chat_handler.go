package api

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/services"
	"github.com/new-carmen/backend/internal/utils"
	"github.com/new-carmen/backend/pkg/ollama"
)

// ChatHandler handles RAG-based question answering using Ollama + pgvector.
type ChatHandler struct {
	llm      *ollama.Client
	embedLLM *ollama.Client
	router   *services.QuestionRouterService
	wiki     *services.WikiService
}

func NewChatHandler() *ChatHandler {
	return &ChatHandler{
		llm:      ollama.NewClient(),
		embedLLM: ollama.NewEmbedClient(),
		router:   services.NewQuestionRouterService(),
		wiki:     services.NewWikiService(),
	}
}

// RouteOnly tests question routing without hitting the vector DB or LLM. POST /api/chat/route-test
func (h *ChatHandler) RouteOnly(c *fiber.Ctx) error {
	var req models.ChatAskRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	q := strings.TrimSpace(req.Question)
	if q == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "question is required"})
	}
	res, err := h.router.RouteQuestion(q)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(res)
}

// Ask answers a question using routing → wiki content, falling back to vector DB. POST /api/chat/ask
func (h *ChatHandler) Ask(c *fiber.Ctx) error {
	var req models.ChatAskRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	q := strings.TrimSpace(req.Question)
	if q == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "question is required"})
	}

	emb, err := h.embedLLM.Embedding(q)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to create embedding: " + err.Error(), "answer": "", "sources": []models.ChatSource{},
		})
	}
	embStr := utils.Float32SliceToPgVector(emb)

	useRouter := config.AppConfig.OpenClaw.Enabled ||
		(config.AppConfig.Make.UseForQuestionRouter && config.AppConfig.Make.WebhookURL != "")

	if useRouter {
		if res, err := h.router.RouteQuestion(q); err == nil && len(res.Candidates) > 0 {
			// User already selected a preferred article — answer directly.
			if preferred := strings.TrimSpace(req.PreferredPath); preferred != "" {
				if content, err := h.wiki.GetContent(preferred); err == nil {
					return h.answerFromContent(c, q, []wikiResult{{content.Content, content.Path, content.Title}})
				}
			}

			// Multiple candidates — ask the user to disambiguate.
			if len(res.Candidates) > 1 {
				opts := make([]models.DisambiguationOption, 0, len(res.Candidates))
				for _, cnd := range res.Candidates {
					title := cnd.Path
					if content, err := h.wiki.GetContent(cnd.Path); err == nil && strings.TrimSpace(content.Title) != "" {
						title = content.Title
					}
					opts = append(opts, models.DisambiguationOption{Path: cnd.Path, Title: title, Reason: cnd.Reason, Score: cnd.Score})
				}
				return c.JSON(models.ChatAskResponse{Answer: "", Sources: []models.ChatSource{}, NeedDisambiguation: true, Options: opts})
			}

			// Single (or unambiguous) candidate — build context from top 3 articles.
			var results []wikiResult
			for i, cnd := range res.Candidates {
				if i >= 3 {
					break
				}
				if content, err := h.wiki.GetContent(cnd.Path); err == nil {
					results = append(results, wikiResult{content.Content, content.Path, content.Title})
				}
			}
			if len(results) > 0 {
				return h.answerFromContent(c, q, results)
			}
		}
	}

	// Fallback: vector DB search.
	pathFilter := buildPathFilterFromQuestion(q)
	if useRouter {
		if res, err := h.router.RouteQuestion(q); err == nil && len(res.Candidates) > 0 {
			var conds []string
			for _, cnd := range res.Candidates {
				if p := strings.TrimSpace(cnd.Path); p != "" {
					conds = append(conds, "d.path = '"+strings.ReplaceAll(p, "'", "''")+"'")
				}
			}
			if len(conds) > 0 {
				pathFilter = "WHERE (" + strings.Join(conds, " OR ") + ")"
			}
		}
	}

	type chunkRow struct{ Path, Title, Content string }
	var rows []chunkRow
	query := `
SELECT d.path, d.title, dc.content
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
` + pathFilter + `
ORDER BY dc.embedding <-> ?::vector
LIMIT 10
`
	if err := database.DB.Raw(query, embStr).Scan(&rows).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to query vector index: " + err.Error(), "answer": "", "sources": []models.ChatSource{},
		})
	}

	const maxContextChars = 8000
	var ctx strings.Builder
	var sources []models.ChatSource
	for i, row := range rows {
		if ctx.Len() >= maxContextChars {
			break
		}
		content := row.Content
		if len(content) > 2000 {
			content = content[:2000]
		}
		ctx.WriteString("\n--- Context " + strconv.Itoa(i+1) + " ---\n" + content + "\n")
		title := strings.TrimSpace(row.Title)
		if title == "" {
			title = row.Path
		}
		sources = append(sources, models.ChatSource{ArticleID: row.Path, Title: title})
	}

	answer, err := h.llm.GenerateAnswer(ctx.String(), q)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to generate answer: " + err.Error(), "answer": "", "sources": sources,
		})
	}
	return c.JSON(models.ChatAskResponse{Answer: answer, Sources: sources})
}

// wikiResult is a local DTO for passing wiki content into the answer builder.
type wikiResult struct{ Content, Path, Title string }

func (h *ChatHandler) answerFromContent(c *fiber.Ctx, q string, results []wikiResult) error {
	var ctx strings.Builder
	var sources []models.ChatSource
	for i, r := range results {
		ctx.WriteString("\n--- Wiki " + strconv.Itoa(i+1) + " (" + r.Title + ") ---\n" + r.Content + "\n")
		sources = append(sources, models.ChatSource{ArticleID: r.Path, Title: r.Title})
	}
	answer, err := h.llm.GenerateAnswer(ctx.String(), q)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to generate answer: " + err.Error(), "answer": "", "sources": sources,
		})
	}
	return c.JSON(models.ChatAskResponse{Answer: answer, Sources: sources})
}

// ─── Topic-based path filtering ───────────────────────────────────────────────

type topicPathRule struct {
	Keywords []string
	Patterns []string
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
