package api

import (
	"context"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
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
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		if err := h.indexingService.IndexAll(ctx); err != nil {
			log.Printf("[index/rebuild] error: %v", err)
		} else {
			log.Printf("[index/rebuild] completed")
		}
	}()
	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"message": "reindex started (running in background)"})
}
