import { describe, it, expect } from "bun:test";
import { isAllowedIframeSrc } from "./iframe-allowlist";

describe("isAllowedIframeSrc", () => {
  it("allows exact trusted embed hosts over https", () => {
    expect(isAllowedIframeSrc("https://www.youtube.com/embed/abc")).toBe(true);
    expect(isAllowedIframeSrc("https://www.youtube-nocookie.com/embed/abc")).toBe(true);
    expect(isAllowedIframeSrc("https://player.vimeo.com/video/123")).toBe(true);
  });

  it("rejects lookalike hosts that only prefix-match the raw src (the bypass)", () => {
    expect(isAllowedIframeSrc("https://www.youtube.com.evil.com/embed/x")).toBe(false);
    expect(isAllowedIframeSrc("https://www.youtube.com.evil.com")).toBe(false);
    expect(isAllowedIframeSrc("https://evil.com/?u=https://www.youtube.com")).toBe(false);
  });

  it("rejects non-https schemes and invalid URLs", () => {
    expect(isAllowedIframeSrc("http://www.youtube.com/embed/x")).toBe(false);
    expect(isAllowedIframeSrc("javascript:alert(1)")).toBe(false);
    expect(isAllowedIframeSrc("")).toBe(false);
  });
});
