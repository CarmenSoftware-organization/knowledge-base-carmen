package response

import (
	"errors"

	"github.com/gofiber/fiber/v2"
)

// ErrorHandler is the global Fiber error handler. It renders any error returned
// from a handler (or an unmatched route / recovered panic) as an ErrorResponse
// envelope. Handlers that call response.Fail already wrote their body and return
// nil, so this only catches the unhandled tail.
func ErrorHandler(c *fiber.Ctx, err error) error {
	status := fiber.StatusInternalServerError
	var fe *fiber.Error
	if errors.As(err, &fe) {
		status = fe.Code
	}
	return c.Status(status).JSON(ErrorResponse{
		Success: false,
		Error:   ErrorBody{Code: codeForStatus(status), Message: err.Error()},
	})
}
