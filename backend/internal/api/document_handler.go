// CRUD เอกสาร + versions ต้อง login — ยังไม่ใช้ (เปิดเมื่อมี DB)
package api

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/new-carmen/backend/internal/services"
)

type DocumentHandler struct {
	docService *services.DocumentService
}

func NewDocumentHandler() *DocumentHandler {
	return &DocumentHandler{
		docService: services.NewDocumentService(),
	}
}

func (h *DocumentHandler) CreateDocument(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint64)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	var req services.CreateDocumentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	req.OwnerID = userID
	document, err := h.docService.CreateDocument(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(document)
}

func (h *DocumentHandler) GetDocument(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid document ID",
		})
	}

	userID, _ := c.Locals("user_id").(uint64)

	// Check permission
	hasPermission, err := h.docService.CheckPermission(id, userID, "read")
	if err != nil || !hasPermission {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Access denied",
		})
	}

	document, err := h.docService.GetDocument(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Document not found",
		})
	}

	return c.JSON(document)
}

func (h *DocumentHandler) UpdateDocument(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid document ID",
		})
	}

	userID, _ := c.Locals("user_id").(uint64)

	// Check permission
	hasPermission, err := h.docService.CheckPermission(id, userID, "write")
	if err != nil || !hasPermission {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Access denied",
		})
	}

	var req services.UpdateDocumentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	document, err := h.docService.UpdateDocument(id, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(document)
}

func (h *DocumentHandler) DeleteDocument(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid document ID",
		})
	}

	userID, _ := c.Locals("user_id").(uint64)

	// Check permission (admin only)
	hasPermission, err := h.docService.CheckPermission(id, userID, "admin")
	if err != nil || !hasPermission {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Access denied",
		})
	}

	if err := h.docService.DeleteDocument(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusNoContent).Send(nil)
}

func (h *DocumentHandler) AddVersion(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint64)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	var req services.CreateVersionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	req.CreatedBy = userID

	// Check permission
	hasPermission, err := h.docService.CheckPermission(req.DocumentID, userID, "write")
	if err != nil || !hasPermission {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Access denied",
		})
	}

	version, err := h.docService.AddVersion(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(version)
}
