package router

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/docs"
	"github.com/gofiber/fiber/v2"
)

// scalarHTML renders the OpenAPI spec (served at /openapi.json) with the Scalar
// API reference UI, loaded from a CDN. Scalar replaces the former Swagger UI.
const scalarHTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Knowledge base carmen API</title>
</head>
<body>
<script id="api-reference" data-url="/openapi.json"></script>
<!-- Pinned + Subresource Integrity to defend against CDN compromise. On a Scalar
     upgrade, bump the version and recompute: curl the standalone.js, then
     openssl dgst -sha384 -binary | openssl base64 -A. -->
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.61.0/dist/browser/standalone.js"
        integrity="sha384-Xs/iJWxWjlZkAyFsV9D9nI5WP5iKFnNNbnZVXMsTxD5dseQbCaaaYIb0YUtR9Ckl"
        crossorigin="anonymous"></script>
</body>
</html>`

// RegisterDocs serves the API reference UI (Scalar) at /swagger and the raw
// OpenAPI spec at /openapi.json. The spec is rendered from the swaggo-embedded
// docs.SwaggerInfo (compiled into the binary), so it works in the Docker runtime
// image, which does not ship the docs/ directory. Old Swagger-UI subpaths
// (/swagger/index.html etc.) and the short-lived /scalar path redirect to /swagger.
func RegisterDocs(app *fiber.App) {
	app.Get("/openapi.json", func(c *fiber.Ctx) error {
		c.Type("json", "utf-8")
		return c.SendString(docs.SwaggerInfo.ReadDoc())
	})
	app.Get("/swagger", func(c *fiber.Ctx) error {
		c.Type("html", "utf-8")
		return c.SendString(scalarHTML)
	})
	app.Get("/swagger/*", func(c *fiber.Ctx) error {
		return c.Redirect("/swagger", fiber.StatusFound)
	})
	app.Get("/scalar", func(c *fiber.Ctx) error {
		return c.Redirect("/swagger", fiber.StatusFound)
	})
}
