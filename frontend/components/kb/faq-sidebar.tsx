"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, memo } from "react";
import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  buildFaqNav,
  faqPathTail,
  type FaqWikiItem,
} from "@/lib/faq-nav";
import { wikiPathToRoute } from "@/lib/wiki-api";

function safeDecode(seg: string): string {
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

/** Active folder/article from current URL */
export function parseFaqSidebarContext(pathname: string): {
  folderPrefix: string[];
  inArticle: boolean;
} {
  const p = (pathname.split("?")[0] || "").replace(/\/$/, "") || "/";
  if (p === "/faq") return { folderPrefix: [], inArticle: false };
  if (p.startsWith("/faq/")) {
    const segs = p
      .slice("/faq/".length)
      .split("/")
      .filter(Boolean)
      .map(safeDecode);
    return { folderPrefix: segs, inArticle: false };
  }
  if (p.startsWith("/categories/faq")) {
    const rest = p
      .replace(/^\/categories\/faq\/?/, "")
      .split("/")
      .filter(Boolean)
      .map(safeDecode);
    if (rest.length === 0) return { folderPrefix: [], inArticle: false };
    return {
      folderPrefix: rest.slice(0, -1),
      inArticle: true,
    };
  }
  return { folderPrefix: [], inArticle: false };
}

function faqFolderHref(prefix: string[]) {
  if (prefix.length === 0) return "/faq";
  return `/faq/${prefix.map((s) => encodeURIComponent(s)).join("/")}`;
}

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

/** Folder keys to expand for URL (incl. synthetic FAQ levels) */
function faqExpandedFolderKeys(pathname: string, items: FaqWikiItem[]): string[] {
  const p = (pathname.split("?")[0] || "").replace(/\/$/, "") || "/";

  if (p === "/faq" || p === "/categories/faq") {
    return [];
  }

  if (p.startsWith("/faq/")) {
    const segs = p
      .slice("/faq/".length)
      .split("/")
      .filter(Boolean)
      .map(safeDecode);
    const keys: string[] = [];
    for (let i = 0; i < segs.length; i++) {
      keys.push(segs.slice(0, i + 1).join("/"));
    }
    return keys;
  }

  if (p.startsWith("/categories/faq")) {
    for (const item of items) {
      const route = wikiPathToRoute(item.path);
      if (!pathsMatch(route, pathname)) continue;
      const rawTail = faqPathTail(item.path);
      if (!rawTail?.length) continue;
      const tail = rawTail;
      const last = tail[tail.length - 1];
      if (!last?.endsWith(".md")) continue;
      const folderParts = tail.slice(0, -1);
      const keys: string[] = [];
      for (let i = 0; i < folderParts.length; i++) {
        keys.push(folderParts.slice(0, i + 1).join("/"));
      }
      return keys;
    }
  }

  return [];
}

const sidebarAsideVariants = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const faqExpandTransition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
};

type FaqLevelProps = {
  items: FaqWikiItem[];
  prefix: string[];
  expanded: string[];
  onToggle: (key: string) => void;
  pathname: string;
};

/** One FAQ tree level (KBSidebar-style) */
const FaqLevel = memo(function FaqLevel({
  items,
  prefix,
  expanded,
  onToggle,
  pathname,
}: FaqLevelProps) {
  const { folders, articles } = buildFaqNav(prefix, items);
  const ctx = parseFaqSidebarContext(pathname);

  return (
    <>
      {folders.map((folder) => {
        const subPrefix = [...prefix, folder.slug];
        const key = subPrefix.join("/");
        const href = faqFolderHref(subPrefix);
        const isExpanded = expanded.includes(key);
        const folderActive = pathsMatch(pathname, href);
        const articleInBranch =
          ctx.inArticle &&
          ctx.folderPrefix.length >= subPrefix.length &&
          subPrefix.every((s, i) => s === ctx.folderPrefix[i]);
        const branchOpen =
          !ctx.inArticle &&
          ctx.folderPrefix.length >= subPrefix.length &&
          subPrefix.every((s, i) => s === ctx.folderPrefix[i]);
        const highlight = folderActive || articleInBranch || branchOpen;

        return (
          <div key={key} className="mb-1">
            <button
              type="button"
              onClick={() => onToggle(key)}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all",
                highlight
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              <span className="truncate text-left">{folder.title}</span>
              <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                    transition: { ...faqExpandTransition, opacity: { duration: 0.2 } },
                  }}
                  exit={{
                    height: 0,
                    opacity: 0,
                    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
                  }}
                  className="ml-4 mt-1 space-y-0.5 border-l-2 border-primary/10 pl-2 overflow-hidden"
                >
                  <Link
                    href={href}
                    className={cn(
                      "block px-3 py-1.5 text-[13px] rounded-md transition-all",
                      folderActive
                        ? "text-primary font-semibold bg-primary/5"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    ภาพรวมหมวดนี้
                  </Link>
                  <FaqLevel
                    items={items}
                    prefix={subPrefix}
                    expanded={expanded}
                    onToggle={onToggle}
                    pathname={pathname}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {articles.map((article) => {
        const href = wikiPathToRoute(article.path);
        const label = article.title?.trim() || article.slug;
        const active = pathsMatch(pathname, href);

        return (
          <Link
            key={article.path}
            href={href}
            className={cn(
              "block px-3 py-1.5 text-[13px] rounded-md transition-all",
              active
                ? "text-primary font-bold bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="line-clamp-3">{label}</span>
          </Link>
        );
      })}
    </>
  );
});

/** FAQ link list (desktop + mobile drawer) */
export function FaqSidebarNav({
  items,
  className,
  showHomeLink = true,
}: {
  items: FaqWikiItem[];
  className?: string;
  showHomeLink?: boolean;
}) {
  const pathname = usePathname();
  const homeActive = pathname === "/faq" || pathname === "/faq/";
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    const auto = faqExpandedFolderKeys(pathname, items);
    setExpanded((prev) => [...new Set([...auto, ...prev])]);
  }, [pathname, items]);

  const handleToggle = (key: string) => {
    setExpanded((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  if (!items?.length) return null;

  return (
    <motion.nav
      className={cn(
        "space-y-1 pr-4 max-h-[calc(100vh-10rem)] overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] scrollbar-hide",
        className
      )}
      aria-label="FAQ navigation"
      initial={{ opacity: 0.85 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {showHomeLink && (
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            href="/faq"
            className={cn(
              "block mb-1 px-3 py-2 text-sm font-semibold rounded-lg transition-all",
              homeActive
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-secondary"
            )}
          >
            หน้าแรก FAQ
          </Link>
        </motion.div>
      )}
      <FaqLevel
        items={items}
        prefix={[]}
        expanded={expanded}
        onToggle={handleToggle}
        pathname={pathname}
      />
    </motion.nav>
  );
}

/** Desktop left aside (KBSidebar layout) */
export function FaqSidebar({ items }: { items: FaqWikiItem[] }) {
  if (!items?.length) return null;

  return (
    <motion.aside
      variants={sidebarAsideVariants}
      initial="hidden"
      animate="show"
      className={cn(
        "shrink-0 hidden lg:block w-64 h-fit self-start"
      )}
    >
      <motion.p
        className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2 px-1"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      >
        FAQ
      </motion.p>
      <FaqSidebarNav items={items} showHomeLink />
    </motion.aside>
  );
}
