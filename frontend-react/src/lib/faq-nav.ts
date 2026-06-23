import type { WikiListItem } from "@/lib/wiki-api";

export type FaqWikiItem = WikiListItem & { slug: string };

export type FaqFolder = { slug: string; title: string };

export type FaqNavResult = { folders: FaqFolder[]; articles: FaqWikiItem[] };

/** Label for one path segment (folder slug) in breadcrumbs and headings. */
export function faqSegmentLabel(seg: string): string {
  let s = seg;
  try {
    s = decodeURIComponent(seg);
  } catch {
    // keep seg
  }
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
  const indexTitles = faqIndexTitlesByFolderKey(items);

  const folderOrder: string[] = [];
  const folderTitles = new Map<string, string>();
  const articles: FaqWikiItem[] = [];

  for (const item of items) {
    if (item.slug === "index") continue;
    const rawTail = faqPathTail(item.path);
    if (!rawTail?.length) continue;
    const tail = rawTail;
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

  folders.sort((a, b) => {
    return a.slug.localeCompare(b.slug);
  });

  articles.sort((a, b) => a.path.localeCompare(b.path));

  return { folders, articles };
}
