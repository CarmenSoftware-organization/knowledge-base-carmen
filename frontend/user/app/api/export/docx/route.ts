import { NextRequest, NextResponse } from "next/server";
import HTMLtoDOCX from "html-to-docx";

/** html-to-docx fetches images by HTTP URL internally — it does NOT support data: URIs.
 *  This function converts relative /... src paths to absolute http://origin/... so the
 *  library can fetch them. External https:// URLs are left unchanged. */
function makeImagesAbsolute(html: string, baseUrl: string): string {
  return html.replace(
    /(<img[^>]+src=")(?!https?:|data:|blob:)(\/[^"]+)(")/gi,
    (_, pre, path, post) => `${pre}${baseUrl}${path}${post}`
  );
}

export async function POST(req: NextRequest) {
  try {
    const { html } = await req.json();
    if (!html || typeof html !== "string") {
      return NextResponse.json({ error: "html is required" }, { status: 400 });
    }

    const baseUrl = req.nextUrl.origin;
    const processedHtml = makeImagesAbsolute(html, baseUrl);
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${processedHtml}</body></html>`;

    // html-to-docx returns Buffer in Node.js (not Blob)
    const buffer = await HTMLtoDOCX(fullHtml, null, {
      title: "Carmen Export",
      font: "Tahoma",
      fontSize: 28,
      lineHeight: 1.6,
      table: { row: { cantSplit: true } },
      pageNumber: false,
      margin: { top: 1440, bottom: 1440, left: 1800, right: 1800 },
    }) as unknown as Buffer;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="carmen-export.docx"`,
      },
    });
  } catch (err) {
    console.error("DOCX export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
