"use client";

import React, { useEffect, useState, memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getSidebarTree, getSelectedBUClient, type SidebarCategory } from "@/lib/wiki-api";
import { articleDisplayMap, categoryDisplayMap, cleanTitle } from "@/configs/sidebar-map";

type SidebarCategoryWithName = SidebarCategory & { name: string };

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SidebarSkeleton() {
  return (
    <div className="space-y-2 pr-4 animate-pulse" aria-hidden>
      {[90, 70, 85, 60, 75].map((w, i) => (
        <div key={i} className="space-y-1.5">
          <div
            className="h-8 rounded-lg bg-muted"
            style={{ width: `${w}%` }}
          />
          {i % 2 === 0 && (
            <div className="ml-4 space-y-1 border-l-2 border-primary/10 pl-2">
              {[65, 80, 55].map((aw, j) => (
                <div
                  key={j}
                  className="h-6 rounded-md bg-muted/70"
                  style={{ width: `${aw}%` }}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Category item (memoized) ────────────────────────────────────────────────

type CategoryItemProps = {
  categoryItem: SidebarCategoryWithName;
  isExpanded: boolean;
  onToggle: (slug: string) => void;
  pathname: string;
};

const CategoryItemRow = memo(function CategoryItemRow({
  categoryItem,
  isExpanded,
  onToggle,
  pathname,
}: CategoryItemProps) {
  const isActiveCategory = pathname === `/categories/${categoryItem.slug}`;

  return (
    <div className="mb-1">
      <button
        onClick={() => onToggle(categoryItem.slug)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all",
          isActiveCategory
            ? "bg-primary/10 text-primary"
            : "text-foreground hover:bg-secondary"
        )}
      >
        <span className="truncate">{categoryItem.name}</span>
        <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
          <ChevronRight className="h-4 w-4" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-4 mt-1 space-y-0.5 border-l-2 border-primary/10 pl-2 overflow-hidden"
          >
            {categoryItem.articles.map((article) => {
              const isIndex = article.slug === "index";
              const displayTitle = isIndex
                ? "Dashboard Overview"
                : article.title || articleDisplayMap[article.slug] || cleanTitle(article.slug);

              const articlePath = isIndex
                ? `/categories/${categoryItem.slug}`
                : `/categories/${categoryItem.slug}/${article.slug}`;

              return (
                <Link
                  key={article.slug}
                  href={articlePath}
                  className={cn(
                    "block px-3 py-1.5 text-[13px] rounded-md transition-all",
                    pathname === articlePath
                      ? "text-primary font-bold bg-primary/5"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {displayTitle}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─── Enrich categories with display names ────────────────────────────────────

function enrichCategories(raw: SidebarCategory[]): SidebarCategoryWithName[] {
  return raw
    .filter((cat) => cat.slug !== "faq")
    .map((cat) => ({
      ...cat,
      name: categoryDisplayMap[cat.slug] || cat.title || cat.slug.toUpperCase(),
    }));
}

// ─── Main component ──────────────────────────────────────────────────────────

export function KBSidebar({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname();
  const [categories, setCategories] = useState<SidebarCategoryWithName[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bu, setBu] = useState(getSelectedBUClient());

  useEffect(() => {
    const handleBUChange = () => setBu(getSelectedBUClient());
    window.addEventListener("bu-changed", handleBUChange);
    return () => window.removeEventListener("bu-changed", handleBUChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    getSidebarTree(bu)
      .then((data) => {
        if (!cancelled) {
          setCategories(enrichCategories(data));
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("[sidebar] failed to load sidebar tree:", err);
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [bu]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    const match = pathname.match(/\/categories\/([^/]+)/);
    if (match) {
      setExpandedCategories((prev) =>
        prev.includes(match[1]) ? prev : [...prev, match[1]]
      );
    }
  }, [pathname]);

  const handleToggle = (slug: string) => {
    setExpandedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  return (
    <aside
      className={cn(
        "shrink-0",
        isMobile ? "w-full" : "w-64 sticky top-28 h-fit hidden lg:block"
      )}
    >
      {isLoading ? (
        <SidebarSkeleton />
      ) : (
        <nav className="space-y-1 pr-4 max-h-[calc(100vh-10rem)] overflow-y-auto scrollbar-hide">
          {categories.map((categoryItem) => (
            <CategoryItemRow
              key={categoryItem.slug}
              categoryItem={categoryItem}
              isExpanded={expandedCategories.includes(categoryItem.slug)}
              onToggle={handleToggle}
              pathname={pathname}
            />
          ))}
        </nav>
      )}
    </aside>
  );
}
