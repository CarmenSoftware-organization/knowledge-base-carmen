package api

import (
	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/services"
)

type FAQHandler struct {
	faqService *services.FAQService
}

func NewFAQHandler() *FAQHandler {
	return &FAQHandler{
		faqService: services.NewFAQService(),
	}
}

// ListModules returns FAQ modules for a BU. GET /api/faq/modules?bu=...
func (h *FAQHandler) ListModules(c *fiber.Ctx) error {
	bu := c.Query("bu", "carmen")
	mods, err := h.faqService.ListModules(bu)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"items": mods})
}

// GetModuleDetail returns a module with its submodules + categories. GET /api/faq/:module
func (h *FAQHandler) GetModuleDetail(c *fiber.Ctx) error {
	moduleSlug := c.Params("module")
	if moduleSlug == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "module is required"})
	}
	bu := c.Query("bu", "carmen")
	data, err := h.faqService.GetModuleWithChildren(bu, moduleSlug)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(data)
}

// ListByCategory returns FAQ entries inside a category. GET /api/faq/:module/:sub/:category
func (h *FAQHandler) ListByCategory(c *fiber.Ctx) error {
	moduleSlug := c.Params("module")
	subSlug := c.Params("sub")
	catSlug := c.Params("category")
	if moduleSlug == "" || subSlug == "" || catSlug == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "module, sub, category are required"})
	}
	bu := c.Query("bu", "carmen")
	q := c.Query("q", "")

	resp, err := h.faqService.ListByCategory(bu, moduleSlug, subSlug, catSlug, q)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(resp)
}

// GetEntry returns a single FAQ entry. GET /api/faq/entry/:id
func (h *FAQHandler) GetEntry(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "id is required"})
	}
	bu := c.Query("bu", "carmen")
	entry, err := h.faqService.GetEntryByID(bu, id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(entry)
}

