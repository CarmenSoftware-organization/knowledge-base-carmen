import type { WikiListItem } from "@/lib/wiki-api";

export type FaqWikiItem = WikiListItem & { slug: string };

export type FaqFolder = { slug: string; title: string };

export type FaqNavResult = { folders: FaqFolder[]; articles: FaqWikiItem[] };

/** Synthetic groups for flat files faq/7_*.md, 8_*, 9_* (only when no real nested folders exist). */
const LEVEL_SLUG: Record<string, string> = {
  "7": "level-7",
  "8": "level-8",
  "9": "level-9",
};

const LEVEL_TITLE: Record<string, string> = {
  "level-7": "หมวด 7 — ปัญหาเบื้องต้น (Procurement, Material, Addin)",
  "level-8": "หมวด 8 — ปัญหาระดับกลาง (Period, SR, PO, Payment)",
  "level-9": "หมวด 9 — ปัญหาขั้นสูง (Cost, Inventory, Store)",
};

/** Label for one path segment (folder slug) in breadcrumbs and headings. */
export function faqSegmentLabel(seg: string): string {
  let s = seg;
  try {
    s = decodeURIComponent(seg);
  } catch {
    // keep seg
  }
  if (LEVEL_TITLE[s]) return LEVEL_TITLE[s];
  return s.replace(/-/g, " ").replace(/_/g, " ");
}

/**
 * Tail segments under `faq/`: each part is a path segment; file names keep `.md`.
 */
export function faqPathTail(path: string): string[] | null {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts[0] !== "faq") return null;
  return parts.slice(1);
}

/**
 * True when any FAQ entry lives under a real folder (e.g. faq/Category/article.md).
 * If true, numeric-prefix synthetic grouping (7_/8_/9_) is disabled.
 */
export function faqHasRealNestedFolders(items: FaqWikiItem[]): boolean {
  for (const item of items) {
    const raw = faqPathTail(item.path);
    if (!raw?.length) continue;
    if (raw.length === 1 && raw[0].toLowerCase() === "index.md") continue;
    if (raw.length === 1 && raw[0].endsWith(".md")) continue;
    if (raw.length >= 2 && !raw[0].endsWith(".md")) return true;
  }
  return false;
}

/**
 * Map folder path (segments under faq/ joined by "/") → title from that folder's index.md.
 * Example: "Procurement-Product" → title from faq/Procurement-Product/index.md
 */
export function faqIndexTitlesByFolderKey(items: FaqWikiItem[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) {
    const tail = faqPathTail(item.path);
    if (!tail?.length) continue;
    const last = tail[tail.length - 1];
    if (last.toLowerCase() !== "index.md") continue;
    if (tail.length < 2) continue;
    const key = tail.slice(0, -1).join("/");
    const t = item.title?.trim();
    if (t) map.set(key, t);
  }
  return map;
}

/**
 * Normalize so flat `faq/7_foo.md` becomes `level-7/7_foo.md` for navigation only.
 */
export function normalizeFaqTailFlatNumeric(tail: string[]): string[] {
  if (tail.length !== 1 || !tail[0].endsWith(".md")) return tail;
  const base = tail[0];
  if (base === "index.md") return tail;
  const m = base.match(/^([789])_/);
  if (!m) return tail;
  const slug = LEVEL_SLUG[m[1]];
  return slug ? [slug, base] : tail;
}

function prefixMatches(tail: string[], prefix: string[]): boolean {
  if (tail.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (tail[i] !== prefix[i]) return false;
  }
  return true;
}

function remainderTail(tail: string[], prefix: string[]): string[] {
  return tail.slice(prefix.length);
}

/**
 * Build folder list + articles at `prefix` (segments under faq/, e.g. [] or ["procurement"]).
 */
export function buildFaqNav(prefix: string[], items: FaqWikiItem[]): FaqNavResult {
  const useSyntheticFlatNumeric = !faqHasRealNestedFolders(items);
  const indexTitles = faqIndexTitlesByFolderKey(items);

  const folderOrder: string[] = [];
  const folderTitles = new Map<string, string>();
  const articles: FaqWikiItem[] = [];

  for (const item of items) {
    if (item.slug === "index") continue;
    const rawTail = faqPathTail(item.path);
    if (!rawTail?.length) continue;
    const tail = useSyntheticFlatNumeric
      ? normalizeFaqTailFlatNumeric(rawTail)
      : rawTail;
    if (!prefixMatches(tail, prefix)) continue;

    const rem = remainderTail(tail, prefix);
    if (rem.length === 0) continue;

    const head = rem[0];
    if (head.endsWith(".md")) {
      articles.push(item);
    } else {
      if (!folderTitles.has(head)) {
        folderOrder.push(head);
        const folderKey = [...prefix, head].join("/");
        const titleFromIndex = indexTitles.get(folderKey);
        folderTitles.set(head, titleFromIndex || faqSegmentLabel(head));
      }
    }
  }

  const folders: FaqFolder[] = folderOrder.map((slug) => ({
    slug,
    title: folderTitles.get(slug) ?? slug,
  }));

  const levelRank = (slug: string) => {
    const m = /^level-(\d+)$/.exec(slug);
    if (m) return parseInt(m[1], 10);
    return 1000;
  };
  folders.sort((a, b) => {
    const ra = levelRank(a.slug);
    const rb = levelRank(b.slug);
    if (ra !== rb) return ra - rb;
    return a.slug.localeCompare(b.slug);
  });

  articles.sort((a, b) => a.path.localeCompare(b.path));

  return { folders, articles };
}
