package services

import (
	"context"
	"strings"
	"sync"
)

const cacheKeySep = "|||"

// WikiTranslationCache caches translated wiki content in memory.
// Key: "bu|||path|||targetLang"
type WikiTranslationCache struct {
	mu    sync.RWMutex
	items map[string]*CachedTranslation
}

// CachedTranslation holds cached translated content.
type CachedTranslation struct {
	Title       string
	Description string
	Content     string
}

// NewWikiTranslationCache creates a new in-memory cache.
func NewWikiTranslationCache() *WikiTranslationCache {
	return &WikiTranslationCache{
		items: make(map[string]*CachedTranslation),
	}
}

func cacheKey(bu, path, targetLang string) string {
	return bu + cacheKeySep + path + cacheKeySep + targetLang
}

// Get returns cached translation if found.
func (c *WikiTranslationCache) Get(bu, path, targetLang string) (*CachedTranslation, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	key := cacheKey(bu, path, targetLang)
	item, ok := c.items[key]
	return item, ok
}

// Set stores a translation in cache.
func (c *WikiTranslationCache) Set(bu, path, targetLang string, t *CachedTranslation) {
	c.mu.Lock()
	defer c.mu.Unlock()
	key := cacheKey(bu, path, targetLang)
	c.items[key] = t
}

// InvalidatePath removes cache entries for a given path (across all BUs and langs).
// Called when wiki content is synced/updated.
func (c *WikiTranslationCache) InvalidatePath(path string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for k := range c.items {
		parts := strings.Split(k, cacheKeySep)
		if len(parts) >= 2 && parts[1] == path {
			delete(c.items, k)
		}
	}
}

// GetOrTranslate returns cached translation or fetches and caches.
func (c *WikiTranslationCache) GetOrTranslate(ctx context.Context, bu, path, targetLang, sourceLang string, raw *WikiContent, svc *TranslationService) (*WikiContent, error) {
	if targetLang == sourceLang || targetLang == "" {
		return raw, nil
	}

	if cached, ok := c.Get(bu, path, targetLang); ok {
		return &WikiContent{
			Path:        raw.Path,
			Title:       cached.Title,
			Description: cached.Description,
			Content:     cached.Content,
			Published:   raw.Published,
			Date:        raw.Date,
			Tags:        raw.Tags,
			Editor:      raw.Editor,
			DateCreated: raw.DateCreated,
			PublishedAt: raw.PublishedAt,
		}, nil
	}

	translatedTitle, translatedDesc, translatedContent, err := svc.TranslateWikiContent(ctx, raw.Title, raw.Description, raw.Content, sourceLang, targetLang)
	if err != nil {
		return nil, err
	}

	c.Set(bu, path, targetLang, &CachedTranslation{
		Title:       translatedTitle,
		Description: translatedDesc,
		Content:     translatedContent,
	})

	return &WikiContent{
		Path:        raw.Path,
		Title:       translatedTitle,
		Description: translatedDesc,
		Content:     translatedContent,
		Published:   raw.Published,
		Date:        raw.Date,
		Tags:        raw.Tags,
		Editor:      raw.Editor,
		DateCreated: raw.DateCreated,
		PublishedAt: raw.PublishedAt,
	}, nil
}
