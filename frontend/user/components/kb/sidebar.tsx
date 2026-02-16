"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getCategories, getCategory } from "@/lib/wiki-api";
import { articleDisplayMap, categoryDisplayMap, cleanTitle } from "@/configs/sidebar-map";

export function KBSidebar({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname();
  const [categories, setCategories] = useState<any[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    async function loadSidebar() {
      try {
        const res = await getCategories();
        const loaded = [];
        for (const cat of res.items) {
          const catRes = await getCategory(cat.slug);
          loaded.push({
            name: categoryDisplayMap[cat.slug] || cat.slug.toUpperCase(),
            slug: cat.slug,
            articles: catRes.items.map((item: any) => ({
              title: articleDisplayMap[item.slug] || cleanTitle(item.title),
              slug: item.slug,
            })),
          });
        }
        setCategories(loaded);
      } catch (err) { console.error(err); }
    }
    loadSidebar();
  }, []);

  useEffect(() => {
    const match = pathname.match(/\/categories\/([^/]+)/);
    if (match) {
      setExpandedCategories(prev => prev.includes(match[1]) ? prev : [...prev, match[1]]);
    }
  }, [pathname]);

  return (
    <aside className={cn(
      "shrink-0",
      isMobile ? "w-full" : "w-64 hidden lg:block sticky top-28 h-fit"
    )}>
      <nav className="space-y-1 pr-4 max-h-[calc(100vh-10rem)] overflow-y-auto scrollbar-hide">
        {categories.map((categoryItem) => {
          const isExpanded = expandedCategories.includes(categoryItem.slug);
          const isActiveCategory = pathname === `/categories/${categoryItem.slug}`;

          return (
            <div key={categoryItem.slug} className="mb-1">
              <button
                onClick={() => setExpandedCategories(prev =>
                  prev.includes(categoryItem.slug)
                    ? prev.filter(s => s !== categoryItem.slug)
                    : [...prev, categoryItem.slug]
                )}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all",
                  isActiveCategory ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
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
                    {categoryItem.articles.map((article: any) => {
                      const isIndex = article.slug === 'index';
                      const displayTitle = isIndex ? "Dashboard Overview" : article.title;

                      const articlePath = isIndex
                        ? `/categories/${categoryItem.slug}`
                        : `/categories/${categoryItem.slug}/${article.slug}`;

                      return (
                        <Link
                          key={article.slug}
                          href={articlePath}
                          className={cn(
                            "block px-3 py-1.5 text-[13px] rounded-md transition-all",
                            pathname === articlePath ? "text-primary font-bold bg-primary/5" : "text-muted-foreground hover:text-foreground"
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
        })}
      </nav>
    </aside>
  );
}