"use client";

import React, { useEffect, useState, memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  getSidebarTree,
  getSelectedBUClient,
  wikiPathToRoute,
  type SidebarCategory,
  type SidebarArticle,
} from "@/lib/wiki-api";
import { articleDisplayMap, categoryDisplayMap, cleanTitle } from "@/configs/sidebar-map";
import { displayWikiArticleTitle } from "@/lib/wiki-utils";

type SidebarCategoryWithName = SidebarCategory & { name: string };
type SidebarFolderNode = {
  key: string;
  label: string;
  folders: SidebarFolderNode[];
  articles: SidebarArticle[];
  weight: number;
};

function capitalizeFirst(value: string): string {
  const text = (value || "").trim();
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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

function pathsMatchSidebar(a: string, b: string) {
  const x = (a.split("?")[0] || "").replace(/\/$/, "") || "/";
  const y = (b.split("?")[0] || "").replace(/\/$/, "") || "/";
  if (x === y) return true;
  try {
    return decodeURIComponent(x) === decodeURIComponent(y);
  } catch {
    return false;
  }
}

const CategoryItemRow = memo(function CategoryItemRow({
  categoryItem,
  isExpanded,
  onToggle,
  pathname,
}: CategoryItemProps) {
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const catPrefix = `/categories/${categoryItem.slug}`;
  const isActiveCategory =
    pathsMatchSidebar(pathname, catPrefix) ||
    pathname.startsWith(`${catPrefix}/`);

  const folderLabel = (root: string, key: string) => {
    const normalized = key.trim();
    const maps: Record<string, Record<string, string>> = {
      carmen_cloud: {
        AP: "Account Payable",
        AR: "Account Receivable",
        "Fixed Asset": "Fixed Asset",
        "Asset Checker": "Asset Checker",
        General_Ledger: "General Ledger",
        Work_Book: "Work Book",
      },
      carmen_onpermise: {
        INVENTORY: "Inventory",
        RECIPE: "Recipe",
        ASSET: "Asset Management",
        GlONPERMISE: "General Ledger",
        Addin: "Add In",
        ApONPERMISE: "Account Payable",
        ArONPERMISE: "Account Receivable",
      },
      cadena: {
        "Time Attendance": "Time Attendance",
        Staffing: "Staffing",
        "System Setting": "System Setting",
        "Leave Management": "Leave Management",
      },
    };
    const raw = maps[root]?.[normalized] || normalized.replace(/[_-]+/g, " ").trim();
    return capitalizeFirst(raw);
  };

  const buildFolderTree = (articles: SidebarArticle[]): SidebarFolderNode[] => {
    const roots: Record<string, SidebarFolderNode> = {};
    const ensureNode = (
      container: Record<string, SidebarFolderNode>,
      key: string,
      label: string,
      weight: number,
    ) => {
      if (!container[key]) {
        container[key] = { key, label, folders: [], articles: [], weight };
      }
      container[key].weight = Math.min(container[key].weight, weight);
      return container[key];
    };

    const childMap = new Map<string, Record<string, SidebarFolderNode>>();

    for (const article of articles) {
      const parts = article.path.replace(/\\/g, "/").split("/").filter(Boolean); // [category, ..., file]
      const rel = parts.slice(1);
      if (article.slug === "index") continue;
      if (rel.length === 0) continue;

      const weight = article.weight ?? 9999;
      const folderParts = rel.slice(0, -1);
      if (folderParts.length === 0) {
        const key = "__root__";
        const node = ensureNode(roots, key, "", weight);
        node.articles.push(article);
        continue;
      }

      let parentKey = "";
      let siblings = roots;
      for (const fp of folderParts) {
        const nextKey = parentKey ? `${parentKey}/${fp}` : fp;
        const node = ensureNode(siblings, nextKey, folderLabel(categoryItem.slug, fp), weight);
        if (!childMap.has(nextKey)) childMap.set(nextKey, {});
        siblings = childMap.get(nextKey)!;
        parentKey = nextKey;
      }

      const leafNode = roots[folderParts[0]];
      if (folderParts.length === 1) {
        leafNode.articles.push(article);
      } else {
        const lastKey = folderParts.join("/");
        const lastNode = (() => {
          let cur = roots[folderParts[0]];
          for (let i = 1; i < folderParts.length; i++) {
            const key = folderParts.slice(0, i + 1).join("/");
            const pool = childMap.get(folderParts.slice(0, i).join("/")) || {};
            cur = pool[key];
          }
          return cur;
        })();
        lastNode.articles.push(article);
      }
    }

    const materialize = (nodes: Record<string, SidebarFolderNode>): SidebarFolderNode[] =>
      Object.values(nodes)
        .map((node) => {
          const children = childMap.get(node.key) || {};
          const articlesSorted = [...node.articles].sort((a, b) => {
            if ((a.weight ?? 9999) !== (b.weight ?? 9999)) {
              return (a.weight ?? 9999) - (b.weight ?? 9999);
            }
            return a.path.localeCompare(b.path);
          });
          return {
            ...node,
            folders: materialize(children),
            articles: articlesSorted,
          };
        })
        .sort((a, b) => {
          if (a.key === "__root__") return -1;
          if (b.key === "__root__") return 1;
          if (a.weight !== b.weight) return a.weight - b.weight;
          return a.label.localeCompare(b.label);
        });

    return materialize(roots);
  };

  useEffect(() => {
    const folderChain: string[] = [];
    for (const article of categoryItem.articles) {
      const articlePath = wikiPathToRoute(article.path);
      if (!pathsMatchSidebar(pathname, articlePath)) continue;
      const parts = article.path.replace(/\\/g, "/").split("/").filter(Boolean).slice(1, -1);
      let key = "";
      for (const p of parts) {
        key = key ? `${key}/${p}` : p;
        folderChain.push(key);
      }
      break;
    }
    const autoExpanded = [...new Set(folderChain)];
    if (autoExpanded.length) {
      setExpandedFolders((prev) => Array.from(new Set([...prev, ...autoExpanded])));
    }
  }, [categoryItem.articles, pathname]);

  const renderArticleLink = (article: SidebarArticle) => {
    if (article.slug === "index") return null;

    const displayTitle = articleDisplayMap[article.slug] ||
      displayWikiArticleTitle(
        article.title,
        article.slug,
        article.path,
      ) ||
      cleanTitle(article.slug);

    const articlePath = wikiPathToRoute(article.path);

    return (
      <Link
        key={article.path}
        href={articlePath}
        className={cn(
          "block px-3 py-1.5 text-[13px] rounded-md transition-all",
          pathsMatchSidebar(pathname, articlePath)
            ? "text-primary font-bold bg-primary/5"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {capitalizeFirst(displayTitle)}
      </Link>
    );
  };

  const renderFolderNode = (node: SidebarFolderNode) => {
    if (node.key === "__root__") {
      return node.articles.map((article) => renderArticleLink(article));
    }
    const opened = expandedFolders.includes(node.key);
    return (
      <div key={`${categoryItem.slug}:${node.key}`} className="mb-1">
        <button
          onClick={() =>
            setExpandedFolders((prev) =>
              prev.includes(node.key)
                ? prev.filter((s) => s !== node.key)
                : [...prev, node.key],
            )
          }
          className={cn(
            "w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[13px] rounded-md transition-all font-medium",
            opened
              ? "text-foreground bg-secondary/60"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40",
          )}
        >
          <span className="truncate">{node.label}</span>
          <motion.div animate={{ rotate: opened ? 90 : 0 }}>
            <ChevronRight className="h-3.5 w-3.5" />
          </motion.div>
        </button>
        <AnimatePresence>
          {opened && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="ml-4 mt-1 space-y-0.5 border-l border-primary/10 pl-2 overflow-hidden"
            >
              {node.articles.map((article) => renderArticleLink(article))}
              {node.folders.map((child) => renderFolderNode(child))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

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
            {buildFolderTree(
              categoryItem.articles.filter(
                (a) => !a.path.replace(/\\/g, "/").includes("/_images/"),
              ),
            ).map((node) => renderFolderNode(node))}
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
      name: capitalizeFirst(
        categoryDisplayMap[cat.slug] || cat.title || cat.slug.toUpperCase(),
      ),
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
        isMobile ? "w-full" : "w-64 h-fit hidden lg:block"
      )}
    >
      {isLoading ? (
        <SidebarSkeleton />
      ) : (
        <nav className="space-y-1 pr-4 max-h-[calc(100vh-10rem)] overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] scrollbar-hide">
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
