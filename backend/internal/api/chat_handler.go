
package api

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/proxy"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/middleware"
	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/services"
	"github.com/new-carmen/backend/internal/utils"
	"github.com/new-carmen/backend/pkg/ollama"
)

type ChatHandler struct {
	llm            *ollama.Client
	embedLLM       *ollama.Client
	router         *services.QuestionRouterService
	wiki           *services.WikiService
	logService     *services.ActivityLogService
	historyService *services.ChatHistoryService
}

func NewChatHandler() *ChatHandler {
	return &ChatHandler{
		llm:            ollama.NewClient(),
		embedLLM:       ollama.NewEmbedClient(),
		router:         services.NewQuestionRouterService(),
		wiki:           services.NewWikiService(),
		logService:     services.NewActivityLogService(),
		historyService: services.NewChatHistoryService(),
	}
}

// RecordHistory accepts Q&A from Python chatbot and saves to chat_history (with embedding).
// Called by carmen-chatbot after stream completes. POST /api/chat/record-history
func (h *ChatHandler) RecordHistory(c *fiber.Ctx) error {
	var req models.RecordHistoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	bu := strings.TrimSpace(req.BU)
	q := strings.TrimSpace(req.Question)
	a := strings.TrimSpace(req.Answer)
	if bu == "" || q == "" || a == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bu, question, answer required"})
	}

	if !config.AppConfig.Chat.HistoryEnabled {
		return c.JSON(fiber.Map{"ok": true, "skipped": "history disabled"})
	}

	buID, err := h.historyService.GetBUIDFromSlug(bu)
	if err != nil || buID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid bu: " + bu})
	}

	emb, err := h.embedLLM.Embedding(q)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "embedding failed: " + err.Error()})
	}

	userID := req.UserID
	if userID == "" {
		userID = "anonymous"
	}

	sources := req.Sources
	if sources == nil {
		sources = []models.ChatSource{}
	}

	if err := h.historyService.Save(buID, userID, q, a, sources, emb); err != nil {
		log.Printf("[chat] record-history save failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true})
}

// ListHistory returns chat history for verification. GET /api/chat/history/list?bu=carmen&limit=10&offset=0
func (h *ChatHandler) ListHistory(c *fiber.Ctx) error {
	bu := middleware.GetBU(c)
	buID, err := h.historyService.GetBUIDFromSlug(bu)
	if err != nil || buID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid bu"})
	}
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	if limit > 100 {
		limit = 100
	}
	entries, total, err := h.historyService.List(buID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"items":  entries,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// RouteOnly ใช้เทส OpenClaw question routing โดยไม่ยิง vector DB / LLM
// POST /api/chat/route-test { "question": "..." }
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
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(res)
}

// Proxy ส่งต่อ request ไปยัง Python Chatbot
func (h *ChatHandler) Proxy(c *fiber.Ctx) error {
	chatbotURL := config.AppConfig.Server.ChatbotURL

	target := chatbotURL + c.OriginalURL()

	if err := proxy.Do(c, target); err != nil {
		return err
	}

	// ตั้งค่า CORS headers หลัง proxy เพื่อไม่ให้ถูกเขียนทับ
	origin := c.Get("Origin")
	if origin != "" {
		c.Set("Access-Control-Allow-Origin", origin)
		c.Set("Access-Control-Allow-Credentials", "true")
	}

	return nil
}

// Image serves wiki assets from local repo first; falls back to Python chatbot proxy.
// GET /images/*?bu=...
func (h *ChatHandler) Image(c *fiber.Ctx) error {
	bu := strings.TrimSpace(c.Query("bu"))
	if bu == "" {
		bu = "carmen"
	}

	relPath := c.Params("*")
	if relPath == "" {
		return c.SendStatus(fiber.StatusNotFound)
	}

	// 1) Try serving from local wiki assets (same storage as /wiki-assets/*)
	fullPath := h.wiki.GetLocalAssetPath(bu, relPath)
	if st, err := os.Stat(fullPath); err == nil && !st.IsDir() {
		return c.SendFile(fullPath)
	}

	// 2) Fallback: proxy to Python chatbot (backwards compatible)
	return h.Proxy(c)
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

	// 1) สร้าง embedding ของคำถาม (ใช้ซ้ำได้ ทั้งกรณี DB และ fallback)
	emb, err := h.embedLLM.Embedding(q)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "failed to create embedding: " + err.Error(),
			"answer":  "",
			"sources": []models.ChatSource{},
		})
	}
	emb = utils.TruncateEmbedding(emb) // DB uses VECTOR(1536); qwen3-embedding returns 4096
	embStr := utils.Float32SliceToPgVector(emb)
	bu := middleware.GetBU(c)
	chatCfg := config.AppConfig.Chat

	// 1.5) ถ้าเปิด chat history — ค้นหาประวัติก่อน
	if chatCfg.HistoryEnabled {
		if buID, err := h.historyService.GetBUIDFromSlug(bu); err == nil && buID > 0 {
			if cached, ok := h.historyService.FindSimilar(buID, emb, chatCfg.HistorySimilarityThreshold); ok {
				userID := c.Get("X-User-ID", "anonymous")
				h.logService.Log(bu, userID, "ถาม Chat AI (จาก cache)", "wiki", map[string]interface{}{
					"status": "cached",
					"sources": len(cached.Sources),
				}, c.Get("User-Agent"))
				return c.JSON(models.ChatAskResponse{
					Answer:  cached.Answer,
					Sources: cached.Sources,
				})
			}
		}
	}

	// 2.a กรณีมี OpenClaw หรือ Make (แยกประเภทคำถาม) ให้ลองใช้ routing + wiki โดยตรงก่อน (ไม่พึ่ง DB)
	useRouter := config.AppConfig.OpenClaw.Enabled || (config.AppConfig.Make.UseForQuestionRouter && config.AppConfig.Make.WebhookURL != "")
	if useRouter {
		if res, err := h.router.RouteQuestion(q); err == nil && len(res.Candidates) > 0 {
			// ถ้าผู้ใช้เลือก path มาแล้ว (preferredPath) ให้ใช้ path นั้นตรง ๆ เลย
			if strings.TrimSpace(req.PreferredPath) != "" {
				selectedPath := strings.TrimSpace(req.PreferredPath)
				content, err := h.wiki.GetContent(bu, selectedPath)
				if err != nil {
					// ถ้า path นี้อ่านไม่ได้ ให้ fallback ใช้ routingResult ปกติด้านล่าง
				} else {
					ctxText := content.Content
					sources := []models.ChatSource{{
						ArticleID: content.Path,
						Title:     content.Title,
					}}
					answer, err := h.llm.GenerateAnswer(ctxText, q)
					if err != nil {
						return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
							"error":   "failed to generate answer: " + err.Error(),
							"answer":  "",
							"sources": sources,
						})
					}
					if chatCfg.HistoryEnabled {
						if buID, err := h.historyService.GetBUIDFromSlug(bu); err == nil && buID > 0 {
							if err := h.historyService.Save(buID, c.Get("X-User-ID", "anonymous"), q, answer, sources, emb); err != nil {
								log.Printf("[chat] save history failed: %v", err)
							}
						}
					}
					return c.JSON(models.ChatAskResponse{
						Answer:  answer,
						Sources: sources,
					})
				}
			}

			// ถ้ายังไม่ได้เลือก และมี candidate หลายตัว ให้ถามย้ำก่อนเสมอ
			if len(res.Candidates) > 1 {
				opts := make([]models.DisambiguationOption, 0, len(res.Candidates))
				for _, cnd := range res.Candidates {
					title := cnd.Path
					if content, err := h.wiki.GetContent(bu, cnd.Path); err == nil && strings.TrimSpace(content.Title) != "" {
						title = content.Title
					}
					opts = append(opts, models.DisambiguationOption{
						Path:   cnd.Path,
						Title:  title,
						Reason: cnd.Reason,
						Score:  cnd.Score,
					})
				}
				return c.JSON(models.ChatAskResponse{
					Answer:             "",
					Sources:            []models.ChatSource{},
					NeedDisambiguation: true,
					Options:            opts,
				})
			}

			// กรณีไม่กำกวม (หรือเหลือ candidate เดียว) ให้ใช้ top 1–3 path ไปอ่าน wiki แล้วตอบเลย
			var contextBuilder strings.Builder
			sources := make([]models.ChatSource, 0, len(res.Candidates))

			for i, cnd := range res.Candidates {
				if i >= 3 {
					break
				}
				content, err := h.wiki.GetContent(bu, cnd.Path)
				if err != nil {
					continue
				}
				contextBuilder.WriteString("\n--- Wiki ")
				contextBuilder.WriteString(strconv.Itoa(i + 1))
				contextBuilder.WriteString(" (")
				contextBuilder.WriteString(content.Title)
				contextBuilder.WriteString(") ---\n")
				contextBuilder.WriteString(content.Content)
				contextBuilder.WriteString("\n")

				sources = append(sources, models.ChatSource{
					ArticleID: content.Path,
					Title:     content.Title,
				})
			}

			ctxText := strings.TrimSpace(contextBuilder.String())
			if ctxText != "" {
				answer, err := h.llm.GenerateAnswer(ctxText, q)
				if err != nil {
					return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
						"error":   "failed to generate answer: " + err.Error(),
						"answer":  "",
						"sources": sources,
					})
				}
				if chatCfg.HistoryEnabled {
					if buID, err := h.historyService.GetBUIDFromSlug(bu); err == nil && buID > 0 {
						if err := h.historyService.Save(buID, c.Get("X-User-ID", "anonymous"), q, answer, sources, emb); err != nil {
							log.Printf("[chat] save history failed: %v", err)
						}
					}
				}
				return c.JSON(models.ChatAskResponse{
					Answer:  answer,
					Sources: sources,
				})
			}
		}
	}

	// 2.b ถ้า OpenClaw ใช้ไม่ได้ ให้ใช้เส้นทางเดิมผ่าน vector DB
	type chunkRow struct {
		Path    string
		Title   string
		Content string
	}
	pathWhere, pathArgs := buildPathFilterFromQuestion(q)

	// ถ้าเปิดใช้ routing (OpenClaw หรือ Make) ให้ลอง route question → ได้ path ที่โฟกัสมากขึ้น
	if useRouter {
		if res, err := h.router.RouteQuestion(q); err == nil && len(res.Candidates) > 0 {
			var paths []string
			for _, cnd := range res.Candidates {
				p := strings.TrimSpace(cnd.Path)
				if p != "" {
					paths = append(paths, p)
				}
			}
			if len(paths) > 0 {
				placeholders := make([]string, len(paths))
				for i := range paths {
					placeholders[i] = "d.path = ?"
				}
				pathWhere = "WHERE (" + strings.Join(placeholders, " OR ") + ")"
				pathArgs = make([]interface{}, len(paths))
				for i, p := range paths {
					pathArgs[i] = p
				}
			}
		}
	}

	// 3) ดึง context จาก Postgres/pgvector (parameterized เพื่อป้องกัน SQL injection)
	query := fmt.Sprintf(`
SELECT d.path, d.title, dc.content
FROM %s.document_chunks dc
JOIN %s.documents d ON dc.document_id = d.id
`, bu, bu) + pathWhere + `
ORDER BY dc.embedding <-> ?::vector
LIMIT ?
`
	args := make([]interface{}, 0, len(pathArgs)+2)
	args = append(args, pathArgs...)
	args = append(args, embStr, chatCfg.ContextLimit)

	var rows []chunkRow
	if err := database.DB.Raw(query, args...).Scan(&rows).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "failed to query vector index: " + err.Error(),
			"answer":  "",
			"sources": []models.ChatSource{},
		})
	}

	// 3) รวม context เป็นข้อความยาวให้ LLM ใช้ตอบ
	var contextBuilder strings.Builder
	sources := make([]models.ChatSource, 0)
	maxContextChars := chatCfg.MaxContextChars
	maxChunkContent := chatCfg.MaxChunkContent
	for i, row := range rows {
		// ตัดเนื้อหาให้สั้นลงต่อชิ้น
		content := row.Content
		if len(content) > maxChunkContent {
			content = content[:maxChunkContent]
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

	// Log chat interaction
	userID := c.Get("X-User-ID", "anonymous")
	h.logService.Log(bu, userID, "ถาม Chat AI", "wiki", map[string]interface{}{
		"status":  "POST",
		"sources": len(sources),
	}, c.Get("User-Agent"))

	// บันทึกลง chat history
	if chatCfg.HistoryEnabled {
		if buID, err := h.historyService.GetBUIDFromSlug(bu); err == nil && buID > 0 {
			if err := h.historyService.Save(buID, userID, q, answer, sources, emb); err != nil {
				log.Printf("[chat] save history failed: %v", err)
			}
		}
	}

	return c.JSON(models.ChatAskResponse{
		Answer:  answer,
		Sources: sources,
	})
}


type topicPathRule struct {
	Keywords []string 
	Patterns []string 
}

var topicPathRules = []topicPathRule{
	{Keywords: []string{"vendor", "ap-vendor", "ผู้ขาย", "ร้านค้า"}, Patterns: []string{"%vendor%", "%ผู้ขาย%", "%ร้านค้า%"}},
	{Keywords: []string{"configuration", "company profile", "chart of account", "department", "currency", "payment type", "permission", "cf-", "ตั้งค่า", "ผู้ใช้", "user"}, Patterns: []string{"%configuration%", "%CF-%"}},
	{Keywords: []string{" ar ", "ar-", "ar invoice", "ar receipt", "ลูกค้า", "receipt", "contract", "folio", "ใบเสร็จ", "ลูกหนี้"}, Patterns: []string{"%AR-%", "%/ar/%"}},
	{Keywords: []string{" ap ", "ap-", "ap invoice", "ap payment", "เจ้าหนี้", "cheque", "wht", "หัก ณ ที่จ่าย", "input tax", "ภาษีซื้อ"}, Patterns: []string{"%AP-%", "%/ap/%"}},
	{Keywords: []string{"asset", "สินทรัพย์", "as-", "ทะเบียนสินทรัพย์", "asset register", "asset disposal"}, Patterns: []string{"%AS-%", "%asset%"}},
	{Keywords: []string{" gl ", "gl ", "general ledger", "journal voucher", "voucher", "บัญชีแยกประเภท", "ผังบัญชี", "allocation", "amortization", "budget", "recurring"}, Patterns: []string{"%gl%", "%c-%"}},
	{Keywords: []string{"dashboard", "สถิติ", "revenue", "occupancy", "adr", "revpar", "trevpar", "p&l", "กำไรขาดทุน"}, Patterns: []string{"%dashboard%"}},
	{Keywords: []string{"workbook", "excel", "security", "formula", "function"}, Patterns: []string{"%workbook%", "%WB-%", "%excel%"}},
	{Keywords: []string{"comment", "activity log", "document management", "ไฟล์แนบ", "รูปภาพแนบ", "ประวัติเอกสาร", "คอมเมนต์", "ความคิดเห็น"}, Patterns: []string{"%comment%", "%CM-%"}},
}

// buildPathFilterFromQuestion returns (whereClause, args) for parameterized query.
func buildPathFilterFromQuestion(question string) (string, []interface{}) {
	qLower := strings.ToLower(question)
	for _, rule := range topicPathRules {
		for _, kw := range rule.Keywords {
			if strings.Contains(qLower, strings.ToLower(kw)) || strings.Contains(question, kw) {
				placeholders := make([]string, len(rule.Patterns))
				for i := range rule.Patterns {
					placeholders[i] = "d.path ILIKE ?"
				}
				args := make([]interface{}, len(rule.Patterns))
				for i, p := range rule.Patterns {
					args[i] = p
				}
				return "WHERE (" + strings.Join(placeholders, " OR ") + ")", args
			}
		}
	}
	return "", nil
}
