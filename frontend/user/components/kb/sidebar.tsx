"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";

import { cn } from "@/lib/utils";
import { getCategories, getCategory } from "@/lib/wiki-api";
import { articleDisplayMap, categoryDisplayMap, cleanTitle } from "@/configs/sidebar-map";

interface KBSidebarProps {
  isMobile?: boolean;
}

interface Article {
  title: string;
  slug: string;
}

interface Category {
  name: string;
  slug: string;
  articles: Article[];
}

const accordionVariants: Variants = {
  hidden: { height: 0, opacity: 0 },
  show: {
    height: "auto",
    opacity: 1,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { height: 0, opacity: 0, transition: { duration: 0.2 } },
};

export function KBSidebar({ isMobile = false }: KBSidebarProps) {
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    async function loadSidebar() {
      try {
        const res = await getCategories();
        const loaded: Category[] = [];

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
      } catch (err) {
        console.error("Sidebar error:", err);
      }
    }
    loadSidebar();
  }, []);

  useEffect(() => {
    const match = pathname.match(/\/categories\/([^/]+)/);
    if (match) {
      const activeSlug = match[1];
      setExpandedCategories((prev) => 
        prev.includes(activeSlug) ? prev : [activeSlug]
      );
    }
  }, [pathname]);

  const toggleCategory = (slug: string) => {
    setExpandedCategories((prev) => (prev.includes(slug) ? (prev.length > 1 ? prev.filter(s => s !== slug) : []) : [...prev, slug]));
  };

  return (
    <aside className={cn(
      "shrink-0 sticky top-28 h-fit hidden lg:block w-64",
      isMobile ? "w-full" : "w-64 hidden lg:block"
    )}>
      <nav className={cn(
        "space-y-1 pr-4 max-h-[calc(100vh-8rem)] overflow-y-auto",
        !isMobile && "sticky top-24"
      )}>
        {categories.map((category) => {
          const isExpanded = expandedCategories.includes(category.slug);
          const isActiveCategory = pathname.includes(`/categories/${category.slug}`);

          return (
            <div key={category.slug} className="mb-1">
              <button
                onClick={() => toggleCategory(category.slug)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all",
                  isActiveCategory ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
                )}
              >
                <span className="truncate">{category.name}</span>
                <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    variants={accordionVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className="ml-4 mt-1 space-y-0.5 border-l-2 border-primary/10 pl-2 overflow-hidden"
                  >
                    {category.articles.map((article) => {
                      if (article.slug === 'index') return null;

                      const articlePath = `/categories/${category.slug}/${article.slug}`;
                      const isArticleActive = pathname === articlePath;

                      return (
                        <Link
                          key={article.slug}
                          href={articlePath}
                          className={cn(
                            "block px-3 py-1.5 text-[13px] rounded-md transition-all duration-200",
                            isArticleActive
                              ? "text-primary font-bold bg-primary/5"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                          )}
                        >
                          {article.title}
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