// backend/internal/api/response/errorhandler_test.go
package response

import (
	"encoding/json"
	"errors"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func runEH(t *testing.T, h fiber.Handler) (int, map[string]any) {
	t.Helper()
	app := fiber.New(fiber.Config{ErrorHandler: ErrorHandler})
	app.Get("/t", h)
	resp, err := app.Test(httptest.NewRequest("GET", "/t", nil), -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()
	var body map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&body)
	return resp.StatusCode, body
}

func TestErrorHandler_FiberErrorMapsStatusAndCode(t *testing.T) {
	status, body := runEH(t, func(c *fiber.Ctx) error {
		return fiber.NewError(fiber.StatusNotFound, "nope")
	})
	if status != 404 {
		t.Fatalf("status %d", status)
	}
	if body["success"] != false {
		t.Errorf("success=%v", body["success"])
	}
	e := body["error"].(map[string]any)
	if e["code"] != "NOT_FOUND" {
		t.Errorf("code=%v", e["code"])
	}
}

func TestErrorHandler_PlainErrorIs500Internal(t *testing.T) {
	status, body := runEH(t, func(c *fiber.Ctx) error { return errors.New("boom") })
	if status != 500 {
		t.Fatalf("status %d", status)
	}
	e := body["error"].(map[string]any)
	if e["code"] != "INTERNAL" {
		t.Errorf("code=%v", e["code"])
	}
}
