package api

import (
	"fmt"
	"log"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/middleware"
	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/services"
	"github.com/new-carmen/backend/internal/utils"
)

func (h *ChatHandler) askFlow(c *fiber.Ctx) (models.ChatAskResponse, int, error) {
	req, err := parseAskRequest(c)
	if err != nil {
		return models.ChatAskResponse{}, fiber.StatusBadRequest, err
	}

	question := strings.TrimSpace(req.Question)
	bu := middleware.GetBU(c)
	chatCfg := config.AppConfig.Chat
	rawUserID := c.Get("X-User-ID", "anonymous")
	userID := services.HashUserID(rawUserID, config.AppConfig.Server.PrivacySecret)

	// Daily budget gate — same cap the streaming path enforces, so /ask can't be
	// used to bypass DAILY_REQUEST_LIMIT.
	if !h.budget.CheckAndIncrement(chatCfg.DailyRequestLimit) {
		return models.ChatAskResponse{
			Answer:  "_(ขออภัยครับ ระบบมีการใช้งานเกินกำหนดสำหรับวันนี้ กรุณาลองใหม่พรุ่งนี้)_",
			Sources: []models.ChatSource{},
		}, fiber.StatusOK, nil
	}

	emb, _, err := h.createEmbedding(question)
	if err != nil {
		return models.ChatAskResponse{}, fiber.StatusInternalServerError, fmt.Errorf("failed to create embedding")
	}

	if cached, ok := h.tryCachedAnswer(bu, emb, chatCfg.HistorySimilarityThreshold, userID, c.Get("User-Agent"), chatCfg.HistoryEnabled); ok {
		return cached, fiber.StatusOK, nil
	}

	useRouter := isRouterEnabled()
	if useRouter {
		if routeResp, handled, routeErr := h.tryRouterAnswer(req, bu, question, rawUserID, emb, chatCfg.HistoryEnabled); handled {
			if routeErr != nil {
				return models.ChatAskResponse{}, fiber.StatusInternalServerError, routeErr
			}
			return routeResp, fiber.StatusOK, nil
		}
	}

	chunks, err := h.retrieval.Retrieve(bu, question, emb)
	if err != nil {
		return models.ChatAskResponse{}, fiber.StatusInternalServerError, fmt.Errorf("retrieval failed: %w", err)
	}

	context, sources := buildContextFromChunks(chunks, chatCfg.MaxContextChars, chatCfg.MaxChunkContent)
	answer, err := h.llm.GenerateAnswer(context, question)
	if err != nil {
		return models.ChatAskResponse{}, fiber.StatusInternalServerError, fmt.Errorf("failed to generate answer")
	}

	h.logService.Log(bu, userID, "ถาม Chat AI", "wiki", map[string]any{
		"status":  "POST",
		"sources": len(sources),
	}, c.Get("User-Agent"))
	h.saveHistoryIfEnabled(chatCfg.HistoryEnabled, bu, rawUserID, question, answer, sources, emb)

	return models.ChatAskResponse{
		Answer:  answer,
		Sources: sources,
	}, fiber.StatusOK, nil
}

func parseAskRequest(c *fiber.Ctx) (models.ChatAskRequest, error) {
	var req models.ChatAskRequest
	if err := c.BodyParser(&req); err != nil {
		return models.ChatAskRequest{}, fmt.Errorf("invalid request body")
	}
	if strings.TrimSpace(req.Question) == "" {
		return models.ChatAskRequest{}, fmt.Errorf("question is required")
	}
	return req, nil
}

func (h *ChatHandler) createEmbedding(question string) ([]float32, string, error) {
	emb, err := h.embedLLM.Embedding(question)
	if err != nil {
		return nil, "", err
	}
	emb = utils.TruncateEmbedding(emb)
	return emb, utils.Float32SliceToPgVector(emb), nil
}

func (h *ChatHandler) tryCachedAnswer(bu string, emb []float32, threshold float64, userID, userAgent string, enabled bool) (models.ChatAskResponse, bool) {
	if !enabled {
		return models.ChatAskResponse{}, false
	}
	buID, err := h.historyService.GetBUIDFromSlug(bu)
	if err != nil || buID == 0 {
		return models.ChatAskResponse{}, false
	}
	cached, ok := h.historyService.FindSimilar(buID, emb, threshold)
	if !ok {
		return models.ChatAskResponse{}, false
	}
	h.logService.Log(bu, userID, "ถาม Chat AI (จาก cache)", "wiki", map[string]any{
		"status":  "cached",
		"sources": len(cached.Sources),
	}, userAgent)
	return models.ChatAskResponse{
		Answer:  cached.Answer,
		Sources: cached.Sources,
	}, true
}

func isRouterEnabled() bool {
	return false
}

func (h *ChatHandler) tryRouterAnswer(req models.ChatAskRequest, bu, question, userID string, emb []float32, historyEnabled bool) (models.ChatAskResponse, bool, error) {
	res, err := h.router.RouteQuestion(question)
	if err != nil || len(res.Candidates) == 0 {
		return models.ChatAskResponse{}, false, nil
	}

	if strings.TrimSpace(req.PreferredPath) != "" {
		selectedPath := strings.TrimSpace(req.PreferredPath)
		content, readErr := h.wiki.GetContent(bu, selectedPath)
		if readErr == nil {
			sources := []models.ChatSource{{ArticleID: content.Path, Title: content.Title}}
			answer, genErr := h.llm.GenerateAnswer(content.Content, question)
			if genErr != nil {
				return models.ChatAskResponse{}, true, fmt.Errorf("failed to generate answer")
			}
			h.saveHistoryIfEnabled(historyEnabled, bu, userID, question, answer, sources, emb)
			return models.ChatAskResponse{Answer: answer, Sources: sources}, true, nil
		}
	}

	if len(res.Candidates) > 1 {
		options := make([]models.DisambiguationOption, 0, len(res.Candidates))
		for _, cnd := range res.Candidates {
			title := cnd.Path
			if content, readErr := h.wiki.GetContent(bu, cnd.Path); readErr == nil && strings.TrimSpace(content.Title) != "" {
				title = content.Title
			}
			options = append(options, models.DisambiguationOption{
				Path:   cnd.Path,
				Title:  title,
				Reason: cnd.Reason,
				Score:  cnd.Score,
			})
		}
		return models.ChatAskResponse{
			NeedDisambiguation: true,
			Options:            options,
			Sources:            []models.ChatSource{},
		}, true, nil
	}

	context, sources := h.buildRoutedContext(bu, res.Candidates, 3)
	if context == "" {
		return models.ChatAskResponse{}, false, nil
	}

	answer, genErr := h.llm.GenerateAnswer(context, question)
	if genErr != nil {
		return models.ChatAskResponse{}, true, fmt.Errorf("failed to generate answer")
	}
	h.saveHistoryIfEnabled(historyEnabled, bu, userID, question, answer, sources, emb)
	return models.ChatAskResponse{Answer: answer, Sources: sources}, true, nil
}

func (h *ChatHandler) buildRoutedContext(bu string, candidates []models.RouteCandidate, limit int) (string, []models.ChatSource) {
	var b strings.Builder
	sources := make([]models.ChatSource, 0, limit)
	for i, cnd := range candidates {
		if i >= limit {
			break
		}
		content, err := h.wiki.GetContent(bu, cnd.Path)
		if err != nil {
			continue
		}
		b.WriteString("\n--- Wiki ")
		b.WriteString(strconv.Itoa(i + 1))
		b.WriteString(" (")
		b.WriteString(content.Title)
		b.WriteString(") ---\n")
		b.WriteString(content.Content)
		b.WriteString("\n")
		sources = append(sources, models.ChatSource{
			ArticleID: content.Path,
			Title:     content.Title,
		})
	}
	return strings.TrimSpace(b.String()), sources
}

func buildContextFromChunks(chunks []services.RetrievedChunk, maxContextChars, maxChunkContent int) (string, []models.ChatSource) {
	var b strings.Builder
	sources := make([]models.ChatSource, 0, len(chunks))
	for i, ch := range chunks {
		if b.Len() >= maxContextChars {
			break
		}
		content := ch.Content
		// Rune-safe truncation: a byte slice can split a multibyte UTF-8 rune
		// (Thai is 3 bytes/rune), so truncate by rune count instead.
		if r := []rune(content); len(r) > maxChunkContent {
			content = string(r[:maxChunkContent])
		}
		// Don't overshoot the context budget by a whole chunk: stop before writing
		// a chunk that would exceed maxContextChars (unless it's the first one).
		if b.Len() > 0 && b.Len()+len(content) > maxContextChars {
			break
		}
		b.WriteString("\n--- Context ")
		b.WriteString(strconv.Itoa(i + 1))
		b.WriteString(" ---\n")
		b.WriteString(content)
		b.WriteString("\n")

		title := strings.TrimSpace(ch.Title)
		if title == "" {
			title = ch.Path
		}
		sources = append(sources, models.ChatSource{ArticleID: ch.Path, Title: title})
	}
	return b.String(), sources
}

func (h *ChatHandler) saveHistoryIfEnabled(enabled bool, bu, userID, question, answer string, sources []models.ChatSource, emb []float32) {
	if !enabled {
		return
	}
	buID, err := h.historyService.GetBUIDFromSlug(bu)
	if err != nil || buID == 0 {
		return
	}
	if err := h.historyService.Save(buID, userID, question, answer, sources, emb); err != nil {
		log.Printf("[chat] save history failed: %v", err)
	}
}
