package api

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/services"
)

type CategoriesHandler struct {
	catService *services.CategoryService
}

func NewCategoriesHandler() *CategoriesHandler {
	return &CategoriesHandler{catService: services.NewCategoryService()}
}

// List GET /api/categories
func (h *CategoriesHandler) List(c *fiber.Ctx) error {
	cats, err := h.catService.ListCategories()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"categories": cats})
}

// GetByID GET /api/categories/:categoryId
func (h *CategoriesHandler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("categoryId"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid category ID"})
	}
	cat, err := h.catService.GetCategoryByID(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Category not found"})
	}
	return c.JSON(cat)
}

// ListArticles GET /api/categories/:categoryId/articles?sort=latest|popular|az&limit=10&offset=0
func (h *CategoriesHandler) ListArticles(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("categoryId"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid category ID"})
	}
	sort := c.Query("sort", "latest")
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	if limit > 50 {
		limit = 50
	}
	docs, total, err := h.catService.ListArticlesByCategory(id, sort, limit, offset)
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
			"id":         strconv.FormatUint(d.ID, 10),
			"title":     d.Title,
			"path":      "/articles/" + strconv.FormatUint(d.ID, 10),
			"category":  catName,
			"updatedAt": d.UpdatedAt.Format("2006-01-02"),
		})
	}
	return c.JSON(fiber.Map{"articles": items, "total": total})
}
