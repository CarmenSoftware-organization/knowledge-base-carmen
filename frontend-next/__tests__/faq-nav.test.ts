import {
  faqSegmentLabel,
  faqPathTail,
  faqIndexTitlesByFolderKey,
  buildFaqNav,
  type FaqWikiItem,
} from "@/lib/faq-nav";

function item(path: string, slug: string, title = ""): FaqWikiItem {
  return { path, slug, title } as FaqWikiItem;
}

describe("faqSegmentLabel", () => {
  it("turns dashes and underscores into spaces", () => {
    expect(faqSegmentLabel("Procurement-Product")).toBe("Procurement Product");
    expect(faqSegmentLabel("a_b")).toBe("a b");
  });
});

describe("faqPathTail", () => {
  it("returns the segments under faq/", () => {
    expect(faqPathTail("faq/proc/x.md")).toEqual(["proc", "x.md"]);
  });

  it("returns null when the path is not under faq/", () => {
    expect(faqPathTail("other/x.md")).toBeNull();
  });

  it("normalizes backslashes", () => {
    expect(faqPathTail("faq\\proc\\x.md")).toEqual(["proc", "x.md"]);
  });
});

describe("faqIndexTitlesByFolderKey", () => {
  it("maps a folder key to the title from its index.md", () => {
    const map = faqIndexTitlesByFolderKey([
      item("faq/proc/index.md", "index", "Procurement"),
    ]);
    expect(map.get("proc")).toBe("Procurement");
  });
});

describe("buildFaqNav", () => {
  it("splits folders and articles at the prefix and uses index titles", () => {
    const items = [
      item("faq/proc/index.md", "index", "Procurement"),
      item("faq/proc/howto.md", "howto", "How To"),
      item("faq/intro.md", "intro", "Intro"),
    ];
    const nav = buildFaqNav([], items);

    expect(nav.folders.map((f) => f.slug)).toContain("proc");
    expect(nav.folders.find((f) => f.slug === "proc")?.title).toBe(
      "Procurement",
    );
    expect(nav.articles.map((a) => a.slug)).toContain("intro");
    expect(nav.articles.map((a) => a.slug)).not.toContain("howto");
  });
});
