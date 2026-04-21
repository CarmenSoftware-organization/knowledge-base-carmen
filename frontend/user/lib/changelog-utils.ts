import type { WikiListItem } from "./wiki-api";

export const CHANGELOG_PAGE_SIZE = 5;

export type ChangelogListEntry = WikiListItem & { slug: string };

const SLUG_MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

export function inferReleaseUtcFromSlug(slug: string): number | null {
  const normalized = slug.trim().toLowerCase().replace(/_/g, "");
  const match = normalized.match(/^([a-z]+)(\d{4})$/);
  if (!match) return null;
  const monthIdx = SLUG_MONTH_INDEX[match[1]];
  const year = parseInt(match[2], 10);
  if (monthIdx === undefined || !Number.isFinite(year)) return null;
  return Date.UTC(year, monthIdx, 15);
}

export function changelogItemTimestamp(item: ChangelogListEntry): number {
  const fromSlug = inferReleaseUtcFromSlug(item.slug);
  if (fromSlug !== null) return fromSlug;
  const raw = item.date || item.publishedAt || item.dateCreated || "";
  const t = raw ? Date.parse(raw) : NaN;
  if (!Number.isNaN(t)) return t;
  return 0;
}

export function sortChangelogItems(items: ChangelogListEntry[]): ChangelogListEntry[] {
  return [...items].sort((a, b) => {
    const tb = changelogItemTimestamp(b);
    const ta = changelogItemTimestamp(a);
    if (tb !== ta) return tb - ta;
    return b.slug.localeCompare(a.slug);
  });
}
