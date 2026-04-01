package api

import (
	"context"
	"errors"
	"log"
	"net/url"
	"os"
	"sync"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/middleware"
	"github.com/new-carmen/backend/internal/services"
)

var (
	translationSvc   *services.TranslationService
	translationCache *services.WikiTranslationCache
	translationOnce  sync.Once
)

func initTranslation() {
	translationOnce.Do(func() {
		translationSvc = services.NewTranslationService()
		translationCache = services.NewWikiTranslationCache()
	})
}

type WikiHandler struct {
	wikiService *services.WikiService
	syncService *services.WikiSyncService
	logService  *services.ActivityLogService
}

func NewWikiHandler() *WikiHandler {
	return &WikiHandler{
		wikiService: services.NewWikiService(),
		syncService: services.NewWikiSyncService(),
		logService:  services.NewActivityLogService(),
	}
}

// GetWikiService returns the WikiService instance
func (h *WikiHandler) GetWikiService() *services.WikiService {
	return h.wikiService
}

// List returns all markdown entries. GET /api/wiki/list
func (h *WikiHandler) List(c *fiber.Ctx) error {
	bu := middleware.GetBU(c)
	entries, err := h.wikiService.ListMarkdown(bu)
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
	bu := middleware.GetBU(c)
	items, err := h.wikiService.ListCategories(bu)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if items == nil {
		items = []services.CategoryEntry{}
	}
	return c.JSON(fiber.Map{"items": items})
}

// Sidebar returns the full sidebar tree (all categories + articles) in one call. GET /api/wiki/sidebar
func (h *WikiHandler) Sidebar(c *fiber.Ctx) error {
	bu := middleware.GetBU(c)
	categories, err := h.wikiService.ListSidebarTree(bu)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if categories == nil {
		categories = []services.SidebarCategory{}
	}
	return c.JSON(fiber.Map{"categories": categories})
}

// GetCategory returns articles within a category. GET /api/wiki/category/:slug
func (h *WikiHandler) GetCategory(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slug is required"})
	}
	bu := middleware.GetBU(c)
	category, items, err := h.wikiService.ListByCategory(bu, slug)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if items == nil {
		items = []services.CategoryItem{}
	}
	return c.JSON(fiber.Map{"category": category, "items": items})
}

// GetContent returns the rendered content of a markdown file. GET /api/wiki/content/*
// Query param: locale (e.g. "th", "en") — when not "th", translates content via Google Translate (if enabled).
func (h *WikiHandler) GetContent(c *fiber.Ctx) error {
	pathParam := c.Params("*")
	if pathParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "path is required"})
	}
	// Browsers send UTF-8 path segments percent-encoded; match on-disk filenames (e.g. Thai names).
	if dec, err := url.PathUnescape(pathParam); err == nil {
		pathParam = dec
	}
	bu := middleware.GetBU(c)
	locale := services.NormalizeLocale(c.Query("locale"))

	content, err := h.wikiService.GetContent(bu, pathParam)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Translate if locale is not Thai (source) and translation is enabled
	sourceLang := "th"
	initTranslation()
	shouldTranslate := locale != "" && locale != sourceLang
	enabled := translationSvc.IsEnabled()
	if shouldTranslate && !enabled {
		log.Printf("[wiki] translation skipped: locale=%q but translation disabled or GOOGLE_TRANSLATE_API_KEY not set", locale)
	}
	if shouldTranslate && enabled {
		ctx := context.Background()
		translated, err := translationCache.GetOrTranslate(ctx, bu, pathParam, locale, sourceLang, content, translationSvc)
		if err != nil {
			log.Printf("[wiki] translation failed for %s: %v", pathParam, err)
		} else {
			content = translated
		}
	}

	// Log view
	userID := c.Get("X-User-ID", "anonymous")
	h.logService.Log(bu, userID, "เปิดอ่านบทความ", "wiki", map[string]interface{}{"status": "GET", "path": pathParam, "title": content.Title}, c.Get("User-Agent"))

	return c.JSON(content)
}

// Search performs hybrid search: semantic (pgvector) + keyword (NLP-expanded).
// Falls back to keyword-only when Ollama/embedding fails (timeout, unreachable).
// GET /api/wiki/search?q=...
func (h *WikiHandler) Search(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		return c.JSON(fiber.Map{"items": []interface{}{}})
	}
	bu := middleware.GetBU(c)

	// 1. Semantic search (pgvector) — อาจล้มเหลวถ้า Ollama ช้า/timeout
	semanticResults, err := h.wikiService.SearchInContent(bu, query)
	if err != nil {
		// Fallback: ใช้ keyword (NLP) แทน — ไม่ต้องเรียก Ollama
		keywordResults, kwErr := h.wikiService.SearchByKeyword(bu, query)
		if kwErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		// Log search (fallback mode)
		userID := c.Get("X-User-ID", "anonymous")
		h.logService.Log(bu, userID, "ค้นหาข้อมูลวิกิ", "wiki", map[string]interface{}{"status": "GET", "query": query, "results": len(keywordResults), "fallback": "keyword"}, c.Get("User-Agent"))
		return c.JSON(fiber.Map{"items": keywordResults})
	}

	// 2. Keyword search with NLP expansion (ILIKE)
	keywordResults, _ := h.wikiService.SearchByKeyword(bu, query)

	// 3. Merge: semantic first, then keyword (dedupe by path)
	seen := make(map[string]bool)
	var merged []services.SearchResult
	for _, r := range semanticResults {
		path := r.Path
		if seen[path] {
			continue
		}
		seen[path] = true
		merged = append(merged, r)
	}
	for _, r := range keywordResults {
		path := r.Path
		if seen[path] {
			continue
		}
		seen[path] = true
		merged = append(merged, r)
	}

	// Log search
	userID := c.Get("X-User-ID", "anonymous")
	h.logService.Log(bu, userID, "ค้นหาข้อมูลวิกิ", "wiki", map[string]interface{}{"status": "GET", "query": query, "results": len(merged)}, c.Get("User-Agent"))

	return c.JSON(fiber.Map{"items": merged})
}

// Sync triggers a git pull to update local wiki content. POST /api/wiki/sync
func (h *WikiHandler) Sync(c *fiber.Ctx) error {
	if err := h.syncService.Sync(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true, "message": "synced"})
}
