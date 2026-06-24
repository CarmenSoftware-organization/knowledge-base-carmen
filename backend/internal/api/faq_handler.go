package api

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/api/response"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/constants"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type FAQHandler struct {
	faqService *services.FAQService
}

// NewFAQHandler constructs a FAQHandler backed by a new FAQService.
func NewFAQHandler() *FAQHandler {
	return &FAQHandler{
		faqService: services.NewFAQService(),
	}
}

// ListModules returns FAQ modules for a BU. GET /api/faq/modules?bu=...
func (h *FAQHandler) ListModules(c *fiber.Ctx) error {
	bu := c.Query("bu", constants.DefaultBU)
	mods, err := h.faqService.ListModules(bu)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, mods)
}

// GetModuleDetail returns a module with its submodules + categories. GET /api/faq/:module
func (h *FAQHandler) GetModuleDetail(c *fiber.Ctx) error {
	moduleSlug := c.Params("module")
	if moduleSlug == "" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeMissingParam, "module is required")
	}
	bu := c.Query("bu", constants.DefaultBU)
	data, err := h.faqService.GetModuleWithChildren(bu, moduleSlug)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, data)
}

// ListByCategory returns FAQ entries inside a category. GET /api/faq/:module/:sub/:category
func (h *FAQHandler) ListByCategory(c *fiber.Ctx) error {
	moduleSlug := c.Params("module")
	subSlug := c.Params("sub")
	catSlug := c.Params("category")
	if moduleSlug == "" || subSlug == "" || catSlug == "" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeMissingParam, "module, sub, category are required")
	}
	bu := c.Query("bu", constants.DefaultBU)
	q := c.Query("q", "")

	resp, err := h.faqService.ListByCategory(bu, moduleSlug, subSlug, catSlug, q)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, resp)
}

// GetEntry returns a single FAQ entry. GET /api/faq/entry/:id
func (h *FAQHandler) GetEntry(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeMissingParam, "id is required")
	}
	if _, err := uuid.Parse(id); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, response.CodeInvalidID, "invalid id")
	}
	bu := c.Query("bu", constants.DefaultBU)
	entry, err := h.faqService.GetEntryByID(bu, id)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, response.CodeInternal, err.Error())
	}
	return response.OK(c, entry)
}
