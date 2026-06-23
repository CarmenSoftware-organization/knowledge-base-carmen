import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC_PATH = resolve(__dirname, "carmen-message.tsx");

describe("carmen-message export", () => {
  it("posts PDF export to the Go backend and has no DOCX export", () => {
    const src = readFileSync(SRC_PATH, "utf8");
    expect(src).toContain("${API_BASE}/api/export/pdf");
    // DOCX was dropped (Gotenberg has no HTML→DOCX route).
    expect(src).not.toContain("/api/export/docx");
    expect(src).not.toContain("handleExportDocx");
  });

  it("still contains DOMPurify.sanitize for XSS mitigation", () => {
    const src = readFileSync(SRC_PATH, "utf8");
    expect(src).toContain("DOMPurify.sanitize");
    expect(src).toContain("afterSanitizeAttributes");
  });
});
