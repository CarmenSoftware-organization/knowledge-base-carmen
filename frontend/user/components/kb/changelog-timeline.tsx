import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CHANGELOG_PAGE_SIZE,
  changelogItemTimestamp,
  type ChangelogListEntry,
} from "@/lib/changelog-utils";

type Props = {
  category: string;
  items: ChangelogListEntry[];
  page: number;
};

function yearSortKey(yearLabel: string): number {
  const n = parseInt(yearLabel, 10);
  return Number.isFinite(n) ? n : -1;
}

function groupPageItemsByYear(entries: ChangelogListEntry[]) {
  const groups: { year: string; items: ChangelogListEntry[] }[] = [];
  for (const item of entries) {
    const ts = changelogItemTimestamp(item);
    const year = ts > 0 ? new Date(ts).getUTCFullYear().toString() : "—";
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.items.push(item);
    else groups.push({ year, items: [item] });
  }
  groups.sort((a, b) => yearSortKey(b.year) - yearSortKey(a.year));
  return groups;
}

export function ChangelogTimeline({ category, items, page }: Props) {
  const totalPages = Math.max(1, Math.ceil(items.length / CHANGELOG_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * CHANGELOG_PAGE_SIZE;
  const pageItems = items.slice(start, start + CHANGELOG_PAGE_SIZE);
  const groups = groupPageItemsByYear(pageItems);
  const newestSlug = items[0]?.slug;
  const encCat = encodeURIComponent(category);
  const basePath = `/categories/${encCat}`;
  const pageHref = (p: number) => (p <= 1 ? basePath : `${basePath}?page=${p}`);

  const dateLabel = (item: ChangelogListEntry) => {
    const ts = changelogItemTimestamp(item);
    if (ts <= 0) return null;
    return new Date(ts).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (items.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        No release notes yet. New entries appear here when added in the wiki.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-10">
      {groups.map(({ year, items: yearItems }) => (
        <section key={`${safePage}-${year}`} className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground border-b border-border pb-2">
            {year}
          </h2>
          <ul className="space-y-3">
            {yearItems.map((item) => {
              const href = `${basePath}/${encodeURIComponent(item.slug)}`;
              const formatted = dateLabel(item);
              const isNewest = item.slug === newestSlug;
              return (
                <li key={item.slug}>
                  <Link
                    href={href}
                    className={cn(
                      "block rounded-xl border border-border/80 bg-card/50 px-4 py-3.5 transition-colors",
                      "hover:border-primary/40 hover:bg-accent/30 dark:hover:bg-accent/20",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                      <span className="font-medium text-foreground leading-snug">
                        {item.title || item.slug}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {isNewest && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500">
                            New
                          </span>
                        )}
                        {formatted && (
                          <time
                            dateTime={item.date || item.publishedAt || item.dateCreated}
                            className="text-xs text-muted-foreground tabular-nums"
                          >
                            {formatted}
                          </time>
                        )}
                      </div>
                    </div>
                    {item.description ? (
                      <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {totalPages > 1 && (
        <nav
          className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border"
          aria-label="Changelog pagination"
        >
          {safePage <= 1 ? (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="size-4" />
              Previous
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href={pageHref(safePage - 1)} prefetch={false}>
                <ChevronLeft className="size-4" />
                Previous
              </Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground tabular-nums">
            Page {safePage} of {totalPages}
          </span>
          {safePage >= totalPages ? (
            <Button variant="outline" size="sm" disabled>
              Next
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href={pageHref(safePage + 1)} prefetch={false}>
                Next
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}
