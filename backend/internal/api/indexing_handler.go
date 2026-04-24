package api

import (
	"context"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/middleware"
	"github.com/new-carmen/backend/internal/services"
)

type IndexingHandler struct {
	indexingService *services.IndexingService
	mu              sync.Mutex
	runningByBU     map[string]bool
	startedAtByBU   map[string]time.Time
}

func NewIndexingHandler() *IndexingHandler {
	return &IndexingHandler{
		indexingService: services.NewIndexingService(),
		runningByBU:     make(map[string]bool),
		startedAtByBU:   make(map[string]time.Time),
	}
}

func (h *IndexingHandler) Rebuild(c *fiber.Ctx) error {
	bu := middleware.GetBU(c)
	timeout := time.Duration(config.AppConfig.Chat.IndexingTimeoutMin) * time.Minute
	if timeout <= 0 {
		timeout = time.Hour
	}
	h.mu.Lock()
	if h.runningByBU[bu] {
		// Auto-heal stale in-memory lock if a previous worker got stuck/crashed.
		if started, ok := h.startedAtByBU[bu]; ok && time.Since(started) > (timeout+5*time.Minute) {
			delete(h.runningByBU, bu)
			delete(h.startedAtByBU, bu)
		} else {
			h.mu.Unlock()
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "reindex is already running for this bu"})
		}
	}
	h.runningByBU[bu] = true
	h.startedAtByBU[bu] = time.Now()
	h.mu.Unlock()

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()
		defer func() {
			h.mu.Lock()
			delete(h.runningByBU, bu)
			delete(h.startedAtByBU, bu)
			h.mu.Unlock()
		}()
		if err := h.indexingService.IndexAll(ctx, bu); err != nil {
			log.Printf("[index/rebuild] error (%s): %v", bu, err)
		} else {
			log.Printf("[index/rebuild] completed (%s)", bu)
		}
	}()
	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"message": "reindex started (running in background)"})
}

func (h *IndexingHandler) ForceUnlock(c *fiber.Ctx) error {
	bu := middleware.GetBU(c)
	h.mu.Lock()
	wasRunning := h.runningByBU[bu]
	delete(h.runningByBU, bu)
	delete(h.startedAtByBU, bu)
	h.mu.Unlock()
	return c.JSON(fiber.Map{
		"ok":          true,
		"bu":          bu,
		"was_running": wasRunning,
		"message":     "reindex lock cleared",
	})
}

func (h *IndexingHandler) Status(c *fiber.Ctx) error {
	bu := middleware.GetBU(c)
	h.mu.Lock()
	running := h.runningByBU[bu]
	started := h.startedAtByBU[bu]
	h.mu.Unlock()
	var startedAt string
	var runningForSec int64
	if !started.IsZero() {
		startedAt = started.UTC().Format(time.RFC3339)
		runningForSec = int64(time.Since(started).Seconds())
	}
	return c.JSON(fiber.Map{
		"bu":              bu,
		"running":         running,
		"started_at":      startedAt,
		"running_for_sec": runningForSec,
	})
}

func (h *IndexingHandler) RebuildOne(c *fiber.Ctx) error {
	bu := middleware.GetBU(c)
	path := strings.TrimSpace(c.Query("path"))
	if path == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "path is required"})
	}

	timeout := time.Duration(config.AppConfig.Chat.IndexingTimeoutMin) * time.Minute
	if timeout <= 0 {
		timeout = time.Hour
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	if err := h.indexingService.IndexPath(ctx, bu, path); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"ok":      true,
		"bu":      bu,
		"path":    path,
		"message": "reindex single file completed",
	})
}
