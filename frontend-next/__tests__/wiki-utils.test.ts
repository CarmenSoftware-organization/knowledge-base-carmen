import {
  formatCategoryName,
  humanizeWikiStem,
  displayWikiArticleTitle,
} from "@/lib/wiki-utils";

describe("formatCategoryName", () => {
  it("returns the mapped display name for a known slug", () => {
    expect(formatCategoryName("gl")).toBe("General Ledger");
  });

  it("uppercases an unknown slug", () => {
    expect(formatCategoryName("zzz")).toBe("ZZZ");
  });

  it("returns empty string for empty input", () => {
    expect(formatCategoryName("")).toBe("");
  });
});

describe("humanizeWikiStem", () => {
  it("strips .md and turns separators into spaces", () => {
    expect(humanizeWikiStem("getting-started.md")).toBe("getting started");
  });

  it("preserves original casing (no title-casing)", () => {
    expect(humanizeWikiStem("AP_invoice")).toBe("AP invoice");
  });
});

describe("displayWikiArticleTitle", () => {
  it("uses the humanized stem when the title equals the stem", () => {
    expect(displayWikiArticleTitle("invoice", "invoice", "ap/invoice.md")).toBe(
      "invoice",
    );
  });

  it("returns a meaningful title unchanged", () => {
    expect(
      displayWikiArticleTitle("Invoice Guide", "invoice", "ap/invoice.md"),
    ).toBe("Invoice Guide");
  });

  it("drops a long error-looking title in favor of the humanized stem", () => {
    const longError =
      "Error: failed to load the requested document file and parse it";
    expect(
      displayWikiArticleTitle(longError, "invoice", "ap/invoice.md"),
    ).toBe("invoice");
  });
});
