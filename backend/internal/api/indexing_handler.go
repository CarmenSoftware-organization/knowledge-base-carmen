package api

import (
	"context"
	"log"
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
}

func NewIndexingHandler() *IndexingHandler {
	return &IndexingHandler{
		indexingService: services.NewIndexingService(),
		runningByBU:     make(map[string]bool),
	}
}

func (h *IndexingHandler) Rebuild(c *fiber.Ctx) error {
	bu := middleware.GetBU(c)
	h.mu.Lock()
	if h.runningByBU[bu] {
		h.mu.Unlock()
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "reindex is already running for this bu"})
	}
	h.runningByBU[bu] = true
	h.mu.Unlock()

	go func() {
		timeout := time.Duration(config.AppConfig.Chat.IndexingTimeoutMin) * time.Minute
		if timeout <= 0 {
			timeout = time.Hour
		}
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()
		defer func() {
			h.mu.Lock()
			delete(h.runningByBU, bu)
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
