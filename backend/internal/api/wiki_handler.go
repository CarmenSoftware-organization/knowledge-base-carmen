package api

import (
	"errors"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/services"
)


type WikiHandler struct {
	wikiService *services.WikiService
	syncService *services.WikiSyncService
}

func NewWikiHandler() *WikiHandler {
	return &WikiHandler{
		wikiService: services.NewWikiService(),
		syncService: services.NewWikiSyncService(),
	}
}

// List returns all markdown entries. GET /api/wiki/list
func (h *WikiHandler) List(c *fiber.Ctx) error {
	entries, err := h.wikiService.ListMarkdown()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if entries == nil {
		entries = []services.WikiEntry{}
	}
	return c.JSON(fiber.Map{"items": entries})
}

// ListCategories returns top-level category slugs. GET /api/wiki/categories
func (h *WikiHandler) ListCategories(c *fiber.Ctx) error {
	items, err := h.wikiService.ListCategories()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if items == nil {
		items = []services.CategoryEntry{}
	}
	return c.JSON(fiber.Map{"items": items})
}

// GetCategory returns articles within a category. GET /api/wiki/category/:slug
func (h *WikiHandler) GetCategory(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slug is required"})
	}
	category, items, err := h.wikiService.ListByCategory(slug)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if items == nil {
		items = []services.CategoryItem{}
	}
	return c.JSON(fiber.Map{"category": category, "items": items})
}

// GetContent returns the rendered content of a markdown file. GET /api/wiki/content/*
func (h *WikiHandler) GetContent(c *fiber.Ctx) error {
	pathParam := c.Params("*")
	if pathParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "path is required"})
	}
	content, err := h.wikiService.GetContent(pathParam)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(content)
}

// Search performs a full-text search across wiki content. GET /api/wiki/search?q=...
func (h *WikiHandler) Search(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		return c.JSON(fiber.Map{"items": []interface{}{}})
	}
	results, err := h.wikiService.SearchInContent(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"items": results})
}

// Sync triggers a git pull to update local wiki content. POST /api/wiki/sync
func (h *WikiHandler) Sync(c *fiber.Ctx) error {
	if err := h.syncService.Sync(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true, "message": "synced"})
}
