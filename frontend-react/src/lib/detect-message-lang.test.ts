import { describe, it, expect } from "bun:test";
import { detectMessageLang } from "./detect-message-lang";

describe("detectMessageLang", () => {
  it("returns th for Thai text", () => {
    expect(detectMessageLang("กดปุ่ม refresh ไม่ได้ ทำยังไง")).toBe("th");
    expect(detectMessageLang("สวัสดี")).toBe("th");
  });

  it("returns en for English text", () => {
    expect(detectMessageLang("How do I create an AP invoice?")).toBe("en");
    expect(detectMessageLang("refresh workbook")).toBe("en");
  });

  it("treats mixed text as Thai (presence rule)", () => {
    expect(detectMessageLang("how to fix ใบกำกับภาษี")).toBe("th");
  });

  it("falls back to th for text with no letters", () => {
    expect(detectMessageLang("")).toBe("th");
    expect(detectMessageLang("   ")).toBe("th");
    expect(detectMessageLang("12345")).toBe("th");
    expect(detectMessageLang("👍🎉")).toBe("th");
  });
});
