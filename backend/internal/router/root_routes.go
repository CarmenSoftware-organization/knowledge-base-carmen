package router

import "github.com/gofiber/fiber/v2"

// rootLandingHTML is a minimal landing page served at "/". It does NOT
// auto-redirect — it shows a single button (an anchor styled as a button)
// that navigates to the Swagger UI when clicked.
const rootLandingHTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Carmen Backend API</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center;
    justify-content: center; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    background: #0f172a; color: #e2e8f0;
  }
  .card {
    text-align: center; padding: 3rem 2.5rem; border-radius: 16px;
    background: #1e293b; box-shadow: 0 10px 40px rgba(0,0,0,.35); max-width: 420px;
  }
  h1 { margin: 0 0 .5rem; font-size: 1.5rem; }
  p { margin: 0 0 2rem; color: #94a3b8; font-size: .95rem; }
  .btn {
    display: inline-block; padding: .75rem 1.75rem; border-radius: 10px;
    background: #2563eb; color: #fff; text-decoration: none; font-weight: 600;
    transition: background .15s ease;
  }
  .btn:hover { background: #1d4ed8; }
</style>
</head>
<body>
  <main class="card">
    <h1>Carmen Backend API</h1>
    <p>Go Fiber service &middot; native RAG chatbot at <code>/api/chat/*</code></p>
    <a class="btn" href="/swagger/index.html">Go to Swagger</a>
  </main>
</body>
</html>`

// RegisterRoot serves the landing page at "/".
func RegisterRoot(app *fiber.App) {
	app.Get("/", func(c *fiber.Ctx) error {
		c.Type("html", "utf-8")
		return c.SendString(rootLandingHTML)
	})
}
