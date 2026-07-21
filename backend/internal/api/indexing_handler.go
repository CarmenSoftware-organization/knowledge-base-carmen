package api

import (
	"context"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/middleware"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/models"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/services"
	"github.com/gofiber/fiber/v2"
)

type IndexingHandler struct {
	indexingService *services.IndexingService
	mu              sync.Mutex
	runningByBU     map[string]bool
	startedAtByBU   map[string]time.Time
}

// NewIndexingHandler constructs an IndexingHandler with an in-memory per-BU running lock.
func NewIndexingHandler() *IndexingHandler {
	return &IndexingHandler{
		indexingService: services.NewIndexingService(),
		runningByBU:     make(map[string]bool),
		startedAtByBU:   make(map[string]time.Time),
	}
}

// Rebuild starts a full background reindex for the BU, rejecting concurrent runs (auto-heals stale locks).
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
			return response.Fail(c, fiber.StatusConflict, response.CodeReindexRunning, "reindex is already running for this bu")
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
	return response.OKStatus(c, fiber.StatusAccepted, models.MessageResult{Message: "reindex started (running in background)"})
}

// ForceUnlock clears the in-memory reindex lock for the BU and reports whether it was running.
func (h *IndexingHandler) ForceUnlock(c *fiber.Ctx) error {
	bu := middleware.GetBU(c)
	h.mu.Lock()
	wasRunning := h.runningByBU[bu]
	delete(h.runningByBU, bu)
	delete(h.startedAtByBU, bu)
	h.mu.Unlock()
	return response.OK(c, models.ReindexUnlock{BU: bu, WasRunning: wasRunning, Message: "reindex lock cleared"})
}

// Status reports whether a reindex is running for the BU, plus its start time and elapsed seconds.
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
	return response.OK(c, models.ReindexStatus{
		BU:            bu,
		Running:       running,
		StartedAt:     startedAt,
		RunningForSec: runningForSec,
	})
}

// RebuildOne synchronously reindexes a single file given by the ?path query param.
func (h *IndexingHandler) RebuildOne(c *fiber.Ctx) error {
	bu := middleware.GetBU(c)
	path := strings.TrimSpace(c.Query("path"))
	if path == "" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeMissingParam, "path is required")
	}

	timeout := time.Duration(config.AppConfig.Chat.IndexingTimeoutMin) * time.Minute
	if timeout <= 0 {
		timeout = time.Hour
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	if err := h.indexingService.IndexPath(ctx, bu, path); err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, models.ReindexOneResult{BU: bu, Path: path, Message: "reindex single file completed"})
}

// resetRequest is the body for index/system reset; confirm must match a scope-specific token.
type resetRequest struct {
	Confirm string `json:"confirm"`
}

// Reset truncates the RAG index for one BU (?bu=<slug>) or every BU (?bu=all).
// Body {confirm} must equal the bu slug, or "ALL" when bu=all. Guarded by RequireAdminKey.
func (h *IndexingHandler) Reset(c *fiber.Ctx) error {
	bu := middleware.GetBU(c) // lower-cased + slug-validated by BUContext; "all" is allowed
	var req resetRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, "invalid JSON body")
	}
	confirm := strings.TrimSpace(req.Confirm)

	if strings.EqualFold(bu, "all") {
		if confirm != "ALL" {
			return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, `confirm must equal "ALL"`)
		}
		if err := database.TruncateAllBUIndexTables(); err != nil {
			return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
		}
		return response.OK(c, models.MessageResult{Message: "index reset for all BUs; run reindex to rebuild"})
	}

	if confirm != bu {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, "confirm must equal the bu slug")
	}
	if err := database.TruncateBUTables(bu); err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, models.MessageResult{Message: "index reset for " + bu + "; run reindex to rebuild"})
}
