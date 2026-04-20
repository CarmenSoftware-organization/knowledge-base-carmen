import {
  encodeWikiPathForFetch,
  resolveWikiMarkdownHref,
  wikiDirFromContentPath,
  wikiPathToRoute,
} from "@/lib/wiki-api";
import { displayWikiArticleTitle } from "@/lib/wiki-utils";

describe("wikiPathToRoute hardening", () => {
  it("encodes segments and strips query/hash", () => {
    expect(wikiPathToRoute("foo/bar.md?x=1#y")).toBe("/categories/foo/bar");
    expect(wikiPathToRoute("foo/a b.md")).toBe("/categories/foo/a%20b");
  });

  it("drops dot segments to avoid traversal-like paths", () => {
    expect(wikiPathToRoute("../secret.md")).toBe("/categories/root/secret");
    expect(wikiPathToRoute("foo/../bar.md")).toBe("/categories/foo/bar");
  });
});

describe("wikiDirFromContentPath", () => {
  it("strips index.md and leaf .md correctly", () => {
    expect(wikiDirFromContentPath("workbook/Topic/index.md")).toBe(
      "workbook/Topic",
    );
    expect(wikiDirFromContentPath("workbook/Topic/a.md")).toBe("workbook/Topic");
  });
});

describe("displayWikiArticleTitle", () => {
  it("uses humanized stem when title is a long error blob", () => {
    const long =
      'Import Budget ใน workbook แล้วแสดง ข้อความ "Error: department code ...';
    const path =
      "workbook/Topic/Import-Budget-with-dimension-systems-show-error-about-duplicate-value.md";
    expect(displayWikiArticleTitle(long, "Import-Budget-...", path)).toBe(
      "Import Budget with dimension systems show error about duplicate value",
    );
  });
});

describe("encodeWikiPathForFetch", () => {
  it("percent-encodes each segment for safe HTTP path", () => {
    expect(encodeWikiPathForFetch(`ap/topic/file with "quotes".md`)).toBe(
      "ap/topic/file%20with%20%22quotes%22.md",
    );
  });
});

describe("resolveWikiMarkdownHref", () => {
  it("resolves ./article.md relative to wikiArticleDir", () => {
    expect(
      resolveWikiMarkdownHref(
        "./child.md",
        "workbook/Workbook-Installation-and-Configuration",
        "workbook",
      ),
    ).toBe(
      "/categories/workbook/Workbook-Installation-and-Configuration/child",
    );
  });

  it("leaves absolute http(s) unchanged", () => {
    expect(
      resolveWikiMarkdownHref(
        "https://example.com/x",
        "workbook/Topic",
        "workbook",
      ),
    ).toBe("https://example.com/x");
  });
});

