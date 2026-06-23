package export

// WrapHTML wraps rendered chat HTML in the full styled document used for PDF
// export. The CSS is copied verbatim from the former Next.js export route so the
// output is visually identical.
func WrapHTML(body string) string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: 'Tahoma', 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.7;
    color: #1e293b;
    background: #ffffff;
  }
  body { padding: 0 32px 32px; }

  h1, h2, h3, h4, h5, h6 {
    color: #0f172a;
    font-weight: 700;
    line-height: 1.3;
    margin: 1.4em 0 0.5em;
  }
  h1 { font-size: 1.75em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
  h2 { font-size: 1.4em; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.2em; }
  h3 { font-size: 1.15em; }
  h4, h5, h6 { font-size: 1em; }

  p { margin: 0.7em 0; }
  a { color: #2563eb; text-decoration: underline; }

  ul, ol { padding-left: 1.6em; margin: 0.6em 0; }
  li { margin: 0.25em 0; }

  strong, b { font-weight: 700; }
  em, i { font-style: italic; }

  code {
    font-family: 'Courier New', Consolas, monospace;
    font-size: 0.85em;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 3px;
    padding: 0.1em 0.35em;
  }
  pre {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 14px 16px;
    overflow-x: auto;
    margin: 1em 0;
  }
  pre code {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.82em;
  }

  blockquote {
    border-left: 4px solid #3b82f6;
    margin: 1em 0;
    padding: 8px 16px;
    background: #eff6ff;
    color: #1e40af;
    border-radius: 0 4px 4px 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
    font-size: 0.9em;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 8px 12px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #f1f5f9;
    font-weight: 700;
    color: #0f172a;
  }
  tr:nth-child(even) td { background: #f8fafc; }

  img { max-width: 100%; height: auto; border-radius: 4px; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5em 0; }

  /* Suppress Tailwind class artefacts that have no CSS loaded */
  [class] { all: revert; }
  /* But restore our resets */
  * { box-sizing: border-box !important; }
</style>
</head>
<body>
` + body + `
</body>
</html>`
}
