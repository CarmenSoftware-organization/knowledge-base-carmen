package response

import "github.com/gofiber/fiber/v2"

// Meta carries pagination info for list endpoints.
type Meta struct {
	Total  *int `json:"total,omitempty"`
	Limit  *int `json:"limit,omitempty"`
	Offset *int `json:"offset,omitempty"`
}

// Envelope is the standard success response: {"success":true,"data":<T>,"meta"?:{...}}.
type Envelope[T any] struct {
	Success bool  `json:"success"`
	Data    T     `json:"data"`
	Meta    *Meta `json:"meta,omitempty"`
}

// ErrorBody is the error payload carried by ErrorResponse.
type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ErrorResponse is the standard error response: {"success":false,"error":{...}}.
type ErrorResponse struct {
	Success bool      `json:"success"`
	Error   ErrorBody `json:"error"`
}

// OK writes a 200 success envelope.
func OK[T any](c *fiber.Ctx, data T) error {
	return c.JSON(Envelope[T]{Success: true, Data: data})
}

// OKStatus writes a success envelope with a custom HTTP status (e.g. 202).
func OKStatus[T any](c *fiber.Ctx, status int, data T) error {
	return c.Status(status).JSON(Envelope[T]{Success: true, Data: data})
}

// List writes a 200 success envelope with pagination meta.
func List[T any](c *fiber.Ctx, data T, meta *Meta) error {
	return c.JSON(Envelope[T]{Success: true, Data: data, Meta: meta})
}

// Fail writes an error envelope with the given HTTP status, code and message.
func Fail(c *fiber.Ctx, status int, code, message string) error {
	return c.Status(status).JSON(ErrorResponse{Success: false, Error: ErrorBody{Code: code, Message: message}})
}

// IntPtr returns a pointer to v (for building Meta).
func IntPtr(v int) *int { return &v }
