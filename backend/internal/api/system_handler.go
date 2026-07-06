// เอาไว้เช็คว่า backend ยัง OK ไหม (status: "ok")
package api

import (
	"strings"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/models"
	"github.com/gofiber/fiber/v2"
)

type SystemHandler struct{}

// NewSystemHandler constructs a SystemHandler.
func NewSystemHandler() *SystemHandler {
	return &SystemHandler{}
}

type systemResetRequest struct {
	Confirm string `json:"confirm"`
}

// Status GET /api/system/status
func (h *SystemHandler) Status(c *fiber.Ctx) error {
	return response.OK(c, models.SystemStatusResponse{Status: "ok", Message: ""})
}

// Reset truncates public.chat_history + public.activity_logs (all BUs). Body
// {confirm} must equal "RESET-CHAT-LOGS". Guarded by RequireAdminKey. It does
// NOT touch documents/chunks/business_units/faq.
func (h *SystemHandler) Reset(c *fiber.Ctx) error {
	var req systemResetRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, "invalid JSON body")
	}
	if strings.TrimSpace(req.Confirm) != "RESET-CHAT-LOGS" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidBody, `confirm must equal "RESET-CHAT-LOGS"`)
	}
	if err := database.ClearChatAndActivityTables(); err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, models.MessageResult{Message: "chat history + activity logs cleared"})
}
