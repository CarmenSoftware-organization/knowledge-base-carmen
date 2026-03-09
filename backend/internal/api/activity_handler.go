package api

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/services"
)

type ActivityHandler struct {
	service *services.ActivityLogService
}

func NewActivityHandler() *ActivityHandler {
	return &ActivityHandler{
		service: services.NewActivityLogService(),
	}
}

// List returns a list of activity logs. GET /api/activity/list?bu=...&limit=...&offset=...
func (h *ActivityHandler) List(c *fiber.Ctx) error {
	buSlug := c.Query("bu")
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	logs, err := h.service.GetLogs(buSlug, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"items": logs,
	})
}

// Summary returns activity summaries. GET /api/activity/summary?bu=...&period=monthly|yearly&year=...
func (h *ActivityHandler) Summary(c *fiber.Ctx) error {
	buSlug := c.Query("bu")
	period := c.Query("period", "monthly")
	year, _ := strconv.Atoi(c.Query("year", "0"))

	var results interface{}
	var err error

	if period == "yearly" {
		results, err = h.service.GetYearlySummary(buSlug)
	} else {
		results, err = h.service.GetMonthlySummary(buSlug, year)
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"period": period,
		"items":  results,
	})
}
