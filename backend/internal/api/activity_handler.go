package api

import (
	"strconv"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/models"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/services"
	"github.com/gofiber/fiber/v2"
)

type ActivityHandler struct {
	service *services.ActivityLogService
}

// NewActivityHandler constructs an ActivityHandler backed by a new ActivityLogService.
func NewActivityHandler() *ActivityHandler {
	return &ActivityHandler{
		service: services.NewActivityLogService(),
	}
}

// List returns a list of activity logs. GET /api/activity/list?bu=...&limit=20&offset=0&source=all|user|admin
func (h *ActivityHandler) List(c *fiber.Ctx) error {
	buSlug := c.Query("bu")
	source := c.Query("source", "all")
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	logs, total, err := h.service.GetLogsWithFilter(buSlug, source, limit, offset)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	if logs == nil {
		logs = []models.ActivityLog{}
	}
	return response.List(c, logs, &response.Meta{
		Total:  response.IntPtr(int(total)),
		Limit:  response.IntPtr(limit),
		Offset: response.IntPtr(offset),
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
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}

	return response.OK(c, models.ActivitySummary{Period: period, Items: results})
}
