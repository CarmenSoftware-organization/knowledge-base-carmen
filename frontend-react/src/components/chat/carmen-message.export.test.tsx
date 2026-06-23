import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC_PATH = resolve(__dirname, "carmen-message.tsx");

describe("carmen-message export", () => {
  it("posts export to the Go backend, not a Next route", () => {
    const src = readFileSync(SRC_PATH, "utf8");
    expect(src).toContain("${API_BASE}/api/export/docx");
    expect(src).toContain("${API_BASE}/api/export/pdf");
    expect(src).not.toMatch(/fetch\("\/api\/export/);
  });

  it("still contains DOMPurify.sanitize for XSS mitigation", () => {
    const src = readFileSync(SRC_PATH, "utf8");
    expect(src).toContain("DOMPurify.sanitize");
    expect(src).toContain("afterSanitizeAttributes");
  });
});
