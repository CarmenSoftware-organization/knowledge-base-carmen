import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function POST(req: NextRequest) {
  try {
    const { html } = await req.json();
    if (!html || typeof html !== "string") {
      return NextResponse.json({ error: "html is required" }, { status: 400 });
    }

    const fullHtml = `<!DOCTYPE html>
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
${html}
</body>
</html>`;

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    try {
      const page = await browser.newPage();

      // Block file:// protocol and requests to private/internal networks to prevent SSRF
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        const url = request.url();
        if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:")) {
          request.abort();
          return;
        }
        try {
          const { hostname } = new URL(url);
          const isInternal =
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname === "::1" ||
            /^10\./.test(hostname) ||
            /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
            /^192\.168\./.test(hostname);
          if (isInternal) { request.abort(); return; }
        } catch {
          request.abort();
          return;
        }
        request.continue();
      });

      await page.setContent(fullHtml, { waitUntil: "networkidle0", timeout: 30000 });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
      });

      return new NextResponse(Buffer.from(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="carmen-export.pdf"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error("PDF export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
