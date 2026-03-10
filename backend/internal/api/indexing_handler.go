package api

import (
	"context"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/middleware"
	"github.com/new-carmen/backend/internal/services"
)

type IndexingHandler struct {
	indexingService *services.IndexingService
}

func NewIndexingHandler() *IndexingHandler {
	return &IndexingHandler{
		indexingService: services.NewIndexingService(),
	}
}

func (h *IndexingHandler) Rebuild(c *fiber.Ctx) error {
	bu := middleware.GetBU(c)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Minute)
		defer cancel()
		if err := h.indexingService.IndexAll(ctx, bu); err != nil {
			log.Printf("[index/rebuild] error (%s): %v", bu, err)
		} else {
			log.Printf("[index/rebuild] completed (%s)", bu)
		}
	}()
	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"message": "reindex started (running in background)"})
}
