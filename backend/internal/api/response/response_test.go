package response

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func decode(t *testing.T, app *fiber.App, method, path string) (int, map[string]any) {
	t.Helper()
	resp, err := app.Test(httptest.NewRequest(method, path, nil), -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()
	var body map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return resp.StatusCode, body
}

func TestOK_WrapsDataSuccessTrueNoError(t *testing.T) {
	app := fiber.New()
	app.Get("/t", func(c *fiber.Ctx) error { return OK(c, fiber.Map{"x": 1}) })
	status, body := decode(t, app, "GET", "/t")
	if status != 200 {
		t.Fatalf("status %d", status)
	}
	if body["success"] != true {
		t.Errorf("success=%v", body["success"])
	}
	if _, ok := body["data"]; !ok {
		t.Errorf("data missing")
	}
	if _, ok := body["error"]; ok {
		t.Errorf("error must be absent on success")
	}
}

func TestList_IncludesMeta(t *testing.T) {
	app := fiber.New()
	app.Get("/t", func(c *fiber.Ctx) error {
		return List(c, []int{1, 2}, &Meta{Total: IntPtr(2), Limit: IntPtr(20), Offset: IntPtr(0)})
	})
	_, body := decode(t, app, "GET", "/t")
	meta, ok := body["meta"].(map[string]any)
	if !ok {
		t.Fatalf("meta missing: %v", body)
	}
	if meta["total"].(float64) != 2 {
		t.Errorf("total=%v", meta["total"])
	}
}

func TestOKStatus_SetsStatus(t *testing.T) {
	app := fiber.New()
	app.Get("/t", func(c *fiber.Ctx) error { return OKStatus(c, 202, fiber.Map{"m": "go"}) })
	status, body := decode(t, app, "GET", "/t")
	if status != 202 {
		t.Fatalf("status %d", status)
	}
	if body["success"] != true {
		t.Errorf("success=%v", body["success"])
	}
}

func TestFail_WrapsErrorSuccessFalseNoData(t *testing.T) {
	app := fiber.New()
	app.Get("/t", func(c *fiber.Ctx) error {
		return Fail(c, fiber.StatusBadRequest, "INVALID_BU", "invalid bu")
	})
	status, body := decode(t, app, "GET", "/t")
	if status != 400 {
		t.Fatalf("status %d", status)
	}
	if body["success"] != false {
		t.Errorf("success=%v", body["success"])
	}
	e, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("error missing")
	}
	if e["code"] != "INVALID_BU" || e["message"] != "invalid bu" {
		t.Errorf("error=%v", e)
	}
	if _, ok := body["data"]; ok {
		t.Errorf("data must be absent on error")
	}
}
