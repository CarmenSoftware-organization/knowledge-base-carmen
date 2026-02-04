package api

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	domain "github.com/new-carmen/backend/internal/domain"
	"github.com/new-carmen/backend/internal/services"
)

type ArticlesPublicHandler struct {
	articleService *services.PublicArticleService
}

func NewArticlesPublicHandler() *ArticlesPublicHandler {
	return &ArticlesPublicHandler{articleService: services.NewPublicArticleService()}
}

// GetArticle GET /api/articles/:articleId
func (h *ArticlesPublicHandler) GetArticle(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("articleId"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid article ID"})
	}
	article, err := h.articleService.GetArticleByID(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Article not found"})
	}
	return c.JSON(article)
}

// GetTOC GET /api/articles/:articleId/toc
func (h *ArticlesPublicHandler) GetTOC(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("articleId"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid article ID"})
	}
	items, err := h.articleService.GetTOC(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Article not found"})
	}
	return c.JSON(fiber.Map{"items": items})
}

// GetRelated GET /api/articles/:articleId/related
func (h *ArticlesPublicHandler) GetRelated(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("articleId"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid article ID"})
	}
	limit, _ := strconv.Atoi(c.Query("limit", "5"))
	articles, err := h.articleService.GetRelated(id, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(domain.RelatedArticlesResponse{Articles: articles})
}

// PostFeedback POST /api/articles/:articleId/feedback
func (h *ArticlesPublicHandler) PostFeedback(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("articleId"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid article ID"})
	}
	var req domain.ArticleFeedbackRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if err := h.articleService.SubmitFeedback(id, req.Helpful); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Article not found"})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"ok": true})
}

// ListPopular GET /api/articles/popular
func (h *ArticlesPublicHandler) ListPopular(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	docs, total, err := h.articleService.ListPopular(limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	items := make([]fiber.Map, 0, len(docs))
	for _, d := range docs {
		catName := ""
		if d.Category != nil {
			catName = d.Category.Name
		}
		items = append(items, fiber.Map{
			"id":       strconv.FormatUint(d.ID, 10),
			"title":   d.Title,
			"path":    "/articles/" + strconv.FormatUint(d.ID, 10),
			"category": catName,
			"updatedAt": d.UpdatedAt.Format("2006-01-02"),
		})
	}
	return c.JSON(fiber.Map{"articles": items, "total": total})
}

// ListRecommended GET /api/articles/recommended
func (h *ArticlesPublicHandler) ListRecommended(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	docs, total, err := h.articleService.ListRecommended(limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	items := make([]fiber.Map, 0, len(docs))
	for _, d := range docs {
		catName := ""
		if d.Category != nil {
			catName = d.Category.Name
		}
		items = append(items, fiber.Map{
			"id":       strconv.FormatUint(d.ID, 10),
			"title":   d.Title,
			"path":    "/articles/" + strconv.FormatUint(d.ID, 10),
			"category": catName,
			"updatedAt": d.UpdatedAt.Format("2006-01-02"),
		})
	}
	return c.JSON(fiber.Map{"articles": items, "total": total})
}
