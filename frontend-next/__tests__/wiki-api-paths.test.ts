import {
  wikiPathToRoute,
  wikiDirFromContentPath,
  resolveWikiMarkdownHref,
  normalizeWikiRelPath,
  encodeWikiPathForFetch,
} from "@/lib/wiki-api";

describe("wikiPathToRoute", () => {
  it("maps root index.md to /", () => {
    expect(wikiPathToRoute("index.md")).toBe("/");
  });

  it("maps a root-level file to /categories/root/<slug>", () => {
    expect(wikiPathToRoute("getting-started.md")).toBe(
      "/categories/root/getting-started",
    );
  });

  it("maps a category index.md to /categories/<category>", () => {
    expect(wikiPathToRoute("ap/index.md")).toBe("/categories/ap");
  });

  it("maps a nested index.md to /categories/<category>/<middle>", () => {
    expect(wikiPathToRoute("ap/sub/index.md")).toBe("/categories/ap/sub");
  });

  it("maps a category file to /categories/<category>/<slug>", () => {
    expect(wikiPathToRoute("ap/invoice.md")).toBe("/categories/ap/invoice");
  });

  it("maps a deeply nested file to include the middle segments", () => {
    expect(wikiPathToRoute("ap/sub/invoice.md")).toBe(
      "/categories/ap/sub/invoice",
    );
  });

  it("normalizes backslash separators", () => {
    expect(wikiPathToRoute("ap\\invoice.md")).toBe("/categories/ap/invoice");
  });

  it("strips query and hash before routing", () => {
    expect(wikiPathToRoute("ap/invoice.md?x=1#frag")).toBe(
      "/categories/ap/invoice",
    );
  });

  it("filters '.' and '..' segments", () => {
    expect(wikiPathToRoute("ap/./../invoice.md")).toBe(
      "/categories/ap/invoice",
    );
  });

  it("url-encodes Thai/spaced segments", () => {
    const route = wikiPathToRoute("คู่มือ/index.md");
    expect(route.startsWith("/categories/")).toBe(true);
    expect(route).toBe(`/categories/${encodeURIComponent("คู่มือ")}`);
  });
});

describe("normalizeWikiRelPath", () => {
  it("converts backslashes to slashes and NFC-normalizes segments", () => {
    expect(normalizeWikiRelPath("ap\\invoice.md")).toBe("ap/invoice.md");
  });

  it("does not throw on a segment that cannot be decoded", () => {
    expect(() => normalizeWikiRelPath("%E0%")).not.toThrow();
    expect(normalizeWikiRelPath("%E0%")).toBe("%E0%");
  });
});

describe("encodeWikiPathForFetch", () => {
  it("encodes spaces per segment", () => {
    expect(encodeWikiPathForFetch("ap/my file.md")).toBe("ap/my%20file.md");
  });

  it("encodes double quotes per segment", () => {
    expect(encodeWikiPathForFetch('a/"quote".md')).toBe("a/%22quote%22.md");
  });
});

describe("wikiDirFromContentPath", () => {
  it("strips the trailing filename", () => {
    expect(wikiDirFromContentPath("ap/invoice.md")).toBe("ap");
  });

  it("strips a trailing /index.md", () => {
    expect(wikiDirFromContentPath("ap/sub/index.md")).toBe("ap/sub");
  });

  it("returns empty string for empty input", () => {
    expect(wikiDirFromContentPath("")).toBe("");
  });
});

describe("resolveWikiMarkdownHref", () => {
  it("returns external/special hrefs unchanged", () => {
    expect(resolveWikiMarkdownHref("https://x.com/a", "ap", "ap")).toBe(
      "https://x.com/a",
    );
    expect(resolveWikiMarkdownHref("mailto:a@b.com", "ap", "ap")).toBe(
      "mailto:a@b.com",
    );
    expect(resolveWikiMarkdownHref("#section", "ap", "ap")).toBe("#section");
  });

  it("returns an existing app route unchanged", () => {
    expect(resolveWikiMarkdownHref("/categories/ap/x", "ap", "ap")).toBe(
      "/categories/ap/x",
    );
    expect(resolveWikiMarkdownHref("/faq/x", "ap", "ap")).toBe("/faq/x");
  });

  it("resolves a relative link against the article dir", () => {
    expect(resolveWikiMarkdownHref("invoice.md", "ap/sub", "ap")).toBe(
      "/categories/ap/sub/invoice",
    );
  });

  it("treats a leading-slash link as repo-root relative", () => {
    expect(resolveWikiMarkdownHref("/other.md", "ap/sub", "ap")).toBe(
      "/categories/root/other",
    );
  });

  it("falls back to the category when no article dir is given", () => {
    expect(resolveWikiMarkdownHref("invoice.md", undefined, "ap")).toBe(
      "/categories/ap/invoice",
    );
  });
});
