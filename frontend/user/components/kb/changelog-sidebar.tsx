"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { wikiPathToRoute } from "@/lib/wiki-api";
import {
  changelogItemTimestamp,
  type ChangelogListEntry,
} from "@/lib/changelog-utils";

function pathsMatch(a: string, b: string) {
  const x = (a.split("?")[0] || "").replace(/\/$/, "") || "/";
  const y = (b.split("?")[0] || "").replace(/\/$/, "") || "/";
  if (x === y) return true;
  try {
    return decodeURIComponent(x) === decodeURIComponent(y);
  } catch {
    return false;
  }
}

function yearLabel(ts: number): string {
  if (ts <= 0) return "—";
  return new Date(ts).getUTCFullYear().toString();
}

const sidebarAsideVariants = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function ChangelogSidebarNav({
  items,
  className,
  showOverviewLink = true,
}: {
  items: ChangelogListEntry[];
  className?: string;
  showOverviewLink?: boolean;
}) {
  const pathname = usePathname();
  const overviewHref = "/categories/changelog";
  const overviewActive = pathsMatch(pathname, overviewHref);

  if (!items?.length) return null;

  let lastYear = "";

  return (
    <motion.nav
      className={cn(
        "space-y-1 pr-4 max-h-[calc(100vh-10rem)] overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] scrollbar-hide",
        className,
      )}
      aria-label="Changelog navigation"
      initial={{ opacity: 0.85 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {showOverviewLink && (
        <Link
          href={overviewHref}
          className={cn(
            "block mb-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all",
            overviewActive
              ? "bg-primary/10 text-primary"
              : "text-foreground hover:bg-secondary",
          )}
        >
          All releases
        </Link>
      )}

      {items.map((item) => {
        const href = wikiPathToRoute(item.path);
        const active = pathsMatch(pathname, href);
        const ts = changelogItemTimestamp(item);
        const y = yearLabel(ts);
        const showYearHeader = y !== lastYear;
        if (showYearHeader) lastYear = y;

        return (
          <div key={item.path}>
            {showYearHeader && (
              <p className="px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                {y}
              </p>
            )}
            <Link
              href={href}
              className={cn(
                "block px-3 py-1.5 text-[13px] rounded-md transition-all",
                active
                  ? "text-primary font-bold bg-primary/5"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="line-clamp-3">
                {item.title?.trim() || item.slug}
              </span>
            </Link>
          </div>
        );
      })}
    </motion.nav>
  );
}

export function ChangelogSidebar({ items }: { items: ChangelogListEntry[] }) {
  if (!items?.length) return null;

  return (
    <motion.aside
      variants={sidebarAsideVariants}
      initial="hidden"
      animate="show"
      className="shrink-0 w-64 h-fit self-start"
    >
      <motion.p
        className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2 px-1"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      >
        Changelog
      </motion.p>
      <ChangelogSidebarNav items={items} showOverviewLink />
    </motion.aside>
  );
}
