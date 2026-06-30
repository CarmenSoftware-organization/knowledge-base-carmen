import { formatCarmenMessage } from "@/lib/carmen-formatter";

const API = "http://localhost:8080";

describe("formatCarmenMessage", () => {
  it("returns empty string for empty input", () => {
    expect(formatCarmenMessage("", API)).toBe("");
  });

  it("renders inline bold markdown", () => {
    expect(formatCarmenMessage("**hi**", API)).toContain("<b>hi</b>");
  });

  it("renders inline italic and code markdown", () => {
    const out = formatCarmenMessage("*em* and `code`", API);
    expect(out).toContain("<i>em</i>");
    expect(out).toContain('<code class="carmen-inline-code">code</code>');
  });

  it("renders a level-2 heading", () => {
    expect(formatCarmenMessage("## Title", API)).toContain(
      'carmen-heading-2',
    );
  });

  it("renders a bullet list", () => {
    const out = formatCarmenMessage("- a\n- b", API);
    expect(out).toContain("<ul>");
    expect(out).toContain("<li>a</li>");
    expect(out).toContain("<li>b</li>");
  });

  it("renders a numbered item", () => {
    expect(formatCarmenMessage("1. first", API)).toContain(
      "carmen-numbered-item",
    );
  });

  it("renders a horizontal rule", () => {
    expect(formatCarmenMessage("---", API)).toContain("carmen-hr");
  });

  it("escapes a literal '<' that is not an HTML tag", () => {
    const out = formatCarmenMessage("Amount < 100", API);
    expect(out).toContain("&lt;");
    expect(out).not.toContain("< 100<");
  });

  it("converts a YouTube link into an embedded iframe", () => {
    const out = formatCarmenMessage("[vid](https://youtu.be/abcdefghijk)", API);
    expect(out).toContain("<iframe");
    expect(out).toContain("youtube.com/embed/abcdefghijk");
  });

  it("converts an internal image into a lightbox img resolved via apiBase", () => {
    const out = formatCarmenMessage(
      "![alt](http://localhost:8080/x/y.png)",
      API,
    );
    expect(out).toContain("carmen-lightbox-img");
    expect(out).toContain("/images/x/y.png");
  });

  it("resolves a bare image filename via the image map with bu query", () => {
    const out = formatCarmenMessage(
      "![](image-44.png)",
      API,
      "carmen",
      { "image-44.png": "/images/ap/image-44.png" },
    );
    expect(out).toContain(`${API}/images/ap/image-44.png?bu=carmen`);
  });

  it("uses a baked folder path directly when no map entry exists", () => {
    const out = formatCarmenMessage("![](/images/ap/image-44.png)", API, "carmen");
    expect(out).toContain(`${API}/images/ap/image-44.png?bu=carmen`);
  });

  it("converts an external markdown link into a carmen-link anchor", () => {
    const out = formatCarmenMessage("[site](https://example.com)", API);
    expect(out).toContain("carmen-link");
    expect(out).toContain('target="_blank"');
    expect(out).toContain("example.com");
  });
});
