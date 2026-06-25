import {
  inferReleaseUtcFromSlug,
  changelogItemTimestamp,
  sortChangelogItems,
  buildChangelogNavList,
  type ChangelogListEntry,
} from "@/lib/changelog-utils";

function entry(
  slug: string,
  path: string,
  extra: Partial<ChangelogListEntry> = {},
): ChangelogListEntry {
  return { slug, path, title: slug, ...extra } as ChangelogListEntry;
}

describe("inferReleaseUtcFromSlug", () => {
  it("parses a 3-letter month + year to UTC day 15", () => {
    expect(inferReleaseUtcFromSlug("jun2026")).toBe(Date.UTC(2026, 5, 15));
  });

  it("parses a full month name", () => {
    expect(inferReleaseUtcFromSlug("june2026")).toBe(Date.UTC(2026, 5, 15));
  });

  it("ignores underscores", () => {
    expect(inferReleaseUtcFromSlug("jan_2026")).toBe(Date.UTC(2026, 0, 15));
  });

  it("returns null for an unrecognized slug", () => {
    expect(inferReleaseUtcFromSlug("notamonth2026")).toBeNull();
    expect(inferReleaseUtcFromSlug("2026")).toBeNull();
  });
});

describe("changelogItemTimestamp", () => {
  it("prefers the slug-derived date", () => {
    expect(changelogItemTimestamp(entry("jun2026", "changelog/jun2026.md"))).toBe(
      Date.UTC(2026, 5, 15),
    );
  });

  it("falls back to the date field when the slug has no month", () => {
    const t = changelogItemTimestamp(
      entry("release", "changelog/release.md", { date: "2026-03-01" }),
    );
    expect(t).toBe(Date.parse("2026-03-01"));
  });

  it("returns 0 when there is no slug date and no date fields", () => {
    expect(
      changelogItemTimestamp(entry("release", "changelog/release.md")),
    ).toBe(0);
  });
});

describe("sortChangelogItems", () => {
  it("sorts newest first", () => {
    const sorted = sortChangelogItems([
      entry("jan2026", "changelog/jan2026.md"),
      entry("jun2026", "changelog/jun2026.md"),
    ]);
    expect(sorted.map((e) => e.slug)).toEqual(["jun2026", "jan2026"]);
  });
});

describe("buildChangelogNavList", () => {
  it("drops index and _images entries and sorts newest first", () => {
    const list = buildChangelogNavList([
      entry("index", "changelog/index.md"),
      entry("img", "changelog/_images/pic.md"),
      entry("jan2026", "changelog/jan2026.md"),
      entry("jun2026", "changelog/jun2026.md"),
    ]);
    expect(list.map((e) => e.slug)).toEqual(["jun2026", "jan2026"]);
  });

  it("tolerates null/undefined input", () => {
    expect(buildChangelogNavList(null)).toEqual([]);
    expect(buildChangelogNavList(undefined)).toEqual([]);
  });
});
