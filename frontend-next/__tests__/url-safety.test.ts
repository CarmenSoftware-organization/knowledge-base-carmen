import { isYoutubeUrl, safeImageSrc, safeLinkHref } from "@/lib/url-safety";

describe("isYoutubeUrl (host-based, not substring)", () => {
  it("accepts real YouTube hosts", () => {
    expect(isYoutubeUrl("https://www.youtube.com/watch?v=abc")).toBe(true);
    expect(isYoutubeUrl("https://youtube.com/embed/abc")).toBe(true);
    expect(isYoutubeUrl("https://m.youtube.com/watch?v=abc")).toBe(true);
    expect(isYoutubeUrl("https://youtu.be/abc")).toBe(true);
  });

  it("rejects look-alike / embedded hosts that substring checks would pass", () => {
    expect(isYoutubeUrl("https://evil.com/?u=youtube.com")).toBe(false);
    expect(isYoutubeUrl("https://youtube.com.evil.com/x")).toBe(false);
    expect(isYoutubeUrl("https://notyoutube.com/x")).toBe(false);
    expect(isYoutubeUrl("https://youtu.be.evil.com/x")).toBe(false);
  });

  it("rejects non-URLs and non-http(s)", () => {
    expect(isYoutubeUrl("/relative/path")).toBe(false);
    expect(isYoutubeUrl("not a url")).toBe(false);
  });
});

describe("safeImageSrc (img src allowlist)", () => {
  it("allows relative, http(s), data:image, blob:", () => {
    expect(safeImageSrc("/media/a.png")).toBe("/media/a.png");
    expect(safeImageSrc("https://cdn.example.com/x.png")).toBe("https://cdn.example.com/x.png");
    expect(safeImageSrc("http://cdn.example.com/x.png")).toBe("http://cdn.example.com/x.png");
    expect(safeImageSrc("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
    expect(safeImageSrc("blob:https://app/uuid")).toBe("blob:https://app/uuid");
  });

  it("rejects dangerous schemes and non-image data URIs", () => {
    expect(safeImageSrc("javascript:alert(1)")).toBeNull();
    expect(safeImageSrc(" javascript:alert(1)")).toBeNull();
    expect(safeImageSrc("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeImageSrc("vbscript:msgbox(1)")).toBeNull();
    expect(safeImageSrc("//evil.com/x.png")).toBeNull();
  });
});

describe("safeLinkHref (navigation allowlist — stricter)", () => {
  it("allows relative and http(s) only", () => {
    expect(safeLinkHref("/article/1")).toBe("/article/1");
    expect(safeLinkHref("https://example.com/x")).toBe("https://example.com/x");
    expect(safeLinkHref("http://example.com/x")).toBe("http://example.com/x");
  });

  it("rejects data:, blob:, javascript:, and protocol-relative", () => {
    expect(safeLinkHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeLinkHref("data:image/png;base64,AAAA")).toBeNull();
    expect(safeLinkHref("blob:https://app/uuid")).toBeNull();
    expect(safeLinkHref("javascript:alert(1)")).toBeNull();
    expect(safeLinkHref("//evil.com/x")).toBeNull();
  });
});
