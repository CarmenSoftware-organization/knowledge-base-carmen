"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";

import { cn } from "@/lib/utils";
import { getCategories, getCategory } from "@/lib/wiki-api";

interface Article {
  title: string;
  slug: string;
}

interface Category {
  name: string;
  slug: string;
  articles: Article[];
}

/* =============================
   Accordion Animation
============================= */

const accordionVariants: Variants = {
  hidden: {
    height: 0,
    opacity: 0,
  },
  show: {
    height: "auto",
    opacity: 1,
    transition: {
      duration: 0.25,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

export function KBSidebar() {
  const pathname = usePathname();

  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  /* =============================
     Load Categories
  ============================== */
  useEffect(() => {
    async function loadSidebar() {
      try {
        const res = await getCategories();

        const loaded: Category[] = [];

        for (const cat of res.items) {
          const catRes = await getCategory(cat.slug);

          loaded.push({
            name: cat.slug.toUpperCase(),
            slug: cat.slug,
            articles: catRes.items.map((item: any) => ({
              title: item.title,
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

  /* =============================
     Auto Expand Based on Route
  ============================== */
  useEffect(() => {
    const match = pathname.match(/\/categories\/([^/]+)/);
    if (match) {
      const activeSlug = match[1];
      setExpandedCategories([activeSlug]);
    }
  }, [pathname]);

  /* =============================
     Toggle (Single Expand Mode)
  ============================== */
  const toggleCategory = (slug: string) => {
    setExpandedCategories((prev) =>
      prev.includes(slug) ? [] : [slug]
    );
  };

  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <nav className="sticky top-20 space-y-1 pr-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
        {categories.map((category) => {
          const isExpanded = expandedCategories.includes(category.slug);
          const isActiveCategory =
            pathname.includes(`/categories/${category.slug}`);

          return (
            <div key={category.slug}>
              {/* Category Button */}
              <button
                onClick={() => toggleCategory(category.slug)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActiveCategory
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary"
                )}
              >
                <span>{category.name}</span>

                {/* Smooth Rotate Chevron */}
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </button>

              {/* Articles Accordion */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    variants={accordionVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className="ml-4 mt-1 space-y-1 border-l border-border pl-4 overflow-hidden"
                  >
                    {category.articles.map((article) => {
                      const articlePath = `/categories/${category.slug}/${article.slug}`;
                      const isArticleActive = pathname === articlePath;

                      return (
                        <Link
                          key={article.slug}
                          href={articlePath}
                          className={cn(
                            "block px-3 py-1.5 text-sm rounded-md transition-colors",
                            isArticleActive
                              ? "bg-primary/10 text-primary font-medium"
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
